import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface LoginResponse {
  ok: boolean;
  message: string;
  token: string;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'nutriplus_token';

  constructor(private http: HttpClient) {}

  register(fullName: string, email: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/register.php`, {
      fullName,
      email,
      password
    });
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login.php`, {
      email,
      password
    }).pipe(
      tap((res) => {
        if (res.ok && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
        }
      })
    );
  }

  getProfile() {
    return this.http.get<any>(
      `${environment.apiUrl}/profile_get.php`,
      this.getAuthOptions()
    );
  }

  updateProfile(profile: {
    age: number | null;
    weightKg: number | null;
    heightCm: number | null;
  }) {
    return this.http.put<any>(
      `${environment.apiUrl}/profile_update.php`,
      profile,
      this.getAuthOptions()
    );
  }

  logout() {
    return this.http.post<any>(
      `${environment.apiUrl}/logout.php`,
      {},
      this.getAuthOptions()
    ).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getAuthOptions() {
    const token = this.getToken() || '';

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }
}