import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { LibrarianManagement } from './librarian-management';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { testProviders } from '../../../testing/test-providers';
import { environment } from '../../../../environments/environment';
import { Rol } from '../../../models/user.model';
import { Bibliotecario, Persona } from '../../../models/librarian.model';

const API = environment.apiUrl;
const admin: Persona = { id: 'ADM', legajo: 'ADM', nombreApellido: 'Admin', email: 'admin@x.com', nivel: 2, categoria: 'admin', roles: ['admin'] };
const usuario: Persona = { id: 'U1', legajo: 'U1', nombreApellido: 'Ana Gómez', email: 'ana@x.com', nivel: 0, categoria: 'usuario', roles: ['usuario'] };
const personaLib: Persona = { id: 'B1', legajo: 'B1', nombreApellido: 'Mariana López', email: 'mariana@x.com', nivel: 1, categoria: 'bibliotecario', roles: ['bibliotecario'] };
const bibliotecario: Bibliotecario = { ...personaLib, activo: true, prestamosGestionados: 3, devoluciones: 1, pendientes: 2 };
const inactivo: Bibliotecario = { ...bibliotecario, id: 'B2', legajo: 'B2', nombreApellido: 'Pablo Paz', email: 'pablo@x.com', activo: false, roles: [] };

describe('Gestión unificada de usuarios y roles', () => {
  let fixture: ComponentFixture<LibrarianManagement>;
  let page: LibrarianManagement;
  let ctrl: HttpTestingController;
  let root: HTMLElement;

  function render() {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  function cargar(personas = [admin, usuario, personaLib], bibliotecarios = [bibliotecario, inactivo]) {
    ctrl.expectOne(`${API}/roles/`).flush(personas);
    ctrl.expectOne(`${API}/librarians/`).flush(bibliotecarios);
    ctrl.match(r => r.url.endsWith('/activity/')).forEach(r => r.flush([]));
    render();
  }

  function seleccionar(id: string) {
    page.seleccionar(page.personas.find(p => p.id === id)!);
    ctrl.match(r => r.url.endsWith('/activity/')).forEach(r => r.flush([]));
    render();
  }

  function cambiarSelect(selector: string, value: string) {
    const select = root.querySelector<HTMLSelectElement>(selector)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LibrarianManagement], providers: testProviders }).compileComponents();
    vi.spyOn(TestBed.inject(AuthService), 'getUserId').mockReturnValue('ADM');
    vi.spyOn(TestBed.inject(AuthService), 'getUserRoles').mockReturnValue(['admin']);
    fixture = TestBed.createComponent(LibrarianManagement);
    page = fixture.componentInstance;
    ctrl = TestBed.inject(HttpTestingController);
    root = fixture.nativeElement;
    render();
    // JSDOM no implementa los métodos del diálogo nativo.
    root.querySelectorAll('dialog').forEach(dialog => {
      Object.defineProperty(dialog, 'showModal', { value: vi.fn(() => dialog.open = true) });
      Object.defineProperty(dialog, 'close', { value: vi.fn(() => dialog.open = false) });
    });
    cargar();
  });
  afterEach(() => ctrl.verify());

  it('muestra las cuentas sin duplicados y mantiene los bibliotecarios inactivos', () => {
    expect(root.querySelector('h1')?.textContent).toBe('Usuarios y roles');
    expect(root.querySelector('nav.tabs')).toBeNull();
    expect(page.personas.map(p => p.id)).toEqual(['ADM', 'U1', 'B1', 'B2']);
    expect(root.querySelectorAll('.item')).toHaveLength(4);
    expect(root.textContent).toContain('Inactivo');
    abrirSelector();
    expect(root.querySelectorAll<HTMLInputElement>('.role-option input')[2].disabled).toBe(true);
    expect(root.querySelector('.role-option .lock')).toBeNull();
  });

  it('combina rol y búsqueda por email sin consultar otra vez la API', () => {
    cambiarSelect('.role-filter select', 'bibliotecario');
    ctrl.expectOne(`${API}/librarians/B1/activity/`).flush([]);
    const input = root.querySelector<HTMLInputElement>('.search')!;
    input.value = 'mariana@x.com';
    input.dispatchEvent(new Event('input'));
    render();
    expect(root.querySelectorAll('.item')).toHaveLength(1);
    expect(page.seleccionado?.id).toBe('B1');
    ctrl.expectNone(`${API}/roles/`);
    ctrl.expectNone(`${API}/librarians/`);
    input.value = 'sin coincidencias';
    input.dispatchEvent(new Event('input'));
    render();
    expect(page.seleccionado).toBeNull();
    expect(root.textContent).toContain('No hay usuarios que coincidan');
  });

  function abrirSelector() {
    if (!root.querySelector('.role-dropdown')) {
      root.querySelector<HTMLButtonElement>('.role-trigger')!.click();
      render();
    }
  }

  function marcar(rol: Rol, marcado: boolean) {
    abrirSelector();
    const index = page.roles.findIndex(r => r.clave === rol);
    const checkbox = root.querySelectorAll<HTMLInputElement>('.role-option input')[index];
    checkbox.checked = marcado;
    checkbox.dispatchEvent(new Event('change'));
    render();
  }

  function pedirCambio() { page.pedirCambio(); render(); }

  it('cancela la confirmación sin modificar los roles de la cuenta', () => {
    seleccionar('U1');
    marcar('bibliotecario', true);
    pedirCambio();
    expect(root.querySelector('#titulo-rol')?.textContent).toBe('Actualizar roles');
    expect(page.seleccionado?.roles).toEqual(['usuario']);
    page.cancelarCambio();
    render();
    expect(page.cambio).toBeNull();
    expect(root.querySelector<HTMLDialogElement>('dialog')?.open).toBe(false);
    ctrl.expectNone(r => r.method === 'PATCH');
  });

  it('agrega bibliotecario conservando el rol usuario y su ficha', () => {
    seleccionar('U1');
    marcar('bibliotecario', true);
    pedirCambio();
    page.confirmarCambio();
    const req = ctrl.expectOne(`${API}/roles/U1/`);
    expect(req.request.body).toEqual({ roles: ['usuario', 'bibliotecario'] });
    const promovido: Persona = { ...usuario, roles: ['usuario', 'bibliotecario'] };
    const ficha: Bibliotecario = { ...bibliotecario, ...usuario };
    req.flush(promovido);
    cargar([admin, promovido, personaLib], [bibliotecario, inactivo, ficha]);
    expect(page.seleccionado?.roles).toEqual(['usuario', 'bibliotecario']);
    expect(root.querySelector('#ficha-bibliotecario')).not.toBeNull();
    expect(root.textContent).toContain('Roles de Ana Gómez actualizados.');
    expect(root.querySelectorAll('.item')).toHaveLength(4);
  });

  it('filtra una cuenta con roles admin y bibliotecario por cualquiera de ambos', () => {
    page.cargar();
    const doble: Persona = { ...admin, roles: ['admin', 'bibliotecario'] };
    cargar([doble, usuario, personaLib], [{ ...bibliotecario, ...admin }, bibliotecario, inactivo]);
    expect(page.seleccionado?.id).toBe('ADM');
    expect(root.querySelector('#ficha-bibliotecario')).not.toBeNull();
    cambiarSelect('.role-filter select', 'bibliotecario');
    expect(page.filtrados.map(p => p.id)).toContain('ADM');
    cambiarSelect('.role-filter select', 'admin');
    expect(page.filtrados.map(p => p.id)).toEqual(['ADM']);
  });

  it('solo el administrador fijo puede agregarse roles', () => {
    vi.mocked(TestBed.inject(AuthService).getUserId).mockReturnValue('ADMIN-1');
    const actualizar = vi.spyOn(TestBed.inject(AuthService), 'actualizarToken').mockImplementation(() => {});
    const principal: Persona = { ...admin, id: 'ADMIN-1', legajo: 'ADMIN-1', rolesFijos: ['admin'] };
    page.cargar(); cargar([principal, usuario, personaLib]); seleccionar('ADMIN-1');
    marcar('bibliotecario', true); pedirCambio(); page.confirmarCambio();
    const doble = { ...principal, roles: ['admin', 'bibliotecario'], token: 'nuevo-token' };
    ctrl.expectOne(`${API}/roles/ADMIN-1/`).flush(doble);
    cargar([doble as Persona, usuario, personaLib], [{ ...bibliotecario, ...principal }, bibliotecario]);
    expect(actualizar).toHaveBeenCalledWith('nuevo-token');
    expect(page.seleccionado?.roles).toEqual(['admin', 'bibliotecario']);
  });

  it('mantiene fijo el admin principal aunque la ficha la abra otro administrador', () => {
    const principal: Persona = { ...admin, id: 'ADMIN-1', legajo: 'ADMIN-1', rolesFijos: ['admin'] };
    page.cargar();
    cargar([admin, principal, usuario, personaLib]);
    seleccionar('ADMIN-1');
    abrirSelector();
    const checkbox = root.querySelectorAll<HTMLInputElement>('.role-option input')[2];
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(true);
    expect(root.textContent).toContain('El rol administrador de la cuenta principal es fijo.');
    page.actualizarRoles(['bibliotecario']);
    pedirCambio();
    expect(page.cambio).toBeNull();
    ctrl.expectNone(r => r.method === 'PATCH');
  });

  it('permite quitarse solo roles inferiores y bloquea las autoasignaciones', () => {
    const actualizar = vi.spyOn(TestBed.inject(AuthService), 'actualizarToken').mockImplementation(() => {});
    const doble: Persona = { ...admin, roles: ['bibliotecario', 'admin'], rolesFijos: [] };
    page.cargar(); cargar([doble, usuario, personaLib], [{ ...bibliotecario, ...admin }, bibliotecario]);
    abrirSelector();
    const checks = root.querySelectorAll<HTMLInputElement>('.role-option input');
    expect(checks[0].disabled).toBe(true);
    expect(checks[1].disabled).toBe(false);
    expect(checks[2].disabled).toBe(true);
    expect(root.querySelector('.role-option .lock')).toBeNull();
    page.actualizarRoles(['bibliotecario']); pedirCambio();
    expect(page.cambio).toBeNull();
    page.actualizarRoles(['usuario', 'bibliotecario', 'admin']); pedirCambio();
    expect(page.cambio).toBeNull();
    page.restablecerRoles(); render(); marcar('bibliotecario', false); pedirCambio(); page.confirmarCambio();
    const req = ctrl.expectOne(`${API}/roles/ADM/`);
    expect(req.request.body).toEqual({ roles: ['admin'] });
    req.flush({ ...admin, token: 'token-admin' });
    cargar([admin, usuario, personaLib], [bibliotecario]);
    expect(actualizar).toHaveBeenCalledWith('token-admin');
  });

  it('respeta el filtro después de quitar el rol de la última coincidencia', () => {
    cambiarSelect('.role-filter select', 'usuario');
    marcar('usuario', false);
    marcar('bibliotecario', true);
    pedirCambio();
    page.confirmarCambio();
    const promovido: Persona = { ...usuario, nivel: 1, categoria: 'bibliotecario', roles: ['bibliotecario'] };
    ctrl.expectOne(`${API}/roles/U1/`).flush(promovido);
    cargar([admin, promovido, personaLib]);
    expect(root.querySelectorAll('.item')).toHaveLength(0);
    expect(page.seleccionado).toBeNull();
    expect(page.filtroRol).toBe('usuario');
  });

  it('guarda la ficha y permite desactivar y reactivar sin perder la cuenta', () => {
    seleccionar('B1');
    page.form = { nombreApellido: 'Mariana Pérez', email: 'nuevo@x.com' };
    page.guardar();
    const editado = { ...bibliotecario, ...page.form };
    const req = ctrl.expectOne(`${API}/librarians/B1/`);
    expect(req.request.body).toEqual(page.form);
    req.flush(editado);
    cargar([admin, usuario, { ...personaLib, ...page.form }], [editado, inactivo]);
    page.alternarActivo();
    const desactivado = { ...editado, activo: false, roles: [] };
    ctrl.expectOne(`${API}/librarians/B1/`).flush(desactivado);
    cargar([admin, usuario], [desactivado, inactivo]);
    expect(page.seleccionado?.activo).toBe(false);
    expect(root.querySelector<HTMLFieldSetElement>('.role-field fieldset')?.disabled).toBe(true);
    expect(root.textContent).toContain('Activá la cuenta para asignar roles.');
    page.alternarActivo();
    ctrl.expectOne(`${API}/librarians/B1/`).flush(editado);
    cargar([admin, usuario, personaLib], [editado, inactivo]);
    expect(page.seleccionado?.activo).toBe(true);
  });

  it('muestra errores sin alterar los roles de la cuenta', () => {
    seleccionar('U1');
    marcar('bibliotecario', true);
    pedirCambio();
    page.confirmarCambio();
    ctrl.expectOne(`${API}/roles/U1/`).flush({ detail: 'No se pudieron asignar los roles.' }, { status: 400, statusText: 'Error' });
    render();
    expect(page.seleccionado?.roles).toEqual(['usuario']);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron asignar los roles.');
    expect(page.guardando).toBe(false);
  });

  it('exige al menos un rol antes de abrir la confirmación', () => {
    seleccionar('U1');
    marcar('usuario', false);
    pedirCambio();
    expect(page.cambio).toBeNull();
    expect(root.textContent).toContain('Elegí al menos un rol.');
    ctrl.expectNone(r => r.method === 'PATCH');
  });

  it('conserva la selección del desplegable y permite deshacer los cambios', () => {
    seleccionar('U1');
    abrirSelector();
    const cards = () => root.querySelectorAll<HTMLElement>('.role-option');
    expect(cards()[0].classList.contains('selected')).toBe(true);
    expect(cards()[1].textContent).toContain('Gestionar libros, reservas y devoluciones.');
    marcar('bibliotecario', true);
    expect(cards()[1].classList.contains('selected')).toBe(true);
    expect(cards()[1].querySelector<HTMLInputElement>('input')?.checked).toBe(true);
    expect(root.querySelector('.role-summary')?.textContent).toContain('Cambios sin guardar');
    const undo = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Deshacer')!;
    undo.click();
    render();
    expect(page.rolesElegidos).toEqual(['usuario']);
    abrirSelector();
    expect(cards()[1].classList.contains('selected')).toBe(false);
    expect(root.querySelector('.role-summary')?.textContent).not.toContain('Cambios sin guardar');
    ctrl.expectNone(r => r.method === 'PATCH');
  });

  it('crea bibliotecarios desde la pantalla y los selecciona aunque hubiera filtros', () => {
    cambiarSelect('.role-filter select', 'usuario');
    const nuevo = root.querySelector<HTMLButtonElement>('.search-tools .btn-new')!;
    expect(nuevo.parentElement?.querySelector('.search')).not.toBeNull();
    nuevo.click();
    render();
    page.nuevo = { legajo: 'B3', nombreApellido: 'Zoe Paz', email: 'zoe@x.com', contrasena: 'clave-segura' };
    page.crear();
    const creado = { ...bibliotecario, id: 'B3', ...page.nuevo };
    ctrl.expectOne(`${API}/librarians/`).flush(creado);
    cargar([admin, usuario, personaLib], [bibliotecario, inactivo, creado]);
    expect(page.filtroRol).toBe('');
    expect(page.seleccionado?.id).toBe('B3');
    expect(root.querySelectorAll('dialog[open]')).toHaveLength(0);
  });
  it('cierra sesión con un botón de icono identificado para lectores de pantalla', () => {
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const button = root.querySelector<HTMLButtonElement>('.top-actions .btn-logout')!;
    expect(button.getAttribute('aria-label')).toBe('Cerrar sesión');
    expect(button.getAttribute('title')).toBe('Cerrar sesión');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.textContent?.trim()).toBe('');
    button.click();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

});
