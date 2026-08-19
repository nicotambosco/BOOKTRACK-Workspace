import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) {}

  login(legajoOEmail: string, contrasena: string): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.api}/users/login/`, { legajoOEmail, contrasena }).pipe(
      tap(res => localStorage.setItem(this.tokenKey, res.token))
    );
  }

  register(user: Partial<User> & { contrasena: string }): Observable<User> {
    return this.http.post<User>(`${this.api}/users/register/`, user);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.api}/users/forgot-password/`, { email });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserRole(): 'usuario' | 'bibliotecario' | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.categoria ?? 'usuario';
    } catch {
      return null;
    }
  }
}
