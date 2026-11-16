import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { Login } from './login';
import { environment } from '../../../../environments/environment';
import { fakeJwt, testProviders } from '../../../testing/test-providers';

describe('Login screen', () => {
  let login: Login;
  let ctrl: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const URL = `${environment.apiUrl}/users/login/`;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [Login], providers: testProviders });
    login = TestBed.createComponent(Login).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => ctrl.verify());

  it('asks to complete the fields and sends nothing when they are empty', () => {
    login.login();
    expect(login.error).toBe('Completá los campos.');
    ctrl.expectNone(URL);
  });

  it('sends a student to /home', () => {
    login.legajo = '13885'; login.password = 'x';
    login.login();
    ctrl.expectOne(URL).flush({ token: fakeJwt(), user: { categoria: 'usuario' } });
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('sends a librarian to /home-bibliotecario', () => {
    login.legajo = '12473'; login.password = 'x';
    login.login();
    ctrl.expectOne(URL).flush({ token: fakeJwt({ categoria: 'bibliotecario' }), user: { categoria: 'bibliotecario' } });
    expect(navigate).toHaveBeenCalledWith(['/home-bibliotecario']);
  });

  it('opens the librarian home for an account that also has admin', () => {
    login.legajo = 'DOBLE'; login.password = 'x';
    login.login();
    ctrl.expectOne(URL).flush({
      token: fakeJwt({ categoria: 'bibliotecario', roles: ['bibliotecario', 'admin'] }),
      user: { categoria: 'bibliotecario', roles: ['bibliotecario', 'admin'] },
    });
    expect(navigate).toHaveBeenCalledWith(['/home-bibliotecario']);
    expect(navigate).not.toHaveBeenCalledWith(['/admin-bibliotecarios']);
  });

  it('remembers the session in localStorage only when "Recordarme" is checked', () => {
    login.legajo = '13885'; login.password = 'x'; login.recordarme = true;
    login.login();
    ctrl.expectOne(URL).flush({ token: fakeJwt(), user: { categoria: 'usuario' } });
    expect(localStorage.getItem('auth_token')).not.toBeNull();
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('marks only the password when the user exists but the password is wrong', () => {
    login.legajo = '13885'; login.password = 'mal';
    login.login();
    ctrl.expectOne(URL).flush({ detail: 'Usuario no existente o contraseña incorrecta.', campos: ['contrasena'] }, { status: 400, statusText: 'Bad Request' });
    expect(login.passwordInvalido).toBe(true);
    expect(login.legajoInvalido).toBe(false);
    expect(login.error).toBe('Usuario no existente o contraseña incorrecta.');
    expect(login.cargando).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('marks both fields when the user does not exist', () => {
    login.legajo = '0'; login.password = 'mal';
    login.login();
    ctrl.expectOne(URL).flush({ campos: ['legajoOEmail', 'contrasena'] }, { status: 400, statusText: 'Bad Request' });
    expect(login.legajoInvalido && login.passwordInvalido).toBe(true);
  });

  it('explains how to sign in when an existing email belongs to multiple accounts', () => {
    login.legajo = 'duplicado@example.test'; login.password = 'clave';
    login.login();
    const detail = 'El email está asociado a varias cuentas. Ingresá con tu legajo y actualizá tu email.';
    ctrl.expectOne(URL).flush({ detail, campos: ['legajoOEmail'] }, { status: 400, statusText: 'Bad Request' });
    expect(login.error).toBe(detail);
    expect(login.legajoInvalido).toBe(true);
    expect(login.passwordInvalido).toBe(false);
    expect(login.cargando).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to the landing and to password recovery', () => {
    login.cancelar(); login.irAOlvide();
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(navigate).toHaveBeenCalledWith(['/forgot-password']);
  });
});
