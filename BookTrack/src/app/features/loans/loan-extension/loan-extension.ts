import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-extension',
  standalone: true,
  imports: [CommonModule, Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="false"></app-header>
      <div class="content">
        <div class="card">
          <h2 class="titulo">Extensión de Préstamo</h2>
          <p class="subtitulo">Seleccioná el préstamo que querés extender</p>

          <div class="lista">
            @for (p of prestamos; track p.id) {
              <div class="prestamo-row" [class.seleccionado]="seleccionado === p.id" (click)="seleccionar(p.id!)">
                <div class="info">
                  <span class="libro">Libro #{{ p.libroId }}</span>
                  <span class="fechas">Vence: {{ p.fechaFin || 'Sin fecha' }}</span>
                </div>
                <span class="estado" [class]="p.estado">{{ p.estado }}</span>
              </div>
            }
            @if (prestamos.length === 0) {
              <p class="vacio">No tenés préstamos activos para extender.</p>
            }
          </div>

          <div class="bottom">
            <button class="btn-primary" [disabled]="!seleccionado" (click)="confirmar()">
              SOLICITAR EXTENSIÓN
            </button>
            <button class="btn-outline" (click)="router.navigate(['/home'])">CANCELAR</button>
          </div>
        </div>
      </div>

      @if (modal) {
        <div class="modal-overlay">
          <div class="modal">
            <p>{{ modalMsg }}</p>
            <button class="btn-primary" (click)="modal=false; router.navigate(['/home'])">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; min-height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; }
    .card { background:rgba(212,184,150,0.85); padding:2rem; border-radius:8px; width:100%; max-width:600px; display:flex; flex-direction:column; gap:1.2rem; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
    .titulo { font-family:Georgia,serif; font-size:1.3rem; font-weight:bold; margin:0; }
    .subtitulo { font-size:0.85rem; margin:0; color:#444; }
    .lista { display:flex; flex-direction:column; gap:0.6rem; }
    .prestamo-row { display:flex; justify-content:space-between; align-items:center; background:white; padding:0.8rem 1rem; border-radius:6px; cursor:pointer; border:2px solid transparent; transition:border 0.2s; }
    .prestamo-row.seleccionado { border-color:#1a1a1a; }
    .prestamo-row:hover { border-color:#999; }
    .info { display:flex; flex-direction:column; gap:0.2rem; }
    .libro { font-weight:bold; font-size:0.9rem; }
    .fechas { font-size:0.75rem; color:#666; }
    .estado { font-size:0.75rem; padding:0.2rem 0.6rem; border-radius:20px; background:#e8e8e8; }
    .estado.aprobado { background:#d4edda; color:#155724; }
    .estado.pendiente { background:#fff3cd; color:#856404; }
    .vacio { text-align:center; color:#555; font-style:italic; padding:1rem; }
    .bottom { display:flex; gap:1rem; justify-content:flex-end; padding-top:0.5rem; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.6rem 1.5rem; border-radius:20px; cursor:pointer; font-size:0.85rem; }
    .btn-primary:disabled { background:#999; cursor:not-allowed; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.6rem 1.5rem; border-radius:20px; cursor:pointer; font-size:0.85rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
  `]
})
export class LoanExtension implements OnInit {
  prestamos: Loan[] = [];
  seleccionado: number | null = null;
  modal = false;
  modalMsg = '';

  constructor(public router: Router, private loanService: LoanService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe(loans => {
      this.prestamos = loans.filter(l => l.estado === 'aprobado');
    });
  }

  seleccionar(id: number) { this.seleccionado = id; }

  confirmar() {
    if (!this.seleccionado) return;
    // TODO: LoanService.requestExtension(this.seleccionado)
    this.modalMsg = '¡Solicitud de extensión enviada! El bibliotecario la revisará a la brevedad.';
    this.modal = true;
  }
}
