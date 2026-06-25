import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FoodEstimate, MealType, NutritionService } from '../../services/nutrition.service';

@Component({
  selector: 'app-scan-comida',
  templateUrl: './scan-comida.page.html',
  styleUrls: ['./scan-comida.page.scss'],
})
export class ScanComidaPage implements OnInit {
  selectedFile?: File;
  previewUrl?: string;
  estimate?: FoodEstimate;

  selectedMealType: MealType = 'lunch';
  logDate = this.todayIso();

  isAnalyzing = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  readonly mealTypes: Array<{ key: MealType; label: string }> = [
    { key: 'breakfast', label: 'Desayuno' },
    { key: 'lunch', label: 'Comida' },
    { key: 'dinner', label: 'Cena' },
    { key: 'snack', label: 'Snacks' }
  ];

  constructor(
    private readonly nutritionService: NutritionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const mealType = params.get('meal_type') as MealType | null;
      const date = params.get('date');

      if (mealType && this.mealTypes.some(meal => meal.key === mealType)) {
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

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Selecciona una imagen válida.';
      return;
    }

    this.selectedFile = file;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = URL.createObjectURL(file);
  }

  onMealTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value as MealType;

    if (this.mealTypes.some(meal => meal.key === value)) {
      this.selectedMealType = value;
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

      if (!this.estimate.food_name || this.estimate.food_name === 'Alimento por confirmar') {
        this.successMessage = 'Imagen cargada. Completa o corrige los valores antes de guardar.';
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
        image_path: this.estimate.image_path || null,
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

    this.estimate = {
      food_name: '',
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      image_path: null,
      ai_recommendation: ''
    };
  }

  private todayIso(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }
}
