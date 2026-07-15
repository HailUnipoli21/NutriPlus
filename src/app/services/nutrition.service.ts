import axios from 'axios';
import { Injectable } from '@angular/core';

export type MealType = 'desayuno' | 'comida' | 'cena' | 'snacks';

export interface DailyNutritionTarget {
  user_id?: number;
  target_date?: string;
  bmr_kcal?: number;
  tdee_kcal?: number;
  target_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  activity_level?: string;
  goal?: string;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface FoodLogItem extends MacroTotals {
  id: number;
  user_id?: number;
  log_date: string;
  meal_type: MealType;
  food_name: string;
  source: 'scanner' | 'manual';
  ai_recommendation?: string | null;
  created_at?: string;
}

export interface MealSummary {
  meal_type: MealType;
  key: MealType;
  label: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  items_count: number;
  totals: MacroTotals;
  items: FoodLogItem[];
}

export interface DailySummary {
  ok: boolean;
  date: string;
  target_date: string;
  target: DailyNutritionTarget;
  consumed: MacroTotals;
  remaining: MacroTotals;
  meals: MealSummary[];
}

export interface FoodEstimate extends MacroTotals {
  food_name: string;
  ai_recommendation?: string | null;
}

export interface SaveFoodLogPayload extends MacroTotals {
  log_date: string;
  meal_type: MealType;
  food_name: string;
  source: 'scanner' | 'manual';
  ai_recommendation?: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  message?: string;
  error?: string;
  target?: DailyNutritionTarget;
  estimate?: FoodEstimate;
  food_log?: FoodLogItem;
  summary?: BackendDailySummary;
  data?: T;
}

interface BackendMealSummary {
  meal_type: MealType;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  items_count: number;
  items?: FoodLogItem[];
}

interface BackendDailySummary {
  target_date: string;
  target: DailyNutritionTarget;
  consumed: MacroTotals;
  remaining: MacroTotals;
  meals: BackendMealSummary[];
}

@Injectable({
  providedIn: 'root'
})
export class NutritionService {
  private readonly apiIpStorageKey = '9amm_api_ip';

  /*
    URL fija para producción / Android.
    En Android el localStorage del navegador no existe,
    por eso necesitamos una URL por defecto.
  */
  private readonly defaultApiBaseUrl = 'https://nutriplusjp.alwaysdata.net/nutriplus_api';

  private readonly tokenStorageKeys = [
    'nutriplus_token',
    'auth_token',
    'token'
  ];

  private getApiBaseUrl(): string {
    const storedValue = localStorage.getItem(this.apiIpStorageKey);

    /*
      Si existe una URL guardada en navegador, se usa.
      Si no existe, se usa la URL fija para Android.
    */
    const rawValue = storedValue && storedValue.trim() !== ''
      ? storedValue
      : this.defaultApiBaseUrl;

    /*
      Corrección preventiva por si quedó guardado el typo:
      nutiplus_api → nutriplus_api
    */
    const correctedValue = rawValue
      .trim()
      .replace('nutiplus_api', 'nutriplus_api')
      .replace(/\/+$/, '');

    const valueWithProtocol = /^https?:\/\//i.test(correctedValue)
      ? correctedValue
      : `https://${correctedValue}`;

    try {
      const finalUrl = new URL(valueWithProtocol).toString().replace(/\/+$/, '');

      /*
        Guarda la URL corregida para futuras llamadas.
        Esto ayuda si antes estaba guardada mal en localStorage.
      */
      localStorage.setItem(this.apiIpStorageKey, finalUrl);

      return finalUrl;
    } catch {
      throw new Error('La URL/IP de API no es válida.');
    }
  }

