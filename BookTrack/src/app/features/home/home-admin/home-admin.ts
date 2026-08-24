import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { LoanService } from '../../../core/services/loan.service';
import { BookService } from '../../../core/services/book.service';

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="home-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#e8e8e8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Panel de Administración</h2>
            <p class="section-subtitle">Gestioná libros, préstamos y usuarios de la biblioteca.</p>
          </div>
        </div>

        <div class="stats">
          <div class="stat-card">
            <span class="stat-num">{{ librosTotal }}</span>
            <span class="stat-label">Libros en catálogo</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ prestamosPendientes }}</span>
            <span class="stat-label">Préstamos pendientes</span>
          </div>
        </div>

        <div class="acciones">
          <div class="accion-card" (click)="router.navigate(['/book-add'])">
            <span class="accion-icon">＋</span>
            <span>Agregar libro</span>
          </div>
          <div class="accion-card" (click)="router.navigate(['/loan-management'])">
            <span class="accion-icon">📋</span>
            <span>Gestionar préstamos</span>
          </div>
          <div class="accion-card" (click)="router.navigate(['/user-management'])">
            <span class="accion-icon">👥</span>
            <span>Gestionar usuarios</span>
          </div>
          <div class="accion-card" (click)="router.navigate(['/reports'])">
            <span class="accion-icon">📊</span>
            <span>Reportes</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body { flex:1; display:flex; flex-direction:column; padding: 1.5rem 2rem; overflow-y:auto; color:#e8e8e8; }
    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon {
      width: 84px; height: 84px;
      background: #1c1c1c;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink: 0;
    }
    .section-title { font-family: Georgia, serif; font-size: 1.8rem; margin: 0 0 0.3rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .stats { display:flex; gap:1rem; margin-bottom: 1.5rem; }
    .stat-card {
      background:#161616; border-radius:12px; padding:1.2rem 1.8rem;
      display:flex; flex-direction:column; gap:0.3rem; min-width:160px;
    }
    .stat-num { font-family:Georgia,serif; font-size:1.8rem; color:#f5f5f5; }
    .stat-label { font-size:0.8rem; color:#9a9a9a; }

    .acciones { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:1rem; }
    .accion-card {
      background:#161616; border-radius:12px; padding:1.5rem;
      display:flex; flex-direction:column; align-items:center; gap:0.7rem;
      cursor:pointer; transition:transform 0.15s, background 0.15s;
      font-size:0.9rem; text-align:center;
    }
    .accion-card:hover { transform:translateY(-3px); background:#1c1c1c; }
    .accion-icon { font-size:1.8rem; }
  `]
})
export class HomeAdmin implements OnInit {
  librosTotal = 0;
  prestamosPendientes = 0;

  constructor(public router: Router, private loanService: LoanService, private bookService: BookService) {}

  ngOnInit() {
    this.bookService.getAll().subscribe({ next: l => this.librosTotal = l.length, error: () => {} });
    this.loanService.getPending().subscribe({ next: l => this.prestamosPendientes = l.length, error: () => {} });
  }
}
