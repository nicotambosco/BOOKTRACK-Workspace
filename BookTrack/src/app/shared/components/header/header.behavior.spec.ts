import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { Header } from './header';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;

describe('Header notifications (served by the API)', () => {
  let header: Header;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Header], providers: testProviders });
    header = TestBed.createComponent(Header).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  const aviso = (o: object = {}) => ({ id: 1, fecha: '2026-11-10T12:00:00-03:00', tipo: 'prestamo_vencido',
    mensaje: 'Tu préstamo de "Álgebra" está vencido.', reservaId: null, prestamoId: 5, ...o });
  const load = (items: object[]) => {
    header.ngOnInit();
    ctrl.expectOne(`${API}/notifications/`).flush(items);
  };

  it('shows the notifications sent by the server and flags the unread ones', () => {
    load([aviso(), aviso({ id: 2, tipo: 'renovacion_aprobada', mensaje: 'La biblioteca aprobó la renovación.' })]);
    expect(header.notificaciones.map(n => n.tipo)).toEqual(['prestamo_vencido', 'renovacion_aprobada']);
    expect(header.tieneNotificaciones).toBe(true);
  });

  it('marks notifications as read when the panel is opened and remembers it', () => {
    load([aviso()]);
    header.toggleNotificaciones();
    expect(header.mostrarNotificaciones).toBe(true);
    expect(header.tieneNotificaciones).toBe(false);
    expect(JSON.parse(localStorage.getItem('notif_leidas') ?? '[]')).toContain('1');
  });

  it('does not flag notifications that were already read', () => {
    localStorage.setItem('notif_leidas', JSON.stringify(['1']));
    load([aviso()]);
    expect(header.tieneNotificaciones).toBe(false);
  });

  it('has nothing to flag without notifications', () => {
    load([]);
    expect(header.notificaciones).toEqual([]);
    expect(header.tieneNotificaciones).toBe(false);
  });

  it('does not query notifications for the librarian header', () => {
    header.esAdmin = true;
    header.ngOnInit();
    ctrl.expectNone(`${API}/notifications/`);
  });

  it('navigates according to the role', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    header.irAHome(); header.irAPerfil();
    header.esAdmin = true;
    header.irAHome(); header.irAPerfil();
    expect(navigate.mock.calls.map(c => (c[0] as string[])[0])).toEqual(['/home', '/profile', '/home-admin', '/profile-admin']);
  });

  it('searches only with non-blank text', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    header.busqueda = '   ';
    header.buscar();
    expect(navigate).not.toHaveBeenCalled();
    header.busqueda = 'redes';
    header.buscar();
    expect(navigate).toHaveBeenCalledWith(['/book-search'], { queryParams: { q: 'redes' } });
  });
});
