import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Header } from '../../../shared/components/header/header';
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
  mensaje = '';
  ocupado = false;

  constructor(private loanService: LoanService, private reservationService: ReservationService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.ocupado = true;
    forkJoin({ prestamos: this.loanService.getAll(), reservas: this.reservationService.getAll() }).subscribe({
      next: ({ prestamos, reservas }) => { this.prestamos = prestamos; this.reservas = reservas; this.ocupado = false; },
      error: () => { this.mensaje = 'No se pudieron cargar las reservas y préstamos.'; this.ocupado = false; }
    });
  }

  retirar(id: number) { this.ejecutar(this.reservationService.pickUp(id), 'Retiro registrado. La reserva finalizó y se creó el préstamo.'); }
  cancelar(id: number) { this.ejecutar(this.reservationService.cancel(id), 'Reserva cancelada.'); }
  priorizar(r: Reservation) { this.ejecutar(this.reservationService.prioritize(r.id, r.prioridad), 'Prioridad actualizada.'); }
  devolver(id: number) { this.ejecutar(this.loanService.return_(id), 'Devolución registrada y disponibilidad actualizada.'); }
  aprobarExtension(id: number) { this.ejecutar(this.loanService.approveExtension(id), 'Renovación aprobada: siete días adicionales.'); }
  denegarExtension(id: number) { this.ejecutar(this.loanService.denyExtension(id), 'Renovación denegada.'); }

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
