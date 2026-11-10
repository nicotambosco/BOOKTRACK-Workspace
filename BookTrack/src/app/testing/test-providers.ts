import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

// Proveedores comunes para specs de componentes: router vacío y HTTP simulado (sin llamadas reales a la API).
export const testProviders = [provideRouter([]), provideHttpClient(), provideHttpClientTesting()];

// JWT de prueba (sin firma real): el front solo decodifica el payload.
export function fakeJwt(payload: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `h.${btoa(JSON.stringify({ exp, categoria: 'usuario', ...payload }))}.s`;
}
