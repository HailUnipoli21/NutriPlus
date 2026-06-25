import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage {
  fullName = '';
  email = '';

  age: number | null = null;
  weightKg: number | null = null;
  heightCm: number | null = null;

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
          this.age = user.age;
          this.weightKg = user.weight_kg;
          this.heightCm = user.height_cm;
        },
        error: () => {
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
  }

  guardarCambios() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.authService.updateProfile({
      age: this.age,
      weightKg: this.weightKg,
      heightCm: this.heightCm
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