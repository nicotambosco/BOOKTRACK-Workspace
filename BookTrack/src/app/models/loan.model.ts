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
  devolucionTardia?: boolean;
}

export function esDevolucionTardia(prestamo: Loan): boolean {
  return prestamo.estado === 'devuelto' && (prestamo.devolucionTardia ??
    !!(prestamo.fechaDevolucion && prestamo.fechaVencimiento && prestamo.fechaDevolucion > prestamo.fechaVencimiento));
}

export function etiquetaPrestamo(prestamo: Loan): string {
  return esDevolucionTardia(prestamo) ? 'Devuelto (vencido)' : { vigente: 'Vigente', vencido: 'Vencido', devuelto: 'Devuelto' }[prestamo.estado];
}

export interface LoanTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}
