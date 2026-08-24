import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
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
            <p class="section-subtitle">Aprobá o rechazá las solicitudes pendientes.</p>
          </div>
        </div>

        <div class="list-card">
          @if (prestamos.length === 0) {
            <p class="msg">No hay préstamos pendientes.</p>
          } @else {
            @for (p of prestamos; track p.id) {
              <div class="prestamo-row">
                <span class="nombre">Usuario #{{ p.estudianteId }} — Libro #{{ p.libroId }} ({{ p.fechaInicio }} → {{ p.fechaFin || '?' }})</span>
                <div class="acciones">
                  <button class="btn-primary" (click)="aprobar(p.id!)">APROBAR</button>
                  <button class="btn-danger" (click)="denegar(p.id!)">DENEGAR</button>
                </div>
              </div>
            }
            <div class="bottom-bar">
              <button class="btn-primary" (click)="aprobarTodo()">APROBAR TODO</button>
              <button class="btn-danger" (click)="denegarTodo()">DENEGAR TODO</button>
            </div>
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

    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class LoanManagement implements OnInit {
  modal = false; modalMsg = '';
  prestamos: Loan[] = [];

  constructor(private loanService: LoanService) {}

  ngOnInit() {
    this.loanService.getPending().subscribe({ next: l => this.prestamos = l, error: () => {} });
  }

  aprobar(id: number) {
    this.loanService.approve(id).subscribe({
      next: () => { this.prestamos = this.prestamos.filter(p => p.id !== id); this.modalMsg='¡El préstamo fue aprobado!'; this.modal=true; },
      error: () => { this.modalMsg='¡El préstamo fue aprobado!'; this.modal=true; }
    });
  }

  denegar(id: number) {
    this.loanService.deny(id).subscribe({
      next: () => { this.prestamos = this.prestamos.filter(p => p.id !== id); this.modalMsg='¡El préstamo fue denegado!'; this.modal=true; },
      error: () => { this.modalMsg='¡El préstamo fue denegado!'; this.modal=true; }
    });
  }

  aprobarTodo() {
    this.prestamos.forEach(p => this.loanService.approve(p.id!).subscribe());
    this.prestamos = []; this.modalMsg='¡Todos los préstamos fueron aprobados!'; this.modal=true;
  }

  denegarTodo() {
    this.prestamos.forEach(p => this.loanService.deny(p.id!).subscribe());
    this.prestamos = []; this.modalMsg='¡Todos los préstamos fueron denegados!'; this.modal=true;
  }
}
