import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AdminActivity } from './admin-activity';
import { AdminAction } from '../../../models/admin-action.model';
import { testProviders } from '../../../testing/test-providers';
import { environment } from '../../../../environments/environment';
const API = `${environment.apiUrl}/admin-actions/`;
const action = (over: Partial<AdminAction> = {}): AdminAction => ({ id:1, fecha:'2026-11-13T01:00:00Z', tipoAccion:'retiro_reserva', descripcion:'Entregó el ejemplar E-1 de la reserva #6.', bibliotecarioId:'12473', bibliotecarioNombre:'María', estudianteId:'13885', estudianteNombre:'Pedro', libroId:'9', libroTitulo:'Álgebra', ejemplarId:'E-1', reservaId:6, prestamoId:3, ...over });
describe('Actividad administrativa', () => {
  let fixture: ComponentFixture<AdminActivity>;
  let page: AdminActivity;
  let ctrl: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({imports:[AdminActivity],providers:testProviders});
    fixture = TestBed.createComponent(AdminActivity);
    page = fixture.componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => ctrl.verify());
  it('loads the audit API, shows operation references and links the reader profile', () => {
    ctrl.expectOne(API).flush([action()]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Creación de préstamo');
    expect(root.textContent).toContain('Préstamo #3');
    expect(root.textContent).toContain('Reserva #6');
    expect(root.textContent).toContain('María');
    expect(root.querySelector('a[href="/user-profile/13885"]')).toBeTruthy();
    expect(root.textContent).toContain('12/11/2026 · 22:00');
  });
  it('combines type, librarian, inclusive local dates and accent-insensitive search', () => {
    ctrl.expectOne(API).flush([action(),action({id:2,fecha:'2026-11-13T12:00:00Z',tipoAccion:'devolucion',bibliotecarioId:'otro'})]);
    page.busqueda='algebra'; page.desde='2026-11-12'; page.hasta='2026-11-12'; page.tipo='retiro_reserva'; page.responsable='12473';
    expect(page.filtradas.map(a=>a.id)).toEqual([1]);
    page.desde='2026-11-14';
    expect(page.fechasInvalidas).toBe(true);
    expect(page.filtradas).toEqual([]);
    page.limpiar();
    expect(page.filtradas.map(a=>a.id)).toEqual([2,1]);
  });
  it('paginates and resets the page when filters change', () => {
    ctrl.expectOne(API).flush(Array.from({length:21},(_,i)=>action({id:i+1})));
    expect(page.visibles).toHaveLength(20);
    page.pagina=2;
    expect(page.visibles).toHaveLength(1);
    page.busqueda='no existe'; page.filtrar();
    expect(page.pagina).toBe(1);
    expect(page.visibles).toEqual([]);
  });
  it('reports a failed load and retries without displaying a false empty state', () => {
    ctrl.expectOne(API).flush({}, {status:500,statusText:'Error'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar');
    expect(fixture.nativeElement.textContent).not.toContain('Todavía no hay actividad');
    page.cargar();
    ctrl.expectOne(API).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay actividad');
  });
});
