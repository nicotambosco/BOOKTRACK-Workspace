import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="overlay" (click)="cerrarDesdeFondo($event)">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" (keydown)="teclado($event)">
        <div class="icon" aria-hidden="true">!</div>
        <h2 id="confirm-title">{{ titulo }}</h2>
        <p id="confirm-description">{{ mensaje }}</p>
        <div class="buttons"><button #cancelButton type="button" (click)="cancelled.emit()">Cancelar</button><button #confirmButton type="button" class="danger" (click)="confirmed.emit()">{{ confirmarTexto }}</button></div>
      </section>
    </div>
  `,
  styles: [`
    .overlay { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; background:#000b; backdrop-filter:blur(3px); font-family:Arial,sans-serif; }
    section { box-sizing:border-box; width:100%; max-width:430px; border:1px solid #493031; border-radius:16px; background:#161616; padding:1.75rem; box-shadow:0 20px 60px #0008; color:#eee; }
    .icon { display:grid; place-items:center; width:42px; height:42px; border:1px solid #965151; border-radius:12px; background:#3b1e22; color:#ffbaba; font-size:1.4rem; font-weight:bold; }
    h2 { font:400 1.5rem/1.3 Georgia,serif; margin:1.1rem 0 .75rem; }
    p { color:#bbb; font-size:.9rem; line-height:1.6; margin:0 0 1.5rem; overflow-wrap:anywhere; }
    .buttons { display:flex; flex-wrap:wrap; gap:.65rem; justify-content:flex-end; }
    button { min-height:42px; padding:.65rem 1rem; border:1px solid #555; border-radius:8px; background:#222; color:#eee; cursor:pointer; font:600 .85rem Arial,sans-serif; }
    .danger { background:#b83d43; border-color:#d3666b; color:white; }
    button:hover { filter:brightness(1.15); }
    button:focus-visible { outline:2px solid #8fe1ae; outline-offset:3px; }
  `]
})
export class ConfirmDialog implements AfterViewInit, OnDestroy {
  @Input() titulo = 'Confirmar eliminación';
  @Input() mensaje = '';
  @Input() confirmarTexto = 'Eliminar';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @ViewChild('cancelButton') cancelar!: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmButton') confirmar!: ElementRef<HTMLButtonElement>;
  private focoAnterior = document.activeElement as HTMLElement | null;
  ngAfterViewInit() { this.cancelar.nativeElement.focus(); }
  ngOnDestroy() { if (this.focoAnterior?.isConnected) this.focoAnterior.focus(); }
  cerrarDesdeFondo(evento: MouseEvent) { if (evento.target === evento.currentTarget) this.cancelled.emit(); }
  teclado(evento: KeyboardEvent) {
    if (evento.key === 'Escape') { evento.preventDefault(); evento.stopPropagation(); this.cancelled.emit(); }
    if (evento.key === 'Tab') {
      const primero = this.cancelar.nativeElement;
      const ultimo = this.confirmar.nativeElement;
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
  }
}
