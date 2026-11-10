import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { Header } from './header';
import { CommentForm } from '../../../features/comments/comment-form/comment-form';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;

describe('Header notifications (derived from loans)', () => {
  let header: Header;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Header], providers: testProviders });
    header = TestBed.createComponent(Header).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctrl.verify());

  const load = (loans: object[]) => {
    header.ngOnInit();
    ctrl.expectOne(`${API}/loans/`).flush(loans);
    ctrl.expectOne(`${API}/books/`).flush([{ id: 9, titulo: 'Álgebra' }]);
  };

  it('warns about an overdue loan and resolves the book title', () => {
    load([{ id: 1, libroId: 9, estado: 'vencido', fechaVencimiento: '2020-01-01' }]);
    expect(header.notificaciones.map(n => n.tipo)).toContain('vencido');
    expect(header.tieneNotificaciones).toBe(true);
    expect(header.tituloLibro(9)).toBe('Álgebra');
    expect(header.tituloLibro(77)).toBe('Libro #77');
  });

  it('reports the outcome of a renewal request', () => {
    load([{ id: 2, libroId: 9, estado: 'vigente', fechaVencimiento: '2999-01-01', extensionEstado: 'aprobada' },
          { id: 3, libroId: 9, estado: 'vigente', fechaVencimiento: '2999-01-01', extensionEstado: 'denegada' }]);
    const tipos = header.notificaciones.map(n => n.tipo);
    expect(tipos).toContain('extensionAprobada');
    expect(tipos).toContain('extensionDenegada');
  });

  it('marks notifications as read when the panel is opened and remembers it', () => {
    load([{ id: 1, libroId: 9, estado: 'vencido', fechaVencimiento: '2020-01-01' }]);
    header.toggleNotificaciones();
    expect(header.mostrarNotificaciones).toBe(true);
    expect(header.tieneNotificaciones).toBe(false);
    expect(JSON.parse(localStorage.getItem('notif_leidas') ?? '[]')).toContain('1-vencido');
  });

  it('does not alert about returned loans', () => {
    load([{ id: 4, libroId: 9, estado: 'devuelto', fechaVencimiento: '2020-01-01' }]);
    expect(header.notificaciones).toEqual([]);
    expect(header.tieneNotificaciones).toBe(false);
  });

  it('does not query loans for the librarian header', () => {
    header.esAdmin = true;
    header.ngOnInit();
    ctrl.expectNone(`${API}/loans/`);
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

describe('CommentForm screen', () => {
  it('sends nothing until section and comment are filled, then posts them', () => {
    TestBed.configureTestingModule({ imports: [CommentForm], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(CommentForm).componentInstance;
    page.enviar();
    ctrl.expectNone(`${API}/comments/`);
    page.seccion = 'Catálogo'; page.comentario = 'Falta un libro';
    page.enviar();
    const req = ctrl.expectOne(`${API}/comments/`);
    expect(req.request.body).toEqual({ seccion: 'Catálogo', comentario: 'Falta un libro' });
    req.flush(null);
    expect(page.exito).toBe(true);
  });
});
