import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
})
export class RegistroPage {
  fullName = '';
  email = '';
  password = '';

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  registrar() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.fullName || !this.email || !this.password) {
      this.errorMessage = 'Completa todos los campos.';
      return;
    }

    this.loading = true;

    this.authService.register(this.fullName, this.email, this.password)
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.successMessage = res.message || 'Registro correcto.';
          this.router.navigateByUrl('/login');
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.error || 'Error al registrar usuario.';
        }
      });
  }
}