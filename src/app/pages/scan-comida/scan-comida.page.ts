import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FoodEstimate, MealType, NutritionService } from '../../services/nutrition.service';

@Component({
  selector: 'app-scan-comida',
  templateUrl: './scan-comida.page.html',
  styleUrls: ['./scan-comida.page.scss'],
})
export class ScanComidaPage implements OnInit {
  selectedFile?: File;
  selectedFileName = '';
  imagePreviewUrl?: SafeUrl | string;

  estimate?: FoodEstimate;

  selectedMealType: MealType = 'comida';
  logDate = this.todayIso();

  isAnalyzing = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  readonly mealTypes: Array<{ key: MealType; label: string }> = [
    { key: 'desayuno', label: 'Desayuno' },
    { key: 'comida', label: 'Comida' },
    { key: 'cena', label: 'Cena' },
    { key: 'snacks', label: 'Snacks' }
  ];

  constructor(
    private readonly nutritionService: NutritionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const mealType = this.normalizeMealType(params.get('meal_type'));
      const date = params.get('date');

      if (mealType) {
        this.selectedMealType = mealType;
      }

      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        this.logDate = date;
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.errorMessage = '';
    this.successMessage = '';
    this.estimate = undefined;
    this.selectedFile = undefined;
    this.selectedFileName = '';
    this.imagePreviewUrl = undefined;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Selecciona una imagen válida.';
      input.value = '';
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.imagePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
  }

  onMealTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const mealType = this.normalizeMealType(select.value);

    if (mealType) {
      this.selectedMealType = mealType;
    }
  }

  onLogDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (/^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
      this.logDate = input.value;
    }
  }

  async analyzeImage(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedFile) {
      this.errorMessage = 'Primero toma o selecciona una foto.';
      return;
    }

    this.isAnalyzing = true;

    try {
      this.estimate = await this.nutritionService.analyzeFoodImage(this.selectedFile);

      /*
        La foto se usa una sola vez:
        1. Se envía al backend para análisis temporal.
        2. No se guarda en MySQL.
        3. No se conserva como preview/blob en el frontend.
      */
      this.selectedFile = undefined;
      this.selectedFileName = '';

      if (!this.estimate.food_name || this.estimate.food_name === 'Alimento por confirmar') {
        this.successMessage = 'Imagen analizada. Completa o corrige los valores antes de guardar.';
      } else {
        this.successMessage = 'Imagen analizada. Revisa los valores antes de guardar.';
      }
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Error desconocido al analizar la imagen.';
    } finally {
      this.isAnalyzing = false;
    }
  }

  updateEstimateText(field: 'food_name' | 'ai_recommendation', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;

    if (!this.estimate) {
      return;
    }

    this.estimate = {
      ...this.estimate,
      [field]: input.value
    };
  }

  updateEstimateNumber(field: 'kcal' | 'protein_g' | 'fat_g' | 'carbs_g', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (!this.estimate) {
      return;
    }

    this.estimate = {
      ...this.estimate,
      [field]: Number.isFinite(value) && value >= 0 ? value : 0
    };
  }

  async saveFood(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.estimate) {
      this.errorMessage = 'Primero analiza una imagen o completa los datos del alimento.';
      return;
    }

    if (!this.estimate.food_name.trim()) {
      this.errorMessage = 'Escribe el nombre del alimento.';
      return;
    }

    this.isSaving = true;

    try {
      await this.nutritionService.saveFoodLog({
        log_date: this.logDate,
        meal_type: this.selectedMealType,
        food_name: this.estimate.food_name.trim(),
        kcal: Math.round(this.estimate.kcal || 0),
        protein_g: Number(this.estimate.protein_g || 0),
        fat_g: Number(this.estimate.fat_g || 0),
        carbs_g: Number(this.estimate.carbs_g || 0),
        source: 'scanner',
        ai_recommendation: this.estimate.ai_recommendation || null
      });

      this.successMessage = 'Alimento guardado correctamente.';

      await this.router.navigate(['/calorias'], {
        queryParams: {
          date: this.logDate
        }
      });
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Error desconocido al guardar el alimento.';
    } finally {
      this.isSaving = false;
    }
  }

  createManualEstimate(): void {
    this.errorMessage = '';
    this.successMessage = 'Completa los valores del alimento y guárdalo.';

    this.selectedFile = undefined;
    this.selectedFileName = '';
    this.imagePreviewUrl = undefined;

    this.estimate = {
      food_name: '',
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      ai_recommendation: ''
    };
  }

  private normalizeMealType(value: string | null): MealType | null {
    const normalized = String(value || '').trim().toLowerCase();

    const map: Record<string, MealType> = {
      desayuno: 'desayuno',
      breakfast: 'desayuno',

      comida: 'comida',
      lunch: 'comida',

      cena: 'cena',
      dinner: 'cena',

      snacks: 'snacks',
      snack: 'snacks'
    };

    return map[normalized] || null;
  }

  private todayIso(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }
}
