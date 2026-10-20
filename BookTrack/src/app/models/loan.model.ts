export interface Loan {
  id?: number;
  estudianteId: number;
  estudianteLegajo?: string;
  estudianteNombre?: string;
  libroId: number;
  libroTitulo?: string;
  tipoPrestamo: string;
  fechaInicio: string;
  fechaVencimiento: string | null;
  fechaDevolucion: string | null;
  estado: 'vigente' | 'vencido' | 'devuelto';
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
