import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { fakeJwt, testProviders } from '../../../testing/test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';

describe('authGuard', () => {
  const run = (roles?: string[]) =>
    TestBed.runInInjectionContext(() =>
      authGuard({ data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders });
  });

  it('sends anonymous visitors to /login', () => {
    expect(url(run(['usuario']))).toBe('/login');
  });

  it('lets an authenticated user into a route without role restriction', () => {
    localStorage.setItem('auth_token', fakeJwt());
    expect(run()).toBe(true);
  });

  it('lets a librarian into a librarian-only route', () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'bibliotecario' }));
    expect(run(['bibliotecario'])).toBe(true);
  });

  it('redirects a regular user away from a librarian-only route', () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'usuario' }));
    expect(url(run(['bibliotecario']))).toBe('/home');
  });

  it('sends a librarian who opens a user-only route back to the librarian panel', () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'bibliotecario' }));
    expect(url(run(['usuario']))).toBe('/home-bibliotecario');
  });

  it('lets a regular user into a user-only route', () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'usuario' }));
    expect(run(['usuario'])).toBe(true);
  });

  it('treats an expired token as anonymous', () => {
    localStorage.setItem('auth_token', fakeJwt({ exp: Math.floor(Date.now() / 1000) - 10 }));
    expect(url(run())).toBe('/login');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('switches to an assigned librarian role before entering its view', async () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'admin', roles: ['admin', 'bibliotecario'] }));
    const result = firstValueFrom(run(['bibliotecario']) as Observable<boolean | UrlTree>);
    const ctrl = TestBed.inject(HttpTestingController);
    const req = ctrl.expectOne(`${environment.apiUrl}/users/active-role/`);
    expect(req.request.body).toEqual({ rol: 'bibliotecario' });
    const nuevo = fakeJwt({ categoria: 'bibliotecario', roles: ['admin', 'bibliotecario'] });
    req.flush({ token: nuevo, user: { categoria: 'bibliotecario' } });
    expect(await result).toBe(true);
    expect(TestBed.inject(AuthService).getUserRole()).toBe('bibliotecario');
    expect(localStorage.getItem('auth_token')).toBe(nuevo);
    ctrl.verify();
  });

  it('preserves session storage when switching back to the admin view', async () => {
    sessionStorage.setItem('auth_token', fakeJwt({ categoria: 'bibliotecario', roles: ['admin', 'bibliotecario'] }));
    const result = firstValueFrom(run(['admin']) as Observable<boolean | UrlTree>);
    const ctrl = TestBed.inject(HttpTestingController);
    const nuevo = fakeJwt({ categoria: 'admin', roles: ['admin', 'bibliotecario'] });
    ctrl.expectOne(`${environment.apiUrl}/users/active-role/`).flush({ token: nuevo, user: { categoria: 'admin' } });
    expect(await result).toBe(true);
    expect(sessionStorage.getItem('auth_token')).toBe(nuevo);
    expect(localStorage.getItem('auth_token')).toBeNull();
    ctrl.verify();
  });

  it('clears the session when the assigned roles have been revoked on the server', async () => {
    localStorage.setItem('auth_token', fakeJwt({ categoria: 'admin', roles: ['admin', 'bibliotecario'] }));
    const result = firstValueFrom(run(['bibliotecario']) as Observable<boolean | UrlTree>);
    const ctrl = TestBed.inject(HttpTestingController);
    ctrl.expectOne(`${environment.apiUrl}/users/active-role/`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(url(await result)).toBe('/login');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(TestBed.inject(AuthService).cambiandoRol()).toBe(false);
    ctrl.verify();
  });
});
