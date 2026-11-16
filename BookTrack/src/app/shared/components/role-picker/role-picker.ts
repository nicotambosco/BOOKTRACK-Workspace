import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

export interface RoleOption {
  clave: string;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-role-picker',
  standalone: true,
  templateUrl: './role-picker.html',
  styleUrl: './role-picker.scss',
})
export class RolePicker implements OnChanges {
  private static nextId = 0;
  readonly id = `role-picker-${RolePicker.nextId++}`;
  @Input() options: readonly RoleOption[] = [];
  @Input() selectedValues: readonly string[] = [];
  @Input() lockedValues: readonly string[] = [];
  @Input() nonRemovableValues: readonly string[] = [];
  @Input() nonAssignableValues: readonly string[] = [];
  @Input() disabled = false;
  @Input() resetKey = '';
  @Output() selectionChange = new EventEmitter<string[]>();
  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  abierto = false;

  ngOnChanges(changes: SimpleChanges) {
    if (this.disabled || changes['resetKey']) this.cerrar();
  }

  get nombresSeleccionados() {
    return this.selectedValues.map(value => this.options.find(r => r.clave === value)?.nombre ?? value);
  }

  abrir() {
    if (this.disabled) return;
    this.abierto = true;
    this.cdr.detectChanges();
    this.host.nativeElement.querySelector<HTMLInputElement>('input[type=checkbox]:not(:disabled)')?.focus();
  }

  alternar() {
    if (this.abierto) this.cerrar();
    else this.abrir();
  }

  cerrar(restaurarFoco = false) {
    this.abierto = false;
    if (restaurarFoco) this.trigger.nativeElement.focus();
  }

  elegir(value: string, checked: boolean) {
    if (this.disabled || this.lockedValues.includes(value) || (!checked && this.nonRemovableValues.includes(value)) ||
        (checked && this.nonAssignableValues.includes(value)) || !this.options.some(r => r.clave === value)) return;
    this.selectionChange.emit(checked ? [...new Set([...this.selectedValues, value])] : this.selectedValues.filter(r => r !== value));
  }

  bloqueado(value: string) {
    return this.lockedValues.includes(value) || (this.selectedValues.includes(value)
      ? this.nonRemovableValues.includes(value) : this.nonAssignableValues.includes(value));
  }

  motivo(value: string) {
    if (this.lockedValues.includes(value)) return 'Este acceso es fijo y no se puede quitar.';
    if (this.selectedValues.includes(value) && this.nonRemovableValues.includes(value)) return 'No podés quitar este rango desde tu cuenta.';
    if (!this.selectedValues.includes(value) && this.nonAssignableValues.includes(value)) return 'No podés asignar este rango desde tu cuenta.';
    return this.options.find(r => r.clave === value)?.descripcion ?? '';
  }

  @HostListener('document:click', ['$event'])
  fuera(event: MouseEvent) {
    if (this.abierto && !this.host.nativeElement.contains(event.target as Node)) this.cerrar();
  }

  @HostListener('focusout', ['$event'])
  perderFoco(event: FocusEvent) {
    // Las etiquetas pueden perder el foco brevemente antes de activar su checkbox.
    if (this.abierto && event.relatedTarget && !this.host.nativeElement.contains(event.relatedTarget as Node)) this.cerrar();
  }

  @HostListener('keydown', ['$event'])
  teclado(event: KeyboardEvent) {
    if (!this.abierto) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); this.cerrar(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const inputs = Array.from(this.host.nativeElement.querySelectorAll<HTMLInputElement>('input[type=checkbox]:not(:disabled)'));
      const actual = inputs.indexOf(event.target as HTMLInputElement);
      const siguiente = actual < 0 ? (event.key === 'ArrowDown' ? inputs[0] : inputs.at(-1))
        : inputs[actual + (event.key === 'ArrowDown' ? 1 : -1)];
      if (siguiente) { event.preventDefault(); siguiente.focus(); }
      else if (actual === 0 && event.key === 'ArrowUp') { event.preventDefault(); this.trigger.nativeElement.focus(); }
    }
  }
}
