import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { LoanManagement } from './loan-management';
import { UserHistory } from '../user-history/user-history';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;
const loan = (o: Partial<Loan> = {}): Loan => ({ id: 1, estudianteId: '13885', libroId: '9', fechaInicio: '2026-11-01',
  fechaVencimiento: '2026-11-08', fechaDevolucion: null, estado: 'vigente', ...o });
const reservation = (o: Partial<Reservation> = {}): Reservation => ({ id: 10, estudianteId: '13885', estudianteNombre: 'Pedro',
  libroId: '9', libroTitulo: 'Álgebra', fechaReserva: '2026-11-01', fechaRetiro: '2026-11-10', fechaVencimiento: '2026-11-17',
  estado: 'activa', prestamoId: null, bibliotecarioId: null, ...o });

describe('LoanManagement screen (librarian)', () => {
  let page: LoanManagement;
  let ctrl: HttpTestingController;

  const flushLists = (loans: Loan[], reservations: Reservation[]) => {
    ctrl.expectOne(`${API}/loans/`).flush(loans);
    ctrl.expectOne(`${API}/books/`).flush([{ id: '9', isbn: '9', ejemplares: [{ id: 'E-1', estado: 'disponible' }, { id: 'E-2', estado: 'prestado' }, { id: 'E-3', estado: 'baja' }] }]);
    ctrl.expectOne(r => r.url === `${API}/reservations/`).flush(reservations);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoanManagement], providers: testProviders });
    page = TestBed.createComponent(LoanManagement).componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
  });
  afterEach(() => ctrl.verify());

  it('loads reservations and loans together', () => {
    flushLists([loan()], [reservation()]);
    expect(page.prestamos).toHaveLength(1);
    expect(page.reservas).toHaveLength(1);
    expect(page.ocupado).toBe(false);
  });

  it('shows only what still waits for an answer and leaves the answered ones to the archive', () => {
    flushLists(
      [loan({ id: 1, estado: 'vigente' }), loan({ id: 2, estado: 'vencido' }), loan({ id: 3, estado: 'devuelto' })],
      [reservation({ id: 10 }), reservation({ id: 11, estado: 'finalizada', prestamoId: 1 }),
       reservation({ id: 12, estado: 'cancelada' }), reservation({ id: 13, estado: 'vencida' })]);
    expect(page.reservasPendientes.map(r => r.id)).toEqual([10, 13]);
    expect(page.prestamosAbiertos.map(p => p.id)).toEqual([1, 2]);
  });

  it('offers only available copies and does not submit an invalid selection', () => {
    flushLists([], [reservation()]);
    expect(page.disponibles(reservation())).toEqual(['E-1']);
    page.ejemplaresSeleccionados[10] = 'E-2';
    page.retirar(reservation());
    ctrl.expectNone(`${API}/reservations/10/retirar/`);
    expect(page.disponibles(reservation({ libroId: 'missing' }))).toEqual([]);
  });

  it('searches and selects an available copy', () => {
    flushLists([], [reservation()]);
    page.alternarSelector(reservation());
    expect(page.selectorAbierto).toBe(10);
    page.busquedaEjemplar[10] = 'e-1';
    expect(page.ejemplaresFiltrados(reservation())).toEqual(['E-1']);
    page.busquedaEjemplar[10] = 'sin resultados';
    expect(page.ejemplaresFiltrados(reservation())).toEqual([]);
    page.seleccionarEjemplar(reservation(), 'E-1');
    expect(page.ejemplaresSeleccionados[10]).toBe('E-1');
    expect(page.selectorAbierto).toBeNull();
    page.alternarSelector(reservation({ libroId: 'missing' }));
    expect(page.selectorAbierto).toBeNull();
  });

  it('reports a load failure', () => {
    ctrl.expectOne(r => r.url === `${API}/reservations/`).flush([]);
    ctrl.expectOne(`${API}/books/`).flush([]);
    ctrl.expectOne(`${API}/loans/`).flush('x', { status: 500, statusText: 'err' });
    expect(page.mensaje).toBe('No se pudieron cargar las reservas y préstamos.');
  });

  it('registers a pickup, shows the message and reloads', () => {
    flushLists([], [reservation()]);
    page.ejemplaresSeleccionados[10] = 'E-1';
    page.retirar(reservation());
    const req = ctrl.expectOne(`${API}/reservations/10/retirar/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ejemplarId: 'E-1' });
    req.flush(reservation({ estado: 'finalizada', prestamoId: 5 }));
    expect(page.mensaje).toContain('Retiro registrado');
    flushLists([loan({ id: 5 })], [reservation({ estado: 'finalizada', prestamoId: 5 })]);
    expect(page.reservas[0].estado).toBe('finalizada');
  });

  it('shows the API business error (e.g. no copies) instead of a generic one', () => {
    flushLists([], [reservation()]);
    page.ejemplaresSeleccionados[10] = 'E-1';
    page.retirar(reservation());
    ctrl.expectOne(`${API}/reservations/10/retirar/`).flush({ detail: 'No hay ejemplares disponibles.' }, { status: 400, statusText: 'Bad Request' });
    expect(page.mensaje).toBe('No hay ejemplares disponibles.');
    flushLists([], [reservation()]);
  });

  it('cancels a reservation and returns a book via their own actions', () => {
    flushLists([], []);
    const calls: [() => void, string][] = [
      [() => page.cancelar(10), `${API}/reservations/10/cancelar/`],
      [() => page.devolver(5), `${API}/loans/5/devolver/`],
    ];
    for (const [act, url] of calls) {
      act();
      const req = ctrl.expectOne(url);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
      flushLists([], []);
    }
  });

  it('ignores a second action while another is in progress', () => {
    flushLists([], []);
    page.devolver(5); page.devolver(5);
    ctrl.expectOne(`${API}/loans/5/devolver/`).flush({});
    flushLists([], []);
  });
});

describe('UserHistory screen', () => {
  it('cancels a reservation in place and reports failures', () => {
    TestBed.configureTestingModule({ imports: [UserHistory], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(UserHistory).componentInstance;
    page.reservas = [reservation({ id: 10 }), reservation({ id: 11 })];

    page.cancelarReserva(10);
    ctrl.expectOne(`${API}/reservations/10/cancelar/`).flush(reservation({ id: 10, estado: 'cancelada' }));
    expect(page.reservas.map(r => r.estado)).toEqual(['cancelada', 'activa']);
    expect(page.mensajeReserva).toBe('Reserva cancelada.');

    page.cancelarReserva(11);
    ctrl.expectOne(`${API}/reservations/11/cancelar/`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(page.reservas[1].estado).toBe('activa');
    expect(page.mensajeReserva).toContain('No se pudo cancelar');
    expect(page.cancelando).toBe(false);
  });

  it('counts current and overdue loans', () => {
    TestBed.configureTestingModule({ imports: [UserHistory], providers: testProviders });
    const page = TestBed.createComponent(UserHistory).componentInstance;
    page.prestamos = [loan({ estado: 'vigente' }), loan({ estado: 'vencido' }), loan({ estado: 'vencido' }), loan({ estado: 'devuelto' })];
    expect(page.activos).toBe(1);
    expect(page.vencidos).toBe(2);
    expect(page.esVencido(page.prestamos[1])).toBe(true);
    expect(page.label('devuelto')).toBe('Devuelto');
  });
});
