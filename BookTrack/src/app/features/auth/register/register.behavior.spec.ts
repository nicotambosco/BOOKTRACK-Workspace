import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { Register } from './register';
import { ForgotPassword } from '../forgot-password/forgot-password';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

describe('Register screen', () => {
  let page: Register;
  let ctrl: HttpTestingController;
  const URL = `${environment.apiUrl}/users/register/`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Register], providers: testProviders });
    page = TestBed.createComponent(Register).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => ctrl.verify());

  it('requires every mandatory field', () => {
    page.nombre = 'Ana';
    page.registrar();
    expect(page.error).toBe('Completá todos los campos obligatorios.');
    ctrl.expectNone(URL);
  });

  it('registers always as a regular user and shows the success state', () => {
    Object.assign(page, { nombre: 'Ana Gómez', email: 'ana@utn.edu', legajo: '20001', password: 'secreto1', codigo: '' });
    page.registrar();
    const req = ctrl.expectOne(URL);
    expect(req.request.body).toMatchObject({ nombreApellido: 'Ana Gómez', legajo: '20001', contrasena: 'secreto1', categoria: 'usuario' });
    req.flush({});
    expect(page.exito).toBe(true);
    expect(page.cargando).toBe(false);
  });

  it('shows an error when the API rejects the registration', () => {
    Object.assign(page, { nombre: 'Ana', email: 'a@a.com', legajo: '1', password: 'secreto1' });
    page.registrar();
    ctrl.expectOne(URL).flush({ legajo: ['duplicado'] }, { status: 400, statusText: 'Bad Request' });
    expect(page.exito).toBe(false);
    expect(page.error).toContain('Error al registrarse');
  });
});

describe('ForgotPassword screen (simulated recovery)', () => {
  it('rejects mismatched emails and accepts matching ones without calling the API', () => {
    TestBed.configureTestingModule({ imports: [ForgotPassword], providers: testProviders });
    const page = TestBed.createComponent(ForgotPassword).componentInstance;
    page.email = 'a@a.com'; page.emailConfirm = 'b@a.com';
    page.enviar();
    expect(page.error).toBe('Los emails no coinciden.');
    expect(page.exito).toBe(false);
    page.emailConfirm = 'a@a.com';
    page.enviar();
    expect(page.exito).toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });
});
