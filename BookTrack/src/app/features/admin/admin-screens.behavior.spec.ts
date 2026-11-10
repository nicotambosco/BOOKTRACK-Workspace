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
    { id: 2, nombreApellido: 'Franco', email: '', categoria: 'bibliotecario' },
    { id: 3, nombreApellido: 'Pedro', email: '', categoria: 'usuario' }];

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

  it('saves an edited user with PATCH and leaves edit mode', () => {
    page.editarRol(3);
    expect(page.usuarioEnEdicion).toBe(3);
    page.guardarRol(page.usuarios[1]);
    const req = ctrl.expectOne(`${API}/users/3/`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
    expect(page.usuarioEnEdicion).toBeNull();
  });

  it('asks for confirmation before deleting and reloads the list', () => {
    const confirm = vi.spyOn(window, 'confirm');
    confirm.mockReturnValueOnce(false);
    page.eliminarUsuario(3);
    ctrl.expectNone(`${API}/users/3/`);
    confirm.mockReturnValueOnce(true);
    page.eliminarUsuario(3);
    const req = ctrl.expectOne(`${API}/users/3/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    ctrl.expectOne(`${API}/users/`).flush(users().slice(0, 1));
    expect(page.usuarios).toHaveLength(1);
  });

  it('shows an error when the deletion is refused', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    page.eliminarUsuario(3);
    ctrl.expectOne(`${API}/users/3/`).flush(['tiene historial'], { status: 400, statusText: 'Bad Request' });
    expect(page.error).toContain('Error al eliminar usuario');
  });
});
