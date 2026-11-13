import { Loan, esDevolucionTardia, etiquetaPrestamo } from './loan.model';
const loan: Loan = {id:1,estudianteId:'1',libroId:'9',fechaInicio:'2026-11-01',fechaVencimiento:'2026-11-10',fechaDevolucion:'2026-11-11',estado:'devuelto'};
describe('Historical late returns', () => {
  it('labels a returned loan after its due date without changing its state', () => {
    expect(esDevolucionTardia(loan)).toBe(true);
    expect(etiquetaPrestamo(loan)).toBe('Devuelto (vencido)');
    expect(loan.estado).toBe('devuelto');
  });
  it('does not mark a return on or before the due date as late', () => {
    expect(esDevolucionTardia({...loan,fechaDevolucion:'2026-11-10'})).toBe(false);
    expect(esDevolucionTardia({...loan,fechaDevolucion:'2026-11-09'})).toBe(false);
    expect(etiquetaPrestamo({...loan,fechaDevolucion:'2026-11-10'})).toBe('Devuelto');
  });
  it('does not infer a late return when dates are missing or the loan is still open', () => {
    expect(esDevolucionTardia({...loan,fechaVencimiento:null})).toBe(false);
    expect(esDevolucionTardia({...loan,fechaDevolucion:null})).toBe(false);
    expect(etiquetaPrestamo({...loan,estado:'vencido',fechaDevolucion:null})).toBe('Vencido');
  });
});
