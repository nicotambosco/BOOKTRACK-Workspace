import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { UserLoans } from './user-loans';
import { Loan } from '../../../models/loan.model';
import { environment } from '../../../../environments/environment';
import { testProviders } from '../../../testing/test-providers';

const API = environment.apiUrl;
const loan = (o: Partial<Loan> = {}): Loan => ({ id: 1, estudianteId: '13885', libroId: '9781', libroTitulo: 'Álgebra', ejemplarId: 'E-1',
  fechaInicio: '2026-11-01', fechaVencimiento: '2026-11-08', fechaDevolucion: null, estado: 'vigente', ...o });

describe('UserLoans screen (history of one user, for the librarian)', () => {
  const create = () => {
    TestBed.configureTestingModule({
      imports: [UserLoans],
      providers: [...testProviders, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ legajo: '13885' }) } } }],
    });
    const page = TestBed.createComponent(UserLoans).componentInstance;
    const ctrl = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    return { page, ctrl };
  };

  it('shows only the loans of that legajo', () => {
    const { page, ctrl } = create();
    ctrl.expectOne(`${API}/users/13885/`).flush({ id: '13885', nombreApellido: 'Pedro Rodriguez', email: '', categoria: 'usuario' });
    ctrl.expectOne(`${API}/loans/`).flush([loan(), loan({ id: 2, estudianteId: '99999' }), loan({ id: 3, estado: 'devuelto' })]);
    expect(page.usuario?.nombreApellido).toBe('Pedro Rodriguez');
    expect(page.prestamos.map(p => p.id)).toEqual([1, 3]);
    expect(page.cargando).toBe(false);
    ctrl.verify();
  });

  it('warns when the user or the history cannot be loaded and goes back to the list', () => {
    const { page, ctrl } = create();
    ctrl.expectOne(`${API}/users/13885/`).flush({}, { status: 404, statusText: 'Not Found' });
    ctrl.expectOne(`${API}/loans/`).flush({}, { status: 500, statusText: 'err' });
    expect(page.error).not.toBe('');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.volver();
    expect(navigate).toHaveBeenCalledWith(['/user-management']);
  });
});
