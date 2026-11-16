import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { testProviders } from '../../../testing/test-providers';
import { environment } from '../../../../environments/environment';
import { ProfileAdmin } from './profile-admin';

const API = environment.apiUrl;

describe('Perfil del bibliotecario', () => {
  let fixture: ComponentFixture<ProfileAdmin>;
  let ctrl: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    await TestBed.configureTestingModule({ imports: [ProfileAdmin], providers: testProviders }).compileComponents();
    fixture = TestBed.createComponent(ProfileAdmin);
    ctrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    ctrl.expectOne(`${API}/users/me/`).flush({
      id: '12473', legajo: '12473', nombreApellido: 'Franco Perez', email: 'franco@example.test',
      categoria: 'bibliotecario', roles: ['usuario', 'bibliotecario', 'admin'],
    });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => ctrl.verify());

  it('muestra los datos personales sin controles para administrar roles', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector<HTMLInputElement>('#nombrePerfil')?.value).toBe('Franco Perez');
    expect(root.querySelector('app-profile-roles')).toBeNull();
    expect(root.querySelector('app-role-picker')).toBeNull();
    expect(root.textContent).not.toContain('Mis roles');
    expect(root.textContent).not.toContain('Guardar roles');
  });
});
