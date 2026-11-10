import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { fakeJwt, testProviders } from '../../testing/test-providers';

describe('AuthService login and "Recordarme"', () => {
  let auth: AuthService;
  let ctrl: HttpTestingController;
  const respond = (token: string) =>
    ctrl.expectOne(`${environment.apiUrl}/users/login/`).flush({ token, user: { categoria: 'usuario' } });

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
    auth = TestBed.inject(AuthService);
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('posts legajoOEmail and contrasena', () => {
    auth.login('13885', 'clave').subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/users/login/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ legajoOEmail: '13885', contrasena: 'clave' });
    req.flush({ token: fakeJwt(), user: {} });
  });

  it('keeps the session only for the tab when "Recordarme" is off', () => {
    const token = fakeJwt();
    auth.login('13885', 'clave').subscribe(); respond(token);
    expect(sessionStorage.getItem('auth_token')).toBe(token);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('persists the session across browser restarts when "Recordarme" is on', () => {
    const token = fakeJwt();
    auth.login('13885', 'clave', true).subscribe(); respond(token);
    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('replaces a previous session on a new login', () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'bibliotecario' }));
    auth.login('13885', 'clave').subscribe(); respond(fakeJwt({ categoria: 'usuario' }));
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(auth.getUserRole()).toBe('usuario');
  });

  it('logout clears both storages', () => {
    localStorage.setItem('auth_token', fakeJwt()); sessionStorage.setItem('auth_token', fakeJwt());
    auth.logout();
    expect(auth.getToken()).toBeNull();
  });

  it('reads the role from the token', () => {
    sessionStorage.setItem('auth_token', fakeJwt({ categoria: 'bibliotecario' }));
    expect(auth.getUserRole()).toBe('bibliotecario');
  });

  it('registers through the public endpoint', () => {
    auth.register({ nombreApellido: 'Ana', email: 'a@a.com', categoria: 'usuario', contrasena: 'secreto' }).subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/users/register/`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
