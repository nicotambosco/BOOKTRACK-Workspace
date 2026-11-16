import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, of, tap, throwError } from 'rxjs';
import { Rol, User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private tokenKey = 'auth_token';
  readonly cambiandoRol = signal(false);
  readonly errorCambioRol = signal('');

  constructor(private http: HttpClient) {}

  login(legajoOEmail: string, contrasena: string, recordarme = false): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.api}/users/login/`, { legajoOEmail, contrasena }).pipe(
      tap(res => {
        // Recordarme: localStorage sobrevive al cierre del navegador; si no, sessionStorage dura solo la pestaña.
        this.logout();
        (recordarme ? localStorage : sessionStorage).setItem(this.tokenKey, res.token);
      })
    );
  }

  register(user: Partial<User> & { contrasena: string }): Observable<User> {
    return this.http.post<User>(`${this.api}/users/register/`, user);
  }

  forgotPassword(email: string): Observable<void> {
    return of(void 0);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    this.errorCambioRol.set('');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey) ?? localStorage.getItem(this.tokenKey);
  }

  getUserId(): string | null {
    try { return JSON.parse(atob((this.getToken() ?? '').split('.')[1])).user_id ?? null; } catch { return null; }
  }

  getUserRole(): 'usuario' | 'bibliotecario' | 'admin' | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.categoria ?? 'usuario';
    } catch {
      return null;
    }
  }

  getUserRoles(): Rol[] {
    try {
      const payload = JSON.parse(atob((this.getToken() ?? '').split('.')[1]));
      return (Array.isArray(payload.roles) ? payload.roles : [payload.categoria])
        .filter((rol: unknown): rol is Rol => rol === 'usuario' || rol === 'bibliotecario' || rol === 'admin');
    } catch { return []; }
  }

  actualizarToken(token: string) {
    const storage = localStorage.getItem(this.tokenKey) && !sessionStorage.getItem(this.tokenKey) ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token);
  }

  cambiarRol(rol: Rol): Observable<{ token: string; user: User }> {
    this.cambiandoRol.set(true);
    this.errorCambioRol.set('');
    return this.http.post<{ token: string; user: User }>(`${this.api}/users/active-role/`, { rol }).pipe(
      tap(res => this.actualizarToken(res.token)),
      catchError(error => {
        this.errorCambioRol.set('No se pudo cambiar de vista. Intentá nuevamente.');
        return throwError(() => error);
      }),
      finalize(() => this.cambiandoRol.set(false)),
    );
  }
}
