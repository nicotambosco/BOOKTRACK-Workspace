import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { HomeAdmin } from './home-admin';
import { testProviders } from '../../../testing/test-providers';
import { environment } from '../../../../environments/environment';
import { Reservation } from '../../../models/reservation.model';
import { Loan } from '../../../models/loan.model';

const API = environment.apiUrl;
const reserva: Reservation = {
  id: 10, estudianteId: '13885', estudianteNombre: 'Pedro Pérez', libroId: '9', libroTitulo: 'Álgebra',
  fechaReserva: '2026-11-01', fechaRetiro: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), fechaVencimiento: '2026-11-19',
  estado: 'activa', prestamoId: null, bibliotecarioId: null,
};
const prestamo: Loan = {
  id: 5, estudianteId: '13885', estudianteNombre: 'Pedro Pérez', libroId: '9', libroTitulo: 'Álgebra',
  ejemplarId: 'E-1', fechaInicio: '2026-11-01', fechaVencimiento: '2026-11-08', fechaDevolucion: null, estado: 'vencido',
};

describe('HomeAdmin daily workspace', () => {
  let fixture: ComponentFixture<HomeAdmin>;
  let ctrl: HttpTestingController;
  let root: HTMLElement;

  function cargar(reservas: Reservation[] = [reserva], prestamos: Loan[] = []) {
    ctrl.expectOne(`${API}/loans/`).flush(prestamos);
    ctrl.expectOne(`${API}/reservations/`).flush(reservas);
    ctrl.expectOne(`${API}/books/`).flush([{ id: '9', isbn: '9', ejemplares: [{ id: 'E-1', estado: 'disponible', observaciones: 'Tapa dañada.\nPáginas subrayadas.' }, { id: 'E-2', estado: 'prestado' }] }]);
    fixture.detectChanges();
  }
  function click(texto: string) {
    const button = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.includes(texto));
    expect(button, `Botón: ${texto}`).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HomeAdmin], providers: testProviders }).compileComponents();
    fixture = TestBed.createComponent(HomeAdmin);
    ctrl = TestBed.inject(HttpTestingController);
    root = fixture.nativeElement;
    fixture.detectChanges();
  });
  afterEach(() => ctrl.verify());

  it('embeds the queue with one header and groups secondary navigation', () => {
    expect(root.textContent).toContain('Cargando la actividad');
    expect(root.textContent).not.toContain('No hay reservas pendientes');
    cargar();
    expect(root.querySelectorAll('app-header')).toHaveLength(1);
    expect(root.querySelectorAll('.reservation-row')).toHaveLength(1);
    expect(root.querySelector('a[href="/book-add"]')).toBeNull();
    expect(root.querySelector('a[href="/book-management"]')).toBeTruthy();
    expect(root.querySelectorAll('.stat-card strong')[0].textContent).toBe('1');
  });

  it('creates a loan from home only after choosing an available copy and refreshes the queue', () => {
    cargar();
    expect(root.querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(true);
    click('Seleccionar ejemplar');
    expect(root.querySelector('.selector-opciones')!.textContent).not.toContain('E-2');
    click('E-1');
    expect(root.querySelector('.copy-note')!.textContent).toContain('Tapa dañada.');
    expect(root.querySelector('.copy-note')!.textContent).toContain('Páginas subrayadas.');
    click('Crear préstamo');
    const request = ctrl.expectOne(`${API}/reservations/10/retirar/`);
    expect(request.request.body).toEqual({ ejemplarId: 'E-1' });
    expect(root.querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(true);
    request.flush({ ...reserva, estado: 'finalizada', prestamoId: 5 });
    cargar([], [{ ...prestamo, estado: 'vigente' }]);
    expect(root.textContent).toContain('Retiro registrado');
    expect(root.querySelectorAll('.reservation-row')).toHaveLength(0);
    expect(root.querySelectorAll('.stat-card strong')[0].textContent).toBe('0');
    expect(root.querySelectorAll('.stat-card strong')[1].textContent).toBe('1');
  });

  it('allows a future pickup after selecting a copy and links the reader profile', () => {
    cargar([{ ...reserva, fechaRetiro: '2099-01-01', fechaVencimiento: '2099-01-08' }]);
    click('Seleccionar ejemplar');
    click('E-1');
    expect(root.querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(false);
    expect(root.querySelector('.reader-link')!.getAttribute('href')).toBe('/user-profile/13885');
  });

  it('registers a return from the second tab and updates overdue counts', () => {
    cargar([], [prestamo]);
    expect(root.querySelectorAll('.stat-card strong')[2].textContent).toBe('1');
    click('Devoluciones');
    expect(root.querySelector('.badge.overdue')!.textContent).toContain('Vencido');
    click('Registrar devolución');
    ctrl.expectOne(`${API}/loans/5/devolver/`).flush({ ...prestamo, estado: 'devuelto' });
    cargar([], [{ ...prestamo, estado: 'devuelto' }]);
    expect(root.querySelectorAll('.stat-card strong')[2].textContent).toBe('0');
    expect(root.textContent).toContain('Todas las devoluciones al día');
  });

  it('filters without accents and distinguishes no matches from an empty queue', () => {
    cargar();
    const search = root.querySelector<HTMLInputElement>('.panel-tools input')!;
    search.value = 'algebra';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelectorAll('.reservation-row')).toHaveLength(1);
    search.value = 'no existe';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.textContent).toContain('No encontramos coincidencias');
    click('Limpiar búsqueda');
    expect(root.querySelectorAll('.reservation-row')).toHaveLength(1);
  });

  it('shows load failures without claiming that the queue is empty, and allows retry', () => {
    ctrl.expectOne(`${API}/books/`).flush([]);
    ctrl.expectOne(`${API}/loans/`).flush([]);
    ctrl.expectOne(`${API}/reservations/`).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(root.textContent).toContain('No pudimos actualizar');
    expect(root.textContent).not.toContain('No hay reservas pendientes');
    click('Reintentar');
    cargar();
    expect(root.querySelectorAll('.reservation-row')).toHaveLength(1);
    expect(root.textContent).not.toContain('No se pudieron cargar');
  });
});
