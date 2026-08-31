export interface Loan {
  id?: number;
  estudianteId: number;
  libroId: number;
  tipoPrestamo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'aprobado' | 'denegado' | 'devuelto';
  plazoDeSolicitud?: string;
  extensionPendiente?: boolean;
  extensionEstado?: '' | 'aprobada' | 'denegada';
}

export interface LoanTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}