import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { UserService } from '../../../core/services/user.service';
import { Loan } from '../../../models/loan.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-history',
  standalone: true,
  imports: [CommonModule, Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="false"></app-header>
      <div class="content">

        <div class="perfil-card">
          <div class="avatar">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#1a1a1a" stroke-width="2" fill="none"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#1a1a1a" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div class="perfil-info">
            <span class="nombre">{{ usuario?.nombreApellido ?? 'Usuario' }}</span>
            <span class="legajo">Legajo: {{ usuario?.legajo ?? '-' }}</span>
            <span class="badge-cat">{{ usuario?.categoria ?? 'usuario' }}</span>
          </div>
          <div class="stats">
            <div class="stat">
              <span class="stat-num">{{ activos }}</span>
              <span class="stat-label">Activos</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ prestamos.length }}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>
        </div>

        <div class="historial-card">
          <div class="card-top">
            <h2>Mi Historial de Préstamos</h2>
          </div>

          @if (prestamos.length === 0) {
            <p class="vacio">No hay préstamos registrados.</p>
          } @else {
            <div class="tabla">
              <div class="tabla-header">
                <span>Libro</span>
                <span>Inicio</span>
                <span>Vencimiento</span>
                <span>Estado</span>
                <span></span>
              </div>
              @for (p of prestamos; track p.id) {
                <div class="tabla-row">
                  <span class="libro-id">Libro #{{ p.libroId }}</span>
                  <span>{{ p.fechaInicio }}</span>
                  <span>{{ p.fechaFin || '-' }}</span>
                  <span class="badge" [class]="p.estado">{{ label(p.estado) }}</span>
                  <span>
                    @if (p.estado === 'aprobado') {
                      <button class="btn-ext" (click)="router.navigate(['/loan-extension'])">Extender</button>
                    }
                  </span>
                </div>
              }
            </div>
          }

          <div class="bottom">
            <button class="btn-primary" (click)="router.navigate(['/home'])">VOLVER</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; min-height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; flex-direction:column; align-items:center; padding:2rem; gap:1.2rem; }
    .perfil-card { display:flex; align-items:center; gap:1.5rem; background:rgba(212,184,150,0.85); padding:1.2rem 2rem; border-radius:8px; width:100%; max-width:700px; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
    .avatar { width:68px; height:68px; border-radius:50%; border:2px solid #1a1a1a; display:flex; align-items:center; justify-content:center; background:white; }
    .perfil-info { flex:1; display:flex; flex-direction:column; gap:0.2rem; }
    .nombre { font-family:Georgia,serif; font-weight:bold; font-size:1.05rem; }
    .legajo { font-size:0.78rem; color:#555; }
    .badge-cat { font-size:0.72rem; background:#1a1a1a; color:white; padding:0.15rem 0.6rem; border-radius:20px; align-self:flex-start; }
    .stats { display:flex; gap:1.5rem; }
    .stat { display:flex; flex-direction:column; align-items:center; }
    .stat-num { font-size:1.4rem; font-weight:bold; }
    .stat-label { font-size:0.7rem; color:#555; }
    .historial-card { background:rgba(212,184,150,0.85); padding:1.5rem 2rem; border-radius:8px; width:100%; max-width:700px; display:flex; flex-direction:column; gap:1rem; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
    .card-top h2 { font-family:Georgia,serif; font-size:1.1rem; font-weight:bold; margin:0; }
    .tabla { display:flex; flex-direction:column; gap:0.4rem; }
    .tabla-header { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; padding:0.4rem 1rem; font-size:0.72rem; font-weight:bold; color:#444; }
    .tabla-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; align-items:center; background:white; padding:0.6rem 1rem; border-radius:6px; font-size:0.8rem; }
    .libro-id { font-weight:bold; }
    .badge { padding:0.2rem 0.5rem; border-radius:20px; font-size:0.7rem; text-align:center; }
    .badge.aprobado { background:#d4edda; color:#155724; }
    .badge.pendiente { background:#fff3cd; color:#856404; }
    .badge.devuelto  { background:#d1ecf1; color:#0c5460; }
    .badge.denegado  { background:#f8d7da; color:#721c24; }
    .btn-ext { font-size:0.7rem; background:transparent; border:1px solid #1a1a1a; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer; }
    .vacio { text-align:center; color:#555; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:flex-end; padding-top:0.5rem; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.6rem 1.5rem; border-radius:20px; cursor:pointer; font-size:0.85rem; }
  `]
})
export class UserHistory implements OnInit {
  usuario: User | null = null;
  prestamos: Loan[] = [];
  get activos() { return this.prestamos.filter(p => p.estado === 'aprobado').length; }

  constructor(public router: Router, private loanService: LoanService, private userService: UserService) {}

  ngOnInit() {
    this.userService.getProfile().subscribe(u => this.usuario = u);
    this.loanService.getHistory().subscribe(l => this.prestamos = l);
  }

  label(e: string) { return ({ pendiente:'Pendiente', aprobado:'Activo', devuelto:'Devuelto', denegado:'Denegado' } as any)[e] ?? e; }
}
