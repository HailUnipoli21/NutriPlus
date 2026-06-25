import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = '';
  password = '';

  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  entrar() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(this.email, this.password)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/home', { replaceUrl: true });
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.error || 'Error al iniciar sesión.';
        }
      });
  }
}