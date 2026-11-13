import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../models/book.model';
import { LoanService } from '../../../core/services/loan.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Loan } from '../../../models/loan.model';
import { reservationConflicts, ReservationConflict } from './reservation-conflicts';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-loan-management',
  standalone: true,
  imports: [Header, CommonModule, FormsModule, RouterLink],
  templateUrl: './loan-management.html',
  styleUrl: './loan-management.scss',
})
export class LoanManagement implements OnInit {
  @Input() embedded = false;
  prestamos: Loan[] = [];
  reservas: Reservation[] = [];
  libros: Book[] = [];
  ejemplaresSeleccionados: Record<number, string> = {};
  busquedaEjemplar: Record<number, string> = {};
  selectorAbierto: number | null = null;
  mensaje = '';
  ocupado = false;
  cargado = false;
  errorCarga = false;
  errorOperacion = false;
  vista: 'reservas' | 'devoluciones' = 'reservas';
  busqueda = '';
  conflictos: Record<number, ReservationConflict> = {};

  constructor(private loanService: LoanService, private reservationService: ReservationService, private bookService: BookService, private changeDetector: ChangeDetectorRef) {}

  // Esta vista es solo para lo que espera una respuesta; lo ya respondido se consulta en el archivo.
  get reservasPendientes(): Reservation[] {
    return this.reservas.filter(r => r.estado === 'activa' || r.estado === 'vencida')
      .sort((a, b) => a.fechaReserva.localeCompare(b.fechaReserva) || a.id - b.id);
  }
  get prestamosAbiertos(): Loan[] { return this.prestamos.filter(p => p.estado === 'vigente' || p.estado === 'vencido'); }
  get prestamosVencidos(): number { return this.prestamosAbiertos.filter(p => p.estado === 'vencido').length; }
  get reservasFiltradas(): Reservation[] {
    return this.reservasPendientes.filter(r => this.coincide([r.libroTitulo, r.estudianteNombre, r.estudianteId, String(r.id)]));
  }
  get prestamosFiltrados(): Loan[] {
    return this.prestamosAbiertos.filter(p => this.coincide([p.libroTitulo, p.estudianteNombre, p.estudianteId, p.estudianteLegajo, p.ejemplarId, String(p.id)]))
      .sort((a, b) => Number(b.estado === 'vencido') - Number(a.estado === 'vencido') || (a.fechaVencimiento ?? '9999').localeCompare(b.fechaVencimiento ?? '9999'));
  }

  private coincide(campos: (string | undefined)[]): boolean {
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const busqueda = normalizar(this.busqueda.trim());
    return campos.some(campo => normalizar(campo ?? '').includes(busqueda));
  }

  ngOnInit() { this.cargar(); }

  cargar() {
    if (this.ocupado) return;
    this.ocupado = true;
    if (this.errorCarga) { this.mensaje = ''; this.errorOperacion = false; }
    this.errorCarga = false;
    forkJoin({ prestamos: this.loanService.getAll(), reservas: this.reservationService.getAll(), libros: this.bookService.getAll() }).subscribe({
      next: ({ prestamos, reservas, libros }) => {
        this.prestamos = prestamos; this.reservas = reservas; this.libros = libros;
        this.conflictos = reservationConflicts(reservas, libros, prestamos);
        this.ejemplaresSeleccionados = {}; this.busquedaEjemplar = {}; this.selectorAbierto = null;
        this.ocupado = false; this.cargado = true;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorCarga = true; this.mensaje = 'No se pudieron cargar las reservas y préstamos.'; this.ocupado = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  disponibles(reserva: Reservation): string[] {
    return (this.libros.find(libro => libro.isbn === reserva.libroId || libro.id === reserva.libroId)?.ejemplares ?? [])
      .filter(ejemplar => ejemplar.estado === 'disponible').map(ejemplar => ejemplar.id);
  }

  ejemplaresFiltrados(reserva: Reservation): string[] {
    const busqueda = (this.busquedaEjemplar[reserva.id] ?? '').trim().toLocaleLowerCase();
    return this.disponibles(reserva).filter(id => id.toLocaleLowerCase().includes(busqueda));
  }

  observacionesEjemplar(reserva: Reservation): string {
    const libro = this.libros.find(l => l.isbn === reserva.libroId || l.id === reserva.libroId);
    return libro?.ejemplares?.find(e => e.id === this.ejemplaresSeleccionados[reserva.id])?.observaciones?.trim() ?? '';
  }

  alternarSelector(reserva: Reservation) {
    if (this.ocupado || !this.disponibles(reserva).length) return;
    this.selectorAbierto = this.selectorAbierto === reserva.id ? null : reserva.id;
    this.busquedaEjemplar[reserva.id] = '';
  }

  seleccionarEjemplar(reserva: Reservation, id: string) {
    this.ejemplaresSeleccionados[reserva.id] = id;
    this.selectorAbierto = null;
  }

  cerrarAlSalir(evento: FocusEvent, contenedor: HTMLElement) {
    if (!contenedor.contains(evento.relatedTarget as Node | null)) this.selectorAbierto = null;
  }

  retirar(reserva: Reservation) {
    const ejemplar = this.ejemplaresSeleccionados[reserva.id];
    if (!this.disponibles(reserva).includes(ejemplar)) return;
    this.ejecutar(this.reservationService.pickUp(reserva.id, ejemplar), 'Retiro registrado. La reserva finalizó y se creó el préstamo.');
  }
  cancelar(id: number) { this.ejecutar(this.reservationService.cancel(id), 'Reserva cancelada.'); }
  devolver(id: number) { this.ejecutar(this.loanService.return_(id), 'Devolución registrada y disponibilidad actualizada.'); }

  private ejecutar(operation: import('rxjs').Observable<unknown>, message: string) {
    if (this.ocupado) return;
    this.ocupado = true;
    this.mensaje = '';
    this.errorOperacion = false;
    operation.subscribe({
      next: () => { this.mensaje = message; this.ocupado = false; this.cargar(); },
      error: err => {
        const detail = err.error?.detail ?? (Array.isArray(err.error) ? err.error.join(' ') : null);
        this.mensaje = typeof detail === 'string' ? detail : 'No se pudo completar la operación. Revisá el estado y la disponibilidad.';
        this.errorOperacion = true;
        this.ocupado = false;
        this.cargar();
      }
    });
  }
}
