import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type BiologicalSex = 'male' | 'female' | null;
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high' | null;
type Goal = 'lose_weight' | 'maintain_weight' | 'gain_muscle' | null;
type WeightLossPace = 'slow' | 'moderate' | 'fast' | null;

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage {
  fullName = '';
  email = '';

  age: number | null = null;
  biologicalSex: BiologicalSex = null;
  weightKg: number | null = null;
  heightCm: number | null = null;
  activityLevel: ActivityLevel = null;
  goal: Goal = null;
  weightLossPace: WeightLossPace = null;

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ionViewWillEnter() {
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getProfile()
      .subscribe({
        next: (res) => {
          const user = res.user;

          this.fullName = user.full_name;
          this.email = user.email;
          this.age = user.age ?? null;
          this.biologicalSex = (user.biological_sex ?? null) as BiologicalSex;
          this.weightKg = user.weight_kg ?? null;
          this.heightCm = user.height_cm ?? null;
          this.activityLevel = (user.activity_level ?? null) as ActivityLevel;
          this.goal = (user.goal ?? null) as Goal;
          this.weightLossPace = (user.weight_loss_pace ?? null) as WeightLossPace;

          if (this.goal !== 'lose_weight') {
            this.weightLossPace = null;
          }
        },
        error: () => {
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
  }

  onGoalChange(newGoal: Goal) {
    this.goal = newGoal;

    if (newGoal !== 'lose_weight') {
      this.weightLossPace = null;
    }
  }

  guardarCambios() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.authService.updateProfile({
      age: this.age,
      biologicalSex: this.biologicalSex,
      weightKg: this.weightKg,
      heightCm: this.heightCm,
      activityLevel: this.activityLevel,
      goal: this.goal,
      weightLossPace: this.goal === 'lose_weight' ? this.weightLossPace : null
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Perfil actualizado.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Error al guardar perfil.';
      }
    });
  }

  cerrarSesion() {
    this.authService.logout()
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        error: () => {
          localStorage.removeItem('nutriplus_token');
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
  }
}