export interface Loan {
  id?: number;
  estudianteId: string;
  estudianteLegajo?: string;
  estudianteNombre?: string;
  libroId: string;
  ejemplarId?: string;
  bibliotecarioId?: string | null;
  libroTitulo?: string;
  fechaInicio: string;
  fechaVencimiento: string | null;
  fechaDevolucion: string | null;
  estado: 'vigente' | 'vencido' | 'devuelto';
}

export interface LoanTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}
