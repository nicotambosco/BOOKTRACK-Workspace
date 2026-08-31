import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-extension',
  standalone: true,
  imports: [CommonModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="false"></app-header>
      <div class="home-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#e8e8e8" stroke-width="2"/>
              <path d="M12 7v5l3.5 2" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Extensión de Préstamo</h2>
            <p class="section-subtitle">Seleccioná el préstamo que querés extender.</p>
          </div>
        </div>

        <div class="ext-card">
          <div class="lista">
            @for (p of prestamos; track p.id) {
              <div class="prestamo-row" [class.seleccionado]="seleccionado === p.id" (click)="seleccionar(p.id!)">
                <div class="info">
                  <span class="libro">{{ tituloLibro(p.libroId) }}</span>
                  <span class="fechas">Vence: {{ p.fechaFin || 'Sin fecha' }}</span>
                </div>
                @if (p.extensionPendiente) {
                  <span class="estado pendiente">extensión pendiente</span>
                } @else {
                  <span class="estado" [class]="p.estado">{{ p.estado }}</span>
                }
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
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0d0d0d; }
    .home-body { flex:1; padding: 1.5rem 2rem; color:#e8e8e8; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .ext-card { background:#161616; border-radius:12px; padding:1.5rem 2rem; max-width:600px; display:flex; flex-direction:column; gap:1.2rem; }
    .lista { display:flex; flex-direction:column; gap:0.6rem; }
    .prestamo-row { display:flex; justify-content:space-between; align-items:center; background:#101010; padding:0.8rem 1.1rem; border-radius:8px; cursor:pointer; border:1px solid #232323; transition:border 0.2s; }
    .prestamo-row.seleccionado { border-color:#2ecc71; }
    .prestamo-row:hover { border-color:#3a3a3a; }
    .info { display:flex; flex-direction:column; gap:0.2rem; }
    .libro { font-weight:bold; font-size:0.88rem; color:#e8e8e8; }
    .fechas { font-size:0.75rem; color:#9a9a9a; }
    .estado { font-size:0.72rem; padding:0.25rem 0.7rem; border-radius:20px; background:#232323; color:#9a9a9a; }
    .estado.aprobado { background:#16301f; color:#4ade80; }
    .estado.pendiente { background:#332a12; color:#facc15; }
    .vacio { text-align:center; color:#8a8a8a; font-style:italic; padding:1rem; }
    .bottom { display:flex; gap:1rem; justify-content:flex-end; padding-top:0.5rem; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.65rem 2rem;
      border-radius:24px; cursor:pointer; font-size:0.85rem; font-weight:700;
      box-shadow: 0 0 16px rgba(46,204,113,0.35);
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class LoanExtension implements OnInit {
  prestamos: Loan[] = [];
  seleccionado: number | null = null;
  modal = false;
  modalMsg = '';
  private titulosPorLibro = new Map<number, string>();

  constructor(public router: Router, private loanService: LoanService, private bookService: BookService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe(loans => {
      this.prestamos = loans.filter(l => l.estado === 'aprobado');
    });
    this.bookService.getAll().subscribe(libros => {
      libros.forEach(l => { if (l.id) this.titulosPorLibro.set(l.id, l.titulo); });
    });
  }

  tituloLibro(libroId: number): string {
    return this.titulosPorLibro.get(libroId) ?? `Libro #${libroId}`;
  }

  seleccionar(id: number) { this.seleccionado = id; }

  confirmar() {
    if (!this.seleccionado) return;
    this.loanService.requestExtension(this.seleccionado).subscribe({
      next: p => {
        const item = this.prestamos.find(x => x.id === p.id);
        if (item) item.extensionPendiente = true;
        this.modalMsg = '¡Solicitud de extensión enviada! El bibliotecario la revisará a la brevedad.';
        this.modal = true;
      },
      error: () => { this.modalMsg = 'No se pudo enviar la solicitud de extensión.'; this.modal = true; }
    });
  }
}
