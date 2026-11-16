import { Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/services/auth.service';
import { authGuard } from '../../../core/guards/auth/auth-guard';
import { authInterceptor } from '../../../core/interceptors/auth/auth-interceptor';
import { fakeJwt } from '../../../testing/test-providers';
import { environment } from '../../../../environments/environment';
import { Rol } from '../../../models/user.model';
import { RoleSwitcher } from './role-switcher';

@Component({ imports: [RoleSwitcher], template: '<h1>Panel administrador</h1><app-role-switcher/>' })
class PanelAdmin {}
@Component({ imports: [RoleSwitcher], template: '<h1>Panel bibliotecario</h1><app-role-switcher/>' })
class PanelBibliotecario {}

const token = (categoria: Rol) => fakeJwt({ categoria, user_id: 'DOBLE', roles: ['bibliotecario', 'admin'] });

describe('Navegación entre las vistas admin y bibliotecario', () => {
  let harness: RouterTestingHarness;
  let ctrl: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    sessionStorage.setItem('auth_token', token('admin'));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([
        { path: 'admin-bibliotecarios', component: PanelAdmin, canActivate: [authGuard], data: { roles: ['admin'] } },
        { path: 'home-bibliotecario', component: PanelBibliotecario, canActivate: [authGuard], data: { roles: ['bibliotecario'] } },
      ])],
    });
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create('/admin-bibliotecarios');
  });
  afterEach(() => { ctrl.verify(); localStorage.clear(); sessionStorage.clear(); });

  const selector = () => harness.routeNativeElement!.querySelector<HTMLSelectElement>('select')!;

  function elegir(rol: Rol) {
    selector().value = rol;
    selector().dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  async function respuesta(rol: Rol) {
    let peticion: ReturnType<HttpTestingController['expectOne']> | undefined;
    await vi.waitFor(() => {
      const pendientes = ctrl.match(r => r.url.endsWith('/active-role/'));
      expect(pendientes).toHaveLength(1);
      peticion = pendientes[0];
    });
    expect(peticion!.request.body).toEqual({ rol });
    expect(peticion!.request.headers.get('Authorization')).toContain('Bearer ');
    peticion!.flush({ token: token(rol), user: { categoria: rol, roles: ['bibliotecario', 'admin'] } });
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('inicia en admin y abre ambos paneles con la selección y el token correctos', async () => {
    expect(selector().value).toBe('admin');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toBe('Panel administrador');
    elegir('bibliotecario');
    expect(selector().value).toBe('admin');
    await respuesta('bibliotecario');
    expect(router.url).toBe('/home-bibliotecario');
    expect(selector().value).toBe('bibliotecario');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toBe('Panel bibliotecario');
    expect(TestBed.inject(AuthService).getUserRole()).toBe('bibliotecario');
    elegir('admin');
    await respuesta('admin');
    expect(router.url).toBe('/admin-bibliotecarios');
    expect(selector().value).toBe('admin');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toBe('Panel administrador');
    expect(TestBed.inject(AuthService).getUserRole()).toBe('admin');
  });

  it('mantiene la vista y selección de admin cuando falla el cambio', async () => {
    elegir('bibliotecario');
    let peticion: ReturnType<HttpTestingController['expectOne']> | undefined;
    await vi.waitFor(() => {
      const pendientes = ctrl.match(r => r.url.endsWith('/active-role/'));
      expect(pendientes).toHaveLength(1);
      peticion = pendientes[0];
    });
    peticion!.flush({}, { status: 500, statusText: 'Error' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/admin-bibliotecarios');
    expect(selector().value).toBe('admin');
    expect(TestBed.inject(AuthService).getUserRole()).toBe('admin');
    expect(harness.routeNativeElement!.textContent).toContain('No se pudo cambiar de vista.');
  });
});
