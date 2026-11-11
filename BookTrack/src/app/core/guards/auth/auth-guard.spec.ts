import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { fakeJwt, testProviders } from '../../../testing/test-providers';

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
    expect(url(run(['usuario']))).toBe('/home-admin');
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
});
