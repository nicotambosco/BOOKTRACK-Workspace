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
    <div class="home-page">
      <app-header [esAdmin]="false"></app-header>
      <div class="profile-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5l3 2" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="#e8e8e8" stroke-width="2"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Mi Historial de Préstamos</h2>
            <p class="section-subtitle">Consultá el estado de tus solicitudes y préstamos.</p>
          </div>
        </div>

        <div class="perfil-card">
          <div class="avatar">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#e8e8e8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div class="perfil-info">
            <span class="nombre">{{ usuario?.nombreApellido ?? 'Usuario' }}</span>
            <span class="legajo">Legajo: {{ usuario?.legajo ?? '-' }}</span>
            <span class="badge-cat" [class]="'rol-' + (usuario?.categoria || 'usuario')">
              {{ usuario?.categoria === 'bibliotecario' ? 'Bibliotecario' : 'Usuario' }}
            </span>
          </div>
          <div class="stats">
            <div class="stat">
              <span class="stat-num">{{ activos }}</span>
              <span class="stat-label">Activos</span>
            </div>
            <div class="stat">
              <span class="stat-num stat-num-vencidos">{{ vencidos }}</span>
              <span class="stat-label">Vencidos</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ prestamos.length }}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>
        </div>

        <div class="historial-card">
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
                  <span class="badge" [class]="esVencido(p) ? 'vencido' : p.estado">{{ esVencido(p) ? 'Vencido' : label(p.estado) }}</span>
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
            <button class="btn-outline" (click)="router.navigate(['/profile'])">VOLVER</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0a0a0a; }
    .profile-body { flex:1; padding: 1.5rem 2rem; color:#e8e8e8; display:flex; flex-direction:column; gap:1.2rem; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 0.5rem; }
    .title-icon {
      width: 72px; height: 72px;
      background: #1c1c1c;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink: 0;
    }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .perfil-card {
      display:flex; align-items:center; gap:1.5rem;
      background:#161616; padding:1.2rem 2rem; border-radius:12px;
    }
    .avatar { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#232323; flex-shrink:0; }
    .perfil-info { flex:1; display:flex; flex-direction:column; gap:0.3rem; }
    .nombre { font-family:Georgia,serif; font-weight:bold; font-size:1.05rem; color:#f5f5f5; }
    .legajo { font-size:0.78rem; color:#9a9a9a; }
    .badge-cat { font-size:0.72rem; padding:0.2rem 0.7rem; border-radius:20px; align-self:flex-start; font-weight:600; }
    .badge-cat.rol-usuario { color:#2ecc71; border:1px solid #2ecc71; }
    .badge-cat.rol-bibliotecario { color:#b388ff; border:1px solid #7b3f7a; }
    .stats { display:flex; gap:1.8rem; }
    .stat { display:flex; flex-direction:column; align-items:center; }
    .stat-num { font-size:1.4rem; font-weight:bold; color:#f5f5f5; }
    .stat-num-vencidos { color:#f87171; }
    .stat-label { font-size:0.7rem; color:#9a9a9a; }

    .historial-card {
      background:#161616; padding:1.8rem 2rem; border-radius:12px;
      display:flex; flex-direction:column; gap:1rem;
    }
    .tabla { display:flex; flex-direction:column; gap:0.5rem; }
    .tabla-header { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; padding:0.4rem 1rem; font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .tabla-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; align-items:center; background:#101010; border:1px solid #232323; padding:0.7rem 1rem; border-radius:8px; font-size:0.8rem; color:#e8e8e8; }
    .libro-id { font-weight:bold; }
    .badge { padding:0.25rem 0.6rem; border-radius:20px; font-size:0.7rem; text-align:center; width:fit-content; }
    .badge.aprobado { background:#16301f; color:#4ade80; }
    .badge.pendiente { background:#332a12; color:#facc15; }
    .badge.devuelto  { background:#12293a; color:#60a5fa; }
    .badge.denegado  { background:#331616; color:#f87171; }
    .badge.vencido   { background:#3a1414; color:#f87171; font-weight:600; }
    .btn-ext { font-size:0.7rem; background:transparent; border:1px solid #2ecc71; color:#2ecc71; padding:0.25rem 0.6rem; border-radius:20px; cursor:pointer; }
    .btn-ext:hover { background:rgba(46,204,113,0.1); }
    .vacio { text-align:center; color:#9a9a9a; font-style:italic; padding:1rem; }
    .bottom { display:flex; justify-content:flex-end; padding-top:0.5rem; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.6rem 1.6rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }
  `]
})
export class UserHistory implements OnInit {
  usuario: User | null = null;
  prestamos: Loan[] = [];
  get vencidos() {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.prestamos.filter(p => p.estado === 'aprobado' && !!p.fechaFin && p.fechaFin < hoy).length;
  }
  get activos() {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.prestamos.filter(p => p.estado === 'aprobado' && (!p.fechaFin || p.fechaFin >= hoy)).length;
  }

  constructor(public router: Router, private loanService: LoanService, private userService: UserService) {}

  ngOnInit() {
    this.userService.getProfile().subscribe(u => this.usuario = u);
    this.loanService.getHistory().subscribe(l => this.prestamos = l);
  }

  label(e: string) { return ({ pendiente:'Pendiente', aprobado:'Activo', devuelto:'Devuelto', denegado:'Denegado' } as any)[e] ?? e; }

  esVencido(p: Loan) {
    const hoy = new Date().toISOString().slice(0, 10);
    return p.estado === 'aprobado' && !!p.fechaFin && p.fechaFin < hoy;
  }
}
