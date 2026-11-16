import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleOption, RolePicker } from './role-picker';

@Component({
  imports: [RolePicker],
  template: '<app-role-picker [options]="options" [selectedValues]="selected" [lockedValues]="locked" [nonRemovableValues]="protectedValues" [disabled]="disabled" [resetKey]="key" (selectionChange)="selected = $event"/><button class="outside">Otra acción</button>',
})
class Host {
  options: RoleOption[] = [{ clave: 'admin', nombre: 'Administrador', descripcion: 'Gestionar cuentas y roles.' },
    ...Array.from({ length: 40 }, (_, i) => ({ clave: `role-${i}`, nombre: `Catálogo ${i}`, descripcion: `Acceso al catálogo ${i}.` }))];
  selected = ['admin', 'role-0'];
  locked = ['admin'];
  protectedValues: string[] = [];
  disabled = false;
  key = 'first';
}

describe('Selector compacto de roles', () => {
  let fixture: ComponentFixture<Host>;
  let page: Host;
  let root: HTMLElement;
  const trigger = () => root.querySelector<HTMLButtonElement>('.role-trigger')!;
  const opciones = () => Array.from(root.querySelectorAll<HTMLElement>('.role-option'));

  function render() { fixture.changeDetectorRef.markForCheck(); fixture.detectChanges(); }
  function abrir() { trigger().click(); render(); }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    page = fixture.componentInstance;
    root = fixture.nativeElement;
    render();
  });

  it('mantiene un resumen acotado aunque existan muchos roles asignados', () => {
    page.selected = page.options.map(r => r.clave);
    render();
    expect(root.querySelectorAll('.token')).toHaveLength(2);
    expect(trigger().textContent).toContain('+39');
    expect(opciones()).toHaveLength(0);
    abrir();
    expect(opciones()).toHaveLength(41);
    expect(root.querySelector('input[type=search]')).toBeNull();
    expect(root.querySelector('.role-filters')).toBeNull();
  });

  it('selecciona y deselecciona al pulsar la fila, el texto o el checkbox, una sola vez', () => {
    abrir();
    const fila = opciones()[2];
    fila.click();
    render();
    expect(page.selected).toEqual(['admin', 'role-0', 'role-1']);
    fila.querySelector<HTMLElement>('span')!.click();
    render();
    expect(page.selected).toEqual(['admin', 'role-0']);
    fila.querySelector<HTMLInputElement>('input')!.click();
    render();
    expect(page.selected).toEqual(['admin', 'role-0', 'role-1']);
  });

  it('no cierra la lista cuando el foco se pierde temporalmente al pulsar una fila', () => {
    abrir();
    const fila = opciones()[2];
    opciones()[1].querySelector<HTMLInputElement>('input')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    render();
    expect(root.querySelector('.role-dropdown')).not.toBeNull();
    fila.click();
    render();
    expect(page.selected).toContain('role-1');
  });

  it('protege los roles bloqueados y muestra su motivo', () => {
    abrir();
    const admin = opciones()[0];
    const input = admin.querySelector<HTMLInputElement>('input')!;
    expect(input.disabled).toBe(true);
    expect(admin.textContent).toContain('Este acceso es fijo y no se puede quitar.');
    input.click();
    admin.click();
    render();
    expect(page.selected).toEqual(['admin', 'role-0']);
  });

  it('protege los roles propios sin mostrarlos como fijos y permite agregar otros', () => {
    page.protectedValues = ['role-0'];
    render();
    abrir();
    const propio = opciones()[1];
    expect(propio.querySelector<HTMLInputElement>('input')!.disabled).toBe(true);
    expect(propio.querySelector('.lock')).toBeNull();
    propio.click();
    render();
    expect(page.selected).toContain('role-0');
    opciones()[2].click();
    render();
    expect(page.selected).toContain('role-1');
    opciones()[2].click();
    render();
    expect(page.selected).not.toContain('role-1');
  });

  it('permite navegar con teclado y cerrar con Escape recuperando el foco', () => {
    trigger().focus();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    render();
    expect(document.activeElement).toBe(opciones()[1].querySelector('input'));
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(opciones()[2].querySelector('input'));
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    render();
    expect(root.querySelector('.role-dropdown')).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('cierra al hacer clic afuera sin perder la selección', () => {
    abrir();
    root.querySelector<HTMLButtonElement>('.outside')!.click();
    render();
    expect(root.querySelector('.role-dropdown')).toBeNull();
    expect(page.selected).toEqual(['admin', 'role-0']);
  });

  it('cierra al cambiar de cuenta y respeta el bloqueo de edición', () => {
    abrir();
    page.key = 'second';
    page.selected = ['role-5'];
    render();
    expect(root.querySelector('.role-dropdown')).toBeNull();
    expect(trigger().textContent).toContain('Catálogo 5');
    abrir();
    page.disabled = true;
    render();
    expect(trigger().disabled).toBe(true);
    expect(root.querySelector('.role-dropdown')).toBeNull();
  });
});
