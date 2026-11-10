import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { LoanManagement } from './loan-management';
import { LoanExtension } from '../loan-extension/loan-extension';
import { UserHistory } from '../user-history/user-history';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;
const loan = (o: Partial<Loan> = {}): Loan => ({ id: 1, estudianteId: 3, libroId: 9, tipoPrestamo: 'normal', fechaInicio: '2026-11-01',
  fechaVencimiento: '2026-11-08', fechaDevolucion: null, estado: 'vigente', extensionPendiente: false, ...o });
const reservation = (o: Partial<Reservation> = {}): Reservation => ({ id: 10, codigoReserva: 'abc', estudianteId: 3, estudianteNombre: 'Pedro',
  libroId: 9, libroTitulo: 'Álgebra', fechaReserva: '2026-11-01', fechaVencimiento: '2026-11-10', fechaDevolucionPrevista: '2026-11-17',
  prioridad: 0, estado: 'activa', prestamoId: null, bibliotecarioId: null, ...o });

describe('LoanManagement screen (librarian)', () => {
  let page: LoanManagement;
  let ctrl: HttpTestingController;

  const flushLists = (loans: Loan[], reservations: Reservation[]) => {
    ctrl.expectOne(`${API}/loans/`).flush(loans);
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

  it('reports a load failure', () => {
    ctrl.expectOne(r => r.url === `${API}/reservations/`).flush([]);
    ctrl.expectOne(`${API}/loans/`).flush('x', { status: 500, statusText: 'err' });
    expect(page.mensaje).toBe('No se pudieron cargar las reservas y préstamos.');
  });

  it('registers a pickup, shows the message and reloads', () => {
    flushLists([], [reservation()]);
    page.retirar(10);
    const req = ctrl.expectOne(`${API}/reservations/10/retirar/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(reservation({ estado: 'finalizada', prestamoId: 5 }));
    expect(page.mensaje).toContain('Retiro registrado');
    flushLists([loan({ id: 5 })], [reservation({ estado: 'finalizada', prestamoId: 5 })]);
    expect(page.reservas[0].estado).toBe('finalizada');
  });

  it('shows the API business error (e.g. no copies) instead of a generic one', () => {
    flushLists([], [reservation()]);
    page.retirar(10);
    ctrl.expectOne(`${API}/reservations/10/retirar/`).flush({ detail: 'No hay ejemplares disponibles.' }, { status: 400, statusText: 'Bad Request' });
    expect(page.mensaje).toBe('No hay ejemplares disponibles.');
    flushLists([], [reservation()]);
  });

  it('cancels a reservation, sets priority, returns a book and resolves renewals via their own actions', () => {
    flushLists([], []);
    const calls: [() => void, string][] = [
      [() => page.cancelar(10), `${API}/reservations/10/cancelar/`],
      [() => page.priorizar(reservation({ prioridad: 4 })), `${API}/reservations/10/priorizar/`],
      [() => page.devolver(5), `${API}/loans/5/devolver/`],
      [() => page.aprobarExtension(5), `${API}/loans/5/aprobar-extension/`],
      [() => page.denegarExtension(5), `${API}/loans/5/denegar-extension/`],
    ];
    for (const [act, url] of calls) {
      act();
      const req = ctrl.expectOne(url);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
      flushLists([], []);
    }
  });

  it('sends the new priority in the body', () => {
    flushLists([], []);
    page.priorizar(reservation({ prioridad: 4 }));
    const req = ctrl.expectOne(`${API}/reservations/10/priorizar/`);
    expect(req.request.body).toEqual({ prioridad: 4 });
    req.flush({});
    flushLists([], []);
  });

  it('ignores a second action while another is in progress', () => {
    flushLists([], []);
    page.devolver(5); page.devolver(5);
    ctrl.expectOne(`${API}/loans/5/devolver/`).flush({});
    flushLists([], []);
  });
});

describe('LoanExtension screen (user asks for a renewal)', () => {
  it('only lists current loans and sends the renewal request', () => {
    TestBed.configureTestingModule({ imports: [LoanExtension], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(LoanExtension).componentInstance;
    page.ngOnInit();
    ctrl.expectOne(`${API}/loans/`).flush([loan({ id: 1 }), loan({ id: 2, estado: 'devuelto' }), loan({ id: 3, estado: 'vencido' })]);
    ctrl.expectOne(`${API}/books/`).flush([]);
    expect(page.prestamos.map(p => p.id)).toEqual([1]);

    page.confirmar();
    ctrl.expectNone(`${API}/loans/1/solicitar-extension/`);
    page.seleccionar(1); page.confirmar();
    ctrl.expectOne(`${API}/loans/1/solicitar-extension/`).flush(loan({ id: 1, extensionPendiente: true }));
    expect(page.modal).toBe(true);
    expect(page.prestamos[0].extensionPendiente).toBe(true);
    ctrl.verify();
  });

  it('informs the user when the API refuses the renewal', () => {
    TestBed.configureTestingModule({ imports: [LoanExtension], providers: testProviders });
    const ctrl = TestBed.inject(HttpTestingController);
    const page = TestBed.createComponent(LoanExtension).componentInstance;
    page.seleccionar(1); page.confirmar();
    ctrl.expectOne(`${API}/loans/1/solicitar-extension/`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(page.modalMsg).toBe('No se pudo enviar la solicitud de extensión.');
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
