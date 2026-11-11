import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Reports } from './reports/reports';
import { UserManagement } from './user-management/user-management';
import { environment } from '../../../environments/environment';
import { testProviders } from '../../testing/test-providers';

const API = environment.apiUrl;

describe('Reports screen', () => {
  it('computes the six counters from the API', () => {
    TestBed.configureTestingModule({ imports: [Reports], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(Reports).componentInstance;
    page.ngOnInit();
    ctrl.expectOne(`${API}/books/`).flush([{}, {}, {}]);
    ctrl.expectOne(`${API}/users/`).flush([{}, {}]);
    ctrl.expectOne(r => r.url === `${API}/reservations/` && r.params.get('estado') === 'activa').flush([{}, {}, {}, {}]);
    ctrl.expectOne(`${API}/loans/`).flush([
      { estado: 'vigente' }, { estado: 'vigente' }, { estado: 'vencido' }, { estado: 'devuelto' }, { estado: 'devuelto' }, { estado: 'devuelto' }]);
    expect(page).toMatchObject({ librosTotal: 3, usuariosTotal: 2, prestamosPendientes: 4,
      prestamosAprobados: 2, prestamosVencidos: 1, prestamosDevueltos: 3, cargando: false });
    ctrl.verify();
  });

  it('stops the loading state when the loans request fails', () => {
    TestBed.configureTestingModule({ imports: [Reports], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(Reports).componentInstance;
    page.ngOnInit();
    ctrl.match(() => true).forEach(r => r.flush('x', { status: 500, statusText: 'err' }));
    expect(page.cargando).toBe(false);
  });
});

describe('UserManagement screen', () => {
  let page: UserManagement;
  let ctrl: HttpTestingController;
  const users = () => [
    { id: '12473', nombreApellido: 'Franco', email: '', categoria: 'bibliotecario' },
    { id: '13885', nombreApellido: 'Pedro', email: '', categoria: 'usuario' }];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UserManagement], providers: testProviders });
    page = TestBed.createComponent(UserManagement).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    ctrl.expectOne(`${API}/users/`).flush(users());
  });
  afterEach(() => ctrl.verify());

  it('lists users', () => {
    expect(page.usuarios).toHaveLength(2);
    expect(page.cargando).toBe(false);
  });

  it('is read-only: it has no edit or delete actions', () => {
    const anyPage = page as unknown as Record<string, unknown>;
    for (const accion of ['editarRol', 'guardarRol', 'cancelarEdicion', 'eliminarUsuario']) expect(anyPage[accion]).toBeUndefined();
  });

  it('opens the loan history of a user', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.verHistorial(page.usuarios[1]);
    expect(navigate).toHaveBeenCalledWith(['/user-loans', '13885']);
  });
});
