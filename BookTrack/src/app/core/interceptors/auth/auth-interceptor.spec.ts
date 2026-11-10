import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth-interceptor';
import { fakeJwt } from '../../../testing/test-providers';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  it('adds the Bearer token to protected requests', () => {
    const token = fakeJwt();
    localStorage.setItem('auth_token', token);
    http.get('/api/loans/').subscribe();
    expect(ctrl.expectOne('/api/loans/').request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('does not send the token to login or register', () => {
    localStorage.setItem('auth_token', fakeJwt());
    http.post('/api/users/login/', {}).subscribe();
    http.post('/api/users/register/', {}).subscribe();
    expect(ctrl.expectOne('/api/users/login/').request.headers.has('Authorization')).toBe(false);
    expect(ctrl.expectOne('/api/users/register/').request.headers.has('Authorization')).toBe(false);
  });

  it('sends no Authorization header without a session', () => {
    http.get('/api/books/').subscribe();
    expect(ctrl.expectOne('/api/books/').request.headers.has('Authorization')).toBe(false);
  });
});
