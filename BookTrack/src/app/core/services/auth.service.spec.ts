import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const http = { post: vi.fn() } as unknown as HttpClient;
  const service = new AuthService(http);

  afterEach(() => localStorage.clear());

  function token(exp: number): string {
    return `header.${btoa(JSON.stringify({ exp, categoria: 'usuario' }))}.signature`;
  }

  it('accepts a current session', () => {
    localStorage.setItem('auth_token', token(Math.floor(Date.now() / 1000) + 60));
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears an expired session', () => {
    localStorage.setItem('auth_token', token(Math.floor(Date.now() / 1000) - 60));
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('simulates password recovery in the demo', async () => {
    await expect(firstValueFrom(service.forgotPassword('demo@booktrack.local'))).resolves.toBeUndefined();
  });
});