  private getToken(): string {
    for (const key of this.tokenStorageKeys) {
      const token = localStorage.getItem(key);

      if (token && token.trim() !== '') {
        return token.trim();
      }
    }

    throw new Error('No hay token de sesión. Inicia sesión nuevamente.');
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getToken()}`
    };
  }

  private getMealLabel(mealType: MealType): string {
    const labels: Record<MealType, string> = {
      desayuno: 'Desayuno',
      comida: 'Comida',
      cena: 'Cena',
      snacks: 'Snacks'
    };

    return labels[mealType];
  }

  private normalizeMeal(meal: BackendMealSummary): MealSummary {
    const mealType = meal.meal_type;

    return {
      meal_type: mealType,
      key: mealType,
      label: this.getMealLabel(mealType),
      kcal: Number(meal.kcal || 0),
      protein_g: Number(meal.protein_g || 0),
      fat_g: Number(meal.fat_g || 0),
      carbs_g: Number(meal.carbs_g || 0),
      items_count: Number(meal.items_count || 0),
      totals: {
        kcal: Number(meal.kcal || 0),
        protein_g: Number(meal.protein_g || 0),
        fat_g: Number(meal.fat_g || 0),
        carbs_g: Number(meal.carbs_g || 0)
      },
      items: meal.items || []
    };
  }

  async calculateDailyTarget(targetDate?: string): Promise<DailyNutritionTarget> {
    const apiBaseUrl = this.getApiBaseUrl();

    const response = await axios.post<ApiResponse<DailyNutritionTarget>>(
      `${apiBaseUrl}/calculate_daily_targets.php`,
      {
        target_date: targetDate
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        timeout: 15000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok || !response.data.target) {
      throw new Error(
        response.data.error ||
        response.data.message ||
        'No se pudo calcular el objetivo diario.'
      );
    }

    return response.data.target;
  }

  async analyzeFoodImage(image: File): Promise<FoodEstimate> {
    const apiBaseUrl = this.getApiBaseUrl();

    const formData = new FormData();
    formData.append('image', image);

    const response = await axios.post<ApiResponse<FoodEstimate>>(
      `${apiBaseUrl}/analyze_food_image.php`,
      formData,
      {
        headers: {
          ...this.authHeaders()
        },
        timeout: 90000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok || !response.data.estimate) {
      throw new Error(
        response.data.error ||
        response.data.message ||
        'No se pudo analizar la imagen.'
      );
    }

    return response.data.estimate;
  }

  async saveFoodLog(payload: SaveFoodLogPayload): Promise<FoodLogItem> {
    const apiBaseUrl = this.getApiBaseUrl();

    const response = await axios.post<ApiResponse<FoodLogItem>>(
      `${apiBaseUrl}/save_food_log.php`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        timeout: 15000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok || !response.data.food_log) {
      throw new Error(
        response.data.error ||
        response.data.message ||
        'No se pudo guardar el alimento.'
      );
    }

    return response.data.food_log;
  }

  async getDailySummary(targetDate: string): Promise<DailySummary> {
    const apiBaseUrl = this.getApiBaseUrl();

    const response = await axios.post<ApiResponse<BackendDailySummary>>(
      `${apiBaseUrl}/get_daily_summary.php`,
      {
        target_date: targetDate
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        timeout: 15000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok || !response.data.summary) {
      throw new Error(
        response.data.error ||
        response.data.message ||
        'No se pudo obtener el resumen diario.'
      );
    }

    const summary = response.data.summary;

    return {
      ok: true,
      date: summary.target_date,
      target_date: summary.target_date,
      target: summary.target,
      consumed: {
        kcal: Number(summary.consumed?.kcal || 0),
        protein_g: Number(summary.consumed?.protein_g || 0),
        fat_g: Number(summary.consumed?.fat_g || 0),
        carbs_g: Number(summary.consumed?.carbs_g || 0)
      },
      remaining: {
        kcal: Number(summary.remaining?.kcal || 0),
        protein_g: Number(summary.remaining?.protein_g || 0),
        fat_g: Number(summary.remaining?.fat_g || 0),
        carbs_g: Number(summary.remaining?.carbs_g || 0)
      },
      meals: (summary.meals || []).map((meal) => this.normalizeMeal(meal))
    };
  }
}