import { reservationConflicts } from './reservation-conflicts';
import { Book } from '../../../models/book.model';
import { Reservation } from '../../../models/reservation.model';
import { Loan } from '../../../models/loan.model';
const book = (count: number): Book => ({ id: 'b', titulo: 'Libro', autor: '', categoria: '', ejemplares: Array.from({length:count}, (_,i) => ({id:String(i), estado:'disponible', isbn:'b', observaciones:''})) });
const reservation = (id: number, start: string, end: string): Reservation => ({ id, libroId:'b', libroTitulo:'Libro', estudianteId:String(id), estudianteNombre:'Lector', fechaReserva:'2026-11-01', fechaRetiro:start, fechaVencimiento:end, estado:'activa', prestamoId:null, bibliotecarioId:null });
const loan: Loan = { id:1, estudianteId:'u', libroId:'b', fechaInicio:'2026-11-01', fechaVencimiento:'2026-11-09', fechaDevolucion:null, estado:'vigente' };
describe('Capacity conflicts', () => {
  it('highlights overlapping reservations and suggests the first request', () => {
    const result = reservationConflicts([reservation(2,'2026-11-05','2026-11-10'), reservation(1,'2026-11-01','2026-11-07')], [book(1)], []);
    expect(result[2]).toEqual({demanda:2,capacidad:1,primeraSolicitud:1,reservas:[1],prestamos:[]});
    expect(result[1]).toBeTruthy();
  });
  it('does not flag nonoverlapping dates or enough capacity, even with a long spanning reservation', () => {
    expect(reservationConflicts([reservation(1,'2026-11-01','2026-11-03'),reservation(2,'2026-11-04','2026-11-06')], [book(1)], [])).toEqual({});
    expect(reservationConflicts([reservation(1,'2026-11-01','2026-11-10'),reservation(2,'2026-11-01','2026-11-03'),reservation(3,'2026-11-04','2026-11-06')], [book(2)], [])).toEqual({});
  });
  it('includes shared endpoint days and excludes cancelled reservations and other books', () => {
    const rows = [reservation(1,'2026-11-01','2026-11-03'),reservation(2,'2026-11-03','2026-11-06')];
    expect(Object.keys(reservationConflicts(rows,[book(1)],[]))).toHaveLength(2);
    expect(reservationConflicts([rows[0], {...rows[1],estado:'cancelada'}],[book(1)],[])).toEqual({});
    expect(reservationConflicts([rows[0], {...rows[1],libroId:'otro'}],[book(1)],[])).toEqual({});
  });
  it('accounts for active loans, their due dates, and unreturned overdue copies', () => {
    const r = reservation(1,'2026-11-10','2026-11-17');
    expect(reservationConflicts([r],[book(1)],[loan])).toEqual({});
    expect(reservationConflicts([r],[book(1)],[{...loan,estado:'vencido'}])[1]).toBeTruthy();
    expect(reservationConflicts([r],[book(1)],[{...loan,estado:'devuelto'}])).toEqual({});
  });
  it('replaces the approved reservation with its loan reference', () => {
    const first = reservation(2,'2026-11-01','2026-11-08');
    const second = reservation(21,'2026-11-03','2026-11-10');
    expect(reservationConflicts([first,second],[book(1)],[])[21].reservas).toEqual([2]);
    const result = reservationConflicts([{...first,estado:'finalizada',prestamoId:1},second],[book(1)],[loan])[21];
    expect(result.reservas).toEqual([]);
    expect(result.prestamos).toEqual([1]);
  });
});
