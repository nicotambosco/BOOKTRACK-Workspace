import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../models/book.model';
import { LoanService } from '../../../core/services/loan.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-loan-management',
  standalone: true,
  imports: [Header, CommonModule, FormsModule],
  templateUrl: './loan-management.html',
  styleUrl: './loan-management.scss',
})
export class LoanManagement implements OnInit {
  prestamos: Loan[] = [];
  reservas: Reservation[] = [];
  libros: Book[] = [];
  ejemplaresSeleccionados: Record<number, string> = {};
  busquedaEjemplar: Record<number, string> = {};
  selectorAbierto: number | null = null;
  mensaje = '';
  ocupado = false;

  constructor(private loanService: LoanService, private reservationService: ReservationService, private bookService: BookService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.ocupado = true;
    forkJoin({ prestamos: this.loanService.getAll(), reservas: this.reservationService.getAll(), libros: this.bookService.getAll() }).subscribe({
      next: ({ prestamos, reservas, libros }) => { this.prestamos = prestamos; this.reservas = reservas; this.libros = libros; this.ejemplaresSeleccionados = {}; this.busquedaEjemplar = {}; this.selectorAbierto = null; this.ocupado = false; },
      error: () => { this.mensaje = 'No se pudieron cargar las reservas y préstamos.'; this.ocupado = false; }
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
    operation.subscribe({
      next: () => { this.mensaje = message; this.cargar(); },
      error: err => {
        const detail = err.error?.detail ?? (Array.isArray(err.error) ? err.error.join(' ') : null);
        this.mensaje = typeof detail === 'string' ? detail : 'No se pudo completar la operación. Revisá el estado y la disponibilidad.';
        this.cargar();
      }
    });
  }
}
