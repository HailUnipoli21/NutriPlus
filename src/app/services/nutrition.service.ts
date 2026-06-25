import axios from 'axios';
import { Injectable } from '@angular/core';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyNutritionTarget {
  user_id: number;
  target_date: string;
  bmr_kcal: number;
  tdee_kcal: number;
  target_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  activity_level: string;
  goal: string;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface FoodLogItem extends MacroTotals {
  id: number;
  log_date: string;
  meal_type: MealType;
  food_name: string;
  source: 'scanner' | 'manual' | 'chatbot';
  image_path?: string | null;
  ai_recommendation?: string | null;
  created_at?: string;
}

export interface MealSummary {
  key: MealType;
  label: string;
  totals: MacroTotals;
  items: FoodLogItem[];
}

export interface DailySummary {
  ok: boolean;
  date: string;
  target: DailyNutritionTarget;
  consumed: MacroTotals;
  remaining: MacroTotals;
  meals: MealSummary[];
}

export interface FoodEstimate extends MacroTotals {
  food_name: string;
  image_path?: string | null;
  ai_recommendation?: string | null;
}

export interface SaveFoodLogPayload extends MacroTotals {
  log_date: string;
  meal_type: MealType;
  food_name: string;
  source: 'scanner' | 'manual' | 'chatbot';
  image_path?: string | null;
  ai_recommendation?: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  message?: string;
  error?: string;
  target?: DailyNutritionTarget;
  estimate?: FoodEstimate;
  image_path?: string;
  food_log?: FoodLogItem;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class NutritionService {
  private readonly apiIpStorageKey = '9amm_api_ip';
  private readonly tokenStorageKeys = [
    'nutriplus_token',
    'auth_token',
    'token'
  ];

  private getApiBaseUrl(): string {
    const rawValue = localStorage.getItem(this.apiIpStorageKey) || '';
    const trimmedValue = rawValue.trim().replace(/\/+$/, '');

    if (!trimmedValue) {
      throw new Error('No hay URL/IP de API configurada.');
    }

    const valueWithProtocol = /^https?:\/\//i.test(trimmedValue)
      ? trimmedValue
      : `http://${trimmedValue}`;

    try {
      const url = new URL(valueWithProtocol);

      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/9amm/apis';
      }

      return url.toString().replace(/\/+$/, '');
    } catch {
      throw new Error('La URL/IP de API no es válida.');
    }
  }

  private getToken(): string {
    for (const key of this.tokenStorageKeys) {
      const token = localStorage.getItem(key);

      if (token) {
        return token;
      }
    }

    throw new Error('No hay token de sesión. Inicia sesión nuevamente.');
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getToken()}`
    };
  }

  async calculateDailyTarget(targetDate?: string): Promise<DailyNutritionTarget> {
    const response = await axios.post<ApiResponse<DailyNutritionTarget>>(
      `${this.getApiBaseUrl()}/calculate_daily_targets.php`,
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
      throw new Error(response.data.error || response.data.message || 'No se pudo calcular el objetivo diario.');
    }

    return response.data.target;
  }

  async analyzeFoodImage(image: File): Promise<FoodEstimate> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await axios.post<ApiResponse<FoodEstimate>>(
      `${this.getApiBaseUrl()}/analyze_food_image.php`,
      formData,
      {
        headers: {
          ...this.authHeaders()
        },
        timeout: 30000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok || !response.data.estimate) {
      throw new Error(response.data.error || response.data.message || 'No se pudo analizar la imagen.');
    }

    return {
      ...response.data.estimate,
      image_path: response.data.image_path || response.data.estimate.image_path || null
    };
  }

  async saveFoodLog(payload: SaveFoodLogPayload): Promise<FoodLogItem> {
    const response = await axios.post<ApiResponse<FoodLogItem>>(
      `${this.getApiBaseUrl()}/save_food_log.php`,
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
      throw new Error(response.data.error || response.data.message || 'No se pudo guardar el alimento.');
    }

    return response.data.food_log;
  }

  async getDailySummary(date: string): Promise<DailySummary> {
    const response = await axios.get<DailySummary & { error?: string; message?: string }>(
      `${this.getApiBaseUrl()}/get_daily_summary.php`,
      {
        params: { date },
        headers: {
          ...this.authHeaders()
        },
        timeout: 15000,
        validateStatus: () => true
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || response.data.message || 'No se pudo obtener el resumen diario.');
    }

    return response.data;
  }
}
