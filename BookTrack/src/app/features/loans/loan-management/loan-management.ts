import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';
import { Loan } from '../../../models/loan.model';

@Component({
  selector: 'app-loan-management',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Administración de préstamos</h2>
            <p class="section-subtitle">Gestioná solicitudes, extensiones y devoluciones.</p>
          </div>
        </div>

        <div class="list-card">
          @if (prestamos.length === 0) {
            <p class="msg">No hay préstamos para gestionar.</p>
          } @else {
            @for (p of prestamos; track p.id) {
              <div class="prestamo-row">
                <span class="nombre">
                  Usuario #{{ p.estudianteId }} — {{ tituloLibro(p.libroId) }} ({{ p.plazoDeSolicitud || 'sin período' }})
                </span>

                @if (p.estado === 'pendiente') {
                  <div class="acciones">
                    <button class="btn-primary" (click)="aprobar(p.id!)">APROBAR</button>
                    <button class="btn-danger" (click)="denegar(p.id!)">DENEGAR</button>
                  </div>
                } @else if (p.estado === 'aprobado' && p.extensionPendiente) {
                  <div class="acciones">
                    <span class="estado-badge extension">EXTENSIÓN SOLICITADA</span>
                    <button class="btn-primary" (click)="aprobarExtension(p.id!)">APROBAR EXT.</button>
                    <button class="btn-danger" (click)="denegarExtension(p.id!)">DENEGAR EXT.</button>
                  </div>
                } @else if (p.estado === 'aprobado') {
                  <div class="acciones">
                    <span class="estado-badge aprobado">APROBADO</span>
                    <button class="btn-outline" (click)="devolver(p.id!)">MARCAR DEVUELTO</button>
                  </div>
                } @else {
                  <span class="estado-badge" [class.denegado]="p.estado === 'denegado'" [class.devuelto]="p.estado === 'devuelto'">
                    {{ p.estado === 'denegado' ? 'DENEGADO' : 'DEVUELTO' }}
                  </span>
                }
              </div>
            }
            @if (hayPendientes()) {
              <div class="bottom-bar">
                <button class="btn-primary" (click)="aprobarTodo()">APROBAR TODO</button>
                <button class="btn-danger" (click)="denegarTodo()">DENEGAR TODO</button>
              </div>
            }
          }
        </div>
      </div>
      @if (modal) {
        <div class="modal-overlay">
          <div class="modal">
            <p>{{ modalMsg }}</p>
            <button class="btn-primary" (click)="modal=false">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0d0d0d; }
    .page-body { flex:1; padding: 1.5rem 2rem; color:#e8e8e8; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .list-card { background:#161616; border-radius:12px; padding:1.5rem; display:flex; flex-direction:column; gap:0.8rem; max-width: 900px; }
    .msg { text-align:center; color:#8a8a8a; font-style:italic; padding:1rem; }
    .prestamo-row { display:flex; justify-content:space-between; align-items:center; background:#101010; padding:0.8rem 1.2rem; border-radius:8px; }
    .nombre { font-size:0.85rem; }
    .acciones { display:flex; gap:0.6rem; }
    .bottom-bar { display:flex; gap:1rem; justify-content:flex-end; margin-top:0.5rem; }

    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.5rem 1.4rem;
      border-radius:20px; cursor:pointer; font-size:0.78rem; font-weight:700;
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-danger { background:transparent; border:1px solid #e74c3c; color:#e74c3c; padding:0.5rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.78rem; }
    .btn-danger:hover { background:rgba(231,76,60,0.1); }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.5rem 1.4rem; border-radius:20px; cursor:pointer; font-size:0.78rem; }
    .btn-outline:hover { background:#1a1a1a; }

    .estado-badge { font-size:0.72rem; font-weight:700; letter-spacing:0.03rem; padding:0.4rem 1rem; border-radius:20px; white-space:nowrap; }
    .estado-badge.aprobado { color:#2ecc71; border:1px solid #2ecc71; }
    .estado-badge.denegado { color:#e74c3c; border:1px solid #e74c3c; }
    .estado-badge.devuelto { color:#9a9a9a; border:1px solid #3a3a3a; }
    .estado-badge.extension { color:#e8a020; border:1px solid #e8a020; }

    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class LoanManagement implements OnInit {
  modal = false; modalMsg = '';
  prestamos: Loan[] = [];
  private titulosPorLibro = new Map<number, string>();

  constructor(private loanService: LoanService, private bookService: BookService) {}

  ngOnInit() {
    this.loanService.getAll().subscribe({ next: l => this.prestamos = l, error: () => {} });
    this.bookService.getAll().subscribe({
      next: libros => libros.forEach(l => { if (l.id) this.titulosPorLibro.set(l.id, l.titulo); }),
      error: () => {}
    });
  }

  tituloLibro(libroId: number): string {
    return this.titulosPorLibro.get(libroId) ?? `Libro #${libroId}`;
  }

  hayPendientes() { return this.prestamos.some(p => p.estado === 'pendiente'); }

  devolver(id: number) {
    this.loanService.return_(id).subscribe({
      next: p => { this.actualizarEstado(id, p.estado); this.modalMsg='¡Préstamo marcado como devuelto!'; this.modal=true; },
      error: () => { this.modalMsg='No se pudo marcar como devuelto.'; this.modal=true; }
    });
  }

  aprobarExtension(id: number) {
    this.loanService.approveExtension(id).subscribe({
      next: p => { this.actualizarPrestamo(p); this.modalMsg='¡Extensión aprobada! Nueva fecha de vencimiento asignada.'; this.modal=true; },
      error: () => { this.modalMsg='No se pudo aprobar la extensión.'; this.modal=true; }
    });
  }

  denegarExtension(id: number) {
    this.loanService.denyExtension(id).subscribe({
      next: p => { this.actualizarPrestamo(p); this.modalMsg='Extensión denegada.'; this.modal=true; },
      error: () => { this.modalMsg='No se pudo denegar la extensión.'; this.modal=true; }
    });
  }

  aprobar(id: number) {
    this.loanService.approve(id).subscribe({
      next: p => { this.actualizarEstado(id, p.estado); this.modalMsg='¡El préstamo fue aprobado!'; this.modal=true; },
      error: () => { this.modalMsg='No se pudo aprobar el préstamo.'; this.modal=true; }
    });
  }

  denegar(id: number) {
    this.loanService.deny(id).subscribe({
      next: p => { this.actualizarEstado(id, p.estado); this.modalMsg='¡El préstamo fue denegado!'; this.modal=true; },
      error: () => { this.modalMsg='No se pudo denegar el préstamo.'; this.modal=true; }
    });
  }

  aprobarTodo() {
    const pendientes = this.prestamos.filter(p => p.estado === 'pendiente');
    pendientes.forEach(p => this.loanService.approve(p.id!).subscribe({
      next: r => this.actualizarEstado(p.id!, r.estado),
      error: () => {}
    }));
    this.modalMsg='¡Todos los préstamos fueron aprobados!'; this.modal=true;
  }

  denegarTodo() {
    const pendientes = this.prestamos.filter(p => p.estado === 'pendiente');
    pendientes.forEach(p => this.loanService.deny(p.id!).subscribe({
      next: r => this.actualizarEstado(p.id!, r.estado),
      error: () => {}
    }));
    this.modalMsg='¡Todos los préstamos fueron denegados!'; this.modal=true;
  }

  private actualizarEstado(id: number, estado: Loan['estado']) {
    const p = this.prestamos.find(p => p.id === id);
    if (p) p.estado = estado;
  }

  private actualizarPrestamo(actualizado: Loan) {
    const i = this.prestamos.findIndex(p => p.id === actualizado.id);
    if (i !== -1) this.prestamos[i] = actualizado;
  }
}
