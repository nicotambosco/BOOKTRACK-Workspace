import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { LoanArchive } from './loan-archive';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;
const reservation = (o: Partial<Reservation> = {}): Reservation => ({ id: 1, estudianteId: '13885', estudianteNombre: 'Pedro', libroId: '9781',
  libroTitulo: 'Álgebra', fechaReserva: '2026-11-01', fechaRetiro: '2026-11-02', fechaVencimiento: '2026-11-09', estado: 'activa',
  prestamoId: null, bibliotecarioId: null, ...o });

describe('LoanArchive screen (answered reservations)', () => {
  const load = (reservas: Reservation[], prestamos: Loan[] = []) => {
    TestBed.configureTestingModule({ imports: [LoanArchive], providers: testProviders });
    const page = TestBed.createComponent(LoanArchive).componentInstance;
    const ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    ctrl.expectOne(`${API}/loans/`).flush(prestamos);
    ctrl.expectOne(`${API}/books/`).flush([]);
    ctrl.expectOne(r => r.url === `${API}/reservations/`).flush(reservas);
    ctrl.verify();
    return page;
  };

  it('archives approved, rejected, cancelled and expired reservations but not the active ones', () => {
    const page = load([
      reservation({ id: 1 }),
      reservation({ id: 2, estado: 'finalizada', prestamoId: 7, bibliotecarioId: '12473' }),
      reservation({ id: 3, estado: 'cancelada', bibliotecarioId: '12473' }),
      reservation({ id: 4, estado: 'cancelada' }),
      reservation({ id: 5, estado: 'vencida' })]);
    expect(page.reservasRespondidas.map(r => r.id)).toEqual([2, 3, 4, 5]);
    expect(page.reservasRespondidas.map(r => page.respuesta(r))).toEqual(['Aprobada', 'Rechazada', 'Cancelada por el usuario', 'Vencida']);
  });

  it('lists loans and answered reservations in one table, newest first, and filters across both', () => {
    const prestamo = (o: Partial<Loan> = {}): Loan => ({ id: 7, estudianteId: '13885', estudianteLegajo: '13885', estudianteNombre: 'Pedro', libroId: '9781',
      libroTitulo: 'Álgebra', ejemplarId: 'E-1', fechaInicio: '2026-11-05', fechaVencimiento: '2026-11-12', fechaDevolucion: null, estado: 'vigente', ...o });
    const page = load([
      reservation({ id: 1 }),
      reservation({ id: 2, estado: 'finalizada', prestamoId: 7, fechaReserva: '2026-11-04' }),
      reservation({ id: 3, estado: 'cancelada', fechaReserva: '2026-11-10', bibliotecarioId: '12473' })],
      [prestamo(), prestamo({ id: 8, estado: 'devuelto', fechaInicio: '2026-11-01', fechaDevolucion: '2026-11-03', ejemplarId: 'E-2' })]);
    expect(page.filtrados.map(f => f.clave)).toEqual(['reserva-3', 'prestamo-7', 'reserva-2', 'prestamo-8']);
    expect(page.filtrados.map(f => f.tipo)).toEqual(['Reserva', 'Préstamo', 'Reserva', 'Préstamo']);
    expect(page.filtrados.find(f => f.clave === 'reserva-2')!.ejemplar).toBe('E-1');  // el de su préstamo
    page.filtroEstado = 'cancelada'; page.filtrar();
    expect(page.filtrados.map(f => f.etiqueta)).toEqual(['Rechazada']);
    page.filtroEstado = 'devuelto'; page.filtrar();
    expect(page.filtrados.map(f => f.clave)).toEqual(['prestamo-8']);
  });

  it('only sends loan states to the server export', () => {
    const page = load([]);
    const ctrl = TestBed.inject(HttpTestingController);
    URL.createObjectURL = vi.fn().mockReturnValue('blob:x');
    page.filtroEstado = 'finalizada';
    page.exportPDF();
    expect(ctrl.expectOne(`${API}/loans/export/pdf/`).request.params.has('estado')).toBe(false);
    page.filtroEstado = 'vencido';
    page.exportExcel();
    expect(ctrl.expectOne(r => r.url === `${API}/loans/export/excel/`).request.params.get('estado')).toBe('vencido');
  });
});
