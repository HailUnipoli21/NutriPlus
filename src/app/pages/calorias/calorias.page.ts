import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DailySummary, MacroTotals, MealSummary, MealType, NutritionService } from '../../services/nutrition.service';

@Component({
  selector: 'app-calorias',
  templateUrl: './calorias.page.html',
  styleUrls: ['./calorias.page.scss'],
})
export class CaloriasPage implements OnInit {
  selectedDate = this.todayIso();
  summary?: DailySummary;

  isLoading = false;
  errorMessage = '';

  readonly mealDistribution: Record<MealType, number> = {
    desayuno: 0.25,
    comida: 0.35,
    cena: 0.30,
    snacks: 0.10
  };

  constructor(
    private readonly nutritionService: NutritionService,
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const date = params.get('date');

      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        this.selectedDate = date;
      }

      this.loadDailySummary();
    });
  }

  ionViewWillEnter(): void {
    this.loadDailySummary();
  }

  async loadDailySummary(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.summary = await this.nutritionService.getDailySummary(this.selectedDate);
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : '';
      const lowerMsg = originalMessage.toLowerCase();
      const isProfileError = lowerMsg.includes('perfil') ||
        lowerMsg.includes('completar') ||
        lowerMsg.includes('peso') ||
        lowerMsg.includes('altura') ||
        lowerMsg.includes('edad') ||
        lowerMsg.includes('sexo') ||
        lowerMsg.includes('actividad') ||
        lowerMsg.includes('objetivo') ||
        lowerMsg.includes('weight') ||
        lowerMsg.includes('height') ||
        lowerMsg.includes('age') ||
        lowerMsg.includes('gender') ||
        lowerMsg.includes('activity') ||
        lowerMsg.includes('goal') ||
        lowerMsg.includes('tdee') ||
        lowerMsg.includes('bmr') ||
        lowerMsg.includes('target');

      if (isProfileError) {
        this.errorMessage = 'Aun falta datos que rellenar en perfil';
      } else {
        this.errorMessage = originalMessage || 'Error desconocido al consultar calorías.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  previousDay(): void {
    this.selectedDate = this.shiftDate(this.selectedDate, -1);
    this.loadDailySummary();
  }

  nextDay(): void {
    this.selectedDate = this.shiftDate(this.selectedDate, 1);
    this.loadDailySummary();
  }

  selectCalendarDate(isoDate: string): void {
    this.selectedDate = isoDate;
    this.loadDailySummary();
  }

  get calendarDays(): Array<{ label: string; dayNumber: number; isoDate: string }> {
    const days: Array<{ label: string; dayNumber: number; isoDate: string }> = [];
    const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Sunday to Saturday in JS getDay()

    // Find the Monday of the week containing selectedDate
    const current = new Date(`${this.selectedDate}T00:00:00`);
    const dayOfWeek = current.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const iso = day.toISOString().slice(0, 10);
      const dayNum = day.getDate();
      const label = labels[day.getDay()];

      days.push({
        label,
        dayNumber: dayNum,
        isoDate: iso,
      });
    }
    return days;
  }

  get titleDate(): string {
    const today = this.todayIso();
    const yesterday = this.shiftDate(today, -1);
    const tomorrow = this.shiftDate(today, 1);

    if (this.selectedDate === today) {
      return 'Hoy';
    }

    if (this.selectedDate === yesterday) {
      return 'Ayer';
    }

    if (this.selectedDate === tomorrow) {
      return 'Mañana';
    }

    return this.selectedDate;
  }

  get consumed(): MacroTotals {
    return this.summary?.consumed || this.emptyTotals();
  }

  get target(): MacroTotals {
    if (!this.summary?.target) {
      return this.emptyTotals();
    }

    return {
      kcal: this.summary.target.target_kcal,
      protein_g: this.summary.target.protein_g,
      fat_g: this.summary.target.fat_g,
      carbs_g: this.summary.target.carbs_g
    };
  }

  get meals(): MealSummary[] {
    if (this.summary?.meals?.length) {
      return this.summary.meals;
    }

    return [
      this.emptyMeal('desayuno', 'Desayuno'),
      this.emptyMeal('comida', 'Comida'),
      this.emptyMeal('cena', 'Cena'),
      this.emptyMeal('snacks', 'Snacks')
    ];
  }

  progress(current: number, target: number): number {
    if (!target || target <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (current / target) * 100));
  }

  mealTarget(mealType: MealType, macro: keyof MacroTotals): number {
    const factor = this.mealDistribution[mealType] || 0.25;
    const dailyTarget = this.target[macro] || 0;

    return Math.round(dailyTarget * factor);
  }

  round(value: number): number {
    return Math.round(Number(value || 0));
  }

  private emptyTotals(): MacroTotals {
    return {
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0
    };
  }

  private emptyMeal(key: MealType, label: string): MealSummary {
    return {
      meal_type: key,
      key,
      label,
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      items_count: 0,
      totals: this.emptyTotals(),
      items: []
    };
  }

  private shiftDate(dateIso: string, days: number): string {
    const date = new Date(`${dateIso}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private todayIso(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }
}