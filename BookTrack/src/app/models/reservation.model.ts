export interface Reservation {
  id: number;
  estudianteId: string;
  estudianteNombre: string;
  libroId: string;
  libroTitulo: string;
  fechaReserva: string;
  fechaRetiro: string;
  fechaVencimiento: string;
  estado: 'activa' | 'cancelada' | 'vencida' | 'finalizada';
  prestamoId: number | null;
  bibliotecarioId: string | null;
}
