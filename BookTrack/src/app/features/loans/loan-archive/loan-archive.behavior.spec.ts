import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { LoanArchive } from './loan-archive';
import { Loan } from '../../../models/loan.model';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;
const prestamo = (o: Partial<Loan> = {}): Loan => ({ id: 7, estudianteId: '13885', estudianteLegajo: '13885', estudianteNombre: 'Pedro', libroId: '9781', libroTitulo: 'Álgebra', ejemplarId: 'E-1', fechaInicio: '2026-11-05', fechaVencimiento: '2026-11-12', fechaDevolucion: null, estado: 'vigente', ...o });

describe('Archivo de préstamos', () => {
  it('preserves the returned state while identifying late returns in archive rows', () => {
    TestBed.configureTestingModule({imports:[LoanArchive],providers:testProviders});
    const page = TestBed.createComponent(LoanArchive).componentInstance;
    const ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    ctrl.expectOne(`${API}/loans/`).flush([
      prestamo({id:9,estado:'devuelto',fechaDevolucion:'2026-11-13'}),
      prestamo({id:10,estado:'devuelto',fechaDevolucion:'2026-11-12'})
    ]);
    ctrl.expectOne(`${API}/books/`).flush([]);
    expect(page.filtrados[0].etiqueta).toBe('Devuelto (vencido)');
    expect(page.filtrados[0].devolucionTardia).toBe(true);
    expect(page.filtrados[0].estado).toBe('devuelto');
    expect(page.filtrados[1].etiqueta).toBe('Devuelto');
    ctrl.verify();
  });

  it('shows only returned loans and exports only that state', () => {
    TestBed.configureTestingModule({ imports: [LoanArchive], providers: testProviders });
    const page = TestBed.createComponent(LoanArchive).componentInstance;
    const ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    ctrl.expectOne(`${API}/loans/`).flush([prestamo(), prestamo({ id: 8, estado: 'vencido' }), prestamo({ id: 9, estado: 'devuelto', fechaDevolucion: '2026-11-10' })]);
    ctrl.expectOne(`${API}/books/`).flush([]);
    expect(page.filtrados.map(f => f.clave)).toEqual(['prestamo-9']);
    page.exportPDF();
    expect(ctrl.expectOne(r => r.url === `${API}/loans/export/pdf/`).request.params.get('estado')).toBe('devuelto');
    page.exportExcel();
    expect(ctrl.expectOne(r => r.url === `${API}/loans/export/excel/`).request.params.get('estado')).toBe('devuelto');
    ctrl.verify();
  });
});
