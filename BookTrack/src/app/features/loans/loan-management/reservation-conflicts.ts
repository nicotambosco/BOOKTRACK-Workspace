import { Book } from '../../../models/book.model';
import { Loan } from '../../../models/loan.model';
import { Reservation } from '../../../models/reservation.model';

export interface ReservationConflict {
  demanda: number;
  capacidad: number;
  primeraSolicitud: number;
  reservas: number[];
  prestamos: number[];
}

// Los extremos se incluyen: dos períodos que comparten un día se superponen.
export function reservationConflicts(reservas: Reservation[], libros: Book[], prestamos: Loan[]): Record<number, ReservationConflict> {
  const conflictos: Record<number, ReservationConflict> = {};
  const pendientes = reservas.filter(r => r.estado === 'activa' || r.estado === 'vencida')
    .sort((a, b) => a.fechaReserva.localeCompare(b.fechaReserva) || a.id - b.id);
  for (const reserva of pendientes) {
    const libro = libros.find(l => l.isbn === reserva.libroId || l.id === reserva.libroId);
    if (!libro) continue;
    const capacidad = (libro.ejemplares ?? []).filter(e => e.estado !== 'baja').length;
    const otras = pendientes.filter(r => r.libroId === reserva.libroId);
    const abiertos = prestamos.filter(p => p.libroId === reserva.libroId && (p.estado === 'vigente' || p.estado === 'vencido'));
    // Basta evaluar los inicios dentro del período: solo allí puede aumentar la demanda.
    const fechas = [reserva.fechaRetiro, ...otras.map(r => r.fechaRetiro), ...abiertos.map(p => p.fechaInicio)]
      .filter(f => f >= reserva.fechaRetiro && f <= reserva.fechaVencimiento);
    for (const fecha of fechas) {
      const simultaneas = otras.filter(r => r.fechaRetiro <= fecha && r.fechaVencimiento >= fecha);
      // Sin devolución efectiva, un préstamo vencido sigue ocupando su ejemplar.
      const ocupados = abiertos.filter(p => p.fechaInicio <= fecha && (p.estado === 'vencido' || !p.fechaVencimiento || p.fechaVencimiento >= fecha));
      const demanda = simultaneas.length + ocupados.length;
      if (demanda > 1 && demanda > capacidad) {
        const anterior = conflictos[reserva.id];
        const ids = [...new Set([...(anterior?.reservas ?? []), ...simultaneas.filter(r => r.id !== reserva.id).map(r => r.id)])];
        const prestamosIds = [...new Set([...(anterior?.prestamos ?? []), ...ocupados.flatMap(p => p.id == null ? [] : [p.id])])];
        conflictos[reserva.id] = anterior && anterior.demanda >= demanda
          ? { ...anterior, reservas: ids, prestamos: prestamosIds }
          : { demanda, capacidad, primeraSolicitud: simultaneas[0].id, reservas: ids, prestamos: prestamosIds };
      }
    }
  }
  return conflictos;
}
