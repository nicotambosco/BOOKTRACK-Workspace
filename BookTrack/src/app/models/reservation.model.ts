export interface Reservation {
  id: number;
  codigoReserva: string;
  estudianteId: string;
  estudianteNombre: string;
  libroId: string;
  libroTitulo: string;
  fechaReserva: string;
  fechaVencimiento: string;
  fechaDevolucionPrevista: string | null;
  prioridad: number;
  estado: 'activa' | 'cancelada' | 'vencida' | 'finalizada';
  prestamoId: number | null;
  bibliotecarioId: string | null;
}
