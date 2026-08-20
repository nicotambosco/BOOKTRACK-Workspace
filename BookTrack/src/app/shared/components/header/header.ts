import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../../core/services/loan.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="header">
      <div class="header-left">
        <div class="brand" (click)="irAHome()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 11 L12 3 L21 11" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 10 V20 H19 V10" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="brand-name">BookTrack</span>
        </div>
        @if (esAdmin) {
          <span class="divider"></span>
          <button class="btn-add" (click)="agregarLibro()">+</button>
        }
      </div>
      <div class="header-center">
        <div class="search-box">
          <input type="text" placeholder="Ingresar nombre del libro" [(ngModel)]="busqueda" (keyup.enter)="buscar()"/>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="cursor:pointer" (click)="buscar()">
            <circle cx="11" cy="11" r="7" stroke="#9a9a9a" stroke-width="2"/>
            <path d="M16.5 16.5L21 21" stroke="#9a9a9a" stroke-width="2"/>
          </svg>
        </div>
      </div>
      <div class="header-right">
        @if (esAdmin) {
          <svg class="icon-btn" width="22" height="22" viewBox="0 0 24 24" fill="none" (click)="irAComentario()">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        } @else {
          <div class="notif-wrap">
            <svg class="icon-btn" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="white" stroke-width="2" fill="none"/>
            </svg>
            @if (tieneNotificaciones) { <span class="notif-dot"></span> }
          </div>
        }
        <div class="profile-icon" (click)="irAPerfil()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="white" stroke-width="2" fill="none"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #101010;
      border-bottom: 1px solid #232323;
      padding: 0.7rem 1.5rem;
      height: 56px;
      box-sizing: border-box;
    }
    .header-left { display:flex; align-items:center; gap:1rem; }
    .brand { display:flex; align-items:center; gap:0.5rem; cursor:pointer; }
    .brand-name { color:#f5f5f5; font-weight:700; font-size:1.05rem; }
    .divider { width:1px; height:22px; background:#2a2a2a; }
    .icon-btn { cursor:pointer; }
    .btn-add {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: white;
      color: #1a1a1a;
      border: none;
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .header-center { flex: 1; display:flex; justify-content:center; padding: 0 1.5rem; }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 20px;
      padding: 0.5rem 1rem;
      width: 100%;
      max-width: 560px;
    }
    .search-box input {
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 0.85rem;
      flex: 1;
    }
    .search-box input::placeholder { color: #8a8a8a; }
    .header-right { display:flex; align-items:center; gap:1.2rem; }
    .notif-wrap { position: relative; display:flex; }
    .notif-dot {
      position: absolute; top:-2px; right:-2px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #2ecc71; border: 1.5px solid #101010;
    }
    .profile-icon {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 1px solid #3a3a3a;
      display:flex; align-items:center; justify-content:center;
      cursor: pointer;
    }
  `]
})
export class Header implements OnInit {
  @Input() esAdmin = false;
  busqueda = '';
  tieneNotificaciones = false;

  constructor(private router: Router, private loanService: LoanService) {}

  ngOnInit() {
    // ponytail: sin backend de notificaciones dedicado; usamos cambios de estado
    // en los préstamos del usuario (aprobado/denegado) como proxy de "novedades".
    if (!this.esAdmin) {
      this.loanService.getAll().subscribe({
        next: loans => this.tieneNotificaciones = loans.some(l => l.estado === 'aprobado' || l.estado === 'denegado'),
        error: () => {}
      });
    }
  }

  irAHome() { this.router.navigate(['/home']); }
  irAPerfil() { this.router.navigate([this.esAdmin ? '/profile-admin' : '/profile']); }
  irAHistorial() { this.router.navigate(['/user-history']); }
  irAComentario() { this.router.navigate(['/comment-form']); }
  agregarLibro() { this.router.navigate(['/book-add']); }
  buscar() { if (this.busqueda.trim()) this.router.navigate(['/book-search'], { queryParams: { q: this.busqueda } }); }
}
