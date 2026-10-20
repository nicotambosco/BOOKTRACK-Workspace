export interface Reservation {
  id: number;
  codigoReserva: string;
  estudianteId: number;
  estudianteNombre: string;
  libroId: number;
  libroTitulo: string;
  fechaReserva: string;
  fechaVencimiento: string;
  fechaDevolucionPrevista: string | null;
  prioridad: number;
  estado: 'activa' | 'cancelada' | 'vencida' | 'finalizada';
  prestamoId: number | null;
  bibliotecarioId: number | null;
}
