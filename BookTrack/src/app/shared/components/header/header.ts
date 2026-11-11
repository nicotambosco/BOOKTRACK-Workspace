import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { Notificacion } from '../../../models/notification.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
        @if (!esAdmin) {
          <div class="notif-wrap">
            <svg class="icon-btn" width="22" height="22" viewBox="0 0 24 24" fill="none" (click)="toggleNotificaciones()">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="white" stroke-width="2" fill="none"/>
            </svg>
            @if (tieneNotificaciones) { <span class="notif-dot"></span> }
            @if (mostrarNotificaciones) {
              <div class="notif-panel">
                <h4 class="notif-titulo">Notificaciones</h4>
                @if (notificaciones.length === 0) {
                  <p class="notif-vacio">No tenés novedades por ahora.</p>
                } @else {
                  @for (n of notificaciones; track n.id) {
                    <div class="notif-item" [class]="n.tipo">
                      <span class="notif-msg">{{ n.mensaje }}</span>
                    </div>
                  }
                }
              </div>
            }
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
    .icon-btn { cursor:pointer; }
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
    .notif-panel {
      position: absolute; top: 34px; right: -8px;
      width: 300px; max-height: 340px; overflow-y: auto;
      background: #161616; border: 1px solid #2a2a2a; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      padding: 0.9rem; z-index: 50;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .notif-panel::-webkit-scrollbar { width: 8px; }
    .notif-panel::-webkit-scrollbar-track { background: transparent; }
    .notif-panel::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .notif-panel::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }
    .notif-titulo { margin: 0 0 0.6rem; font-family: Georgia, serif; font-size: 0.95rem; color: #f5f5f5; }
    .notif-vacio { margin: 0; color: #8a8a8a; font-size: 0.8rem; font-style: italic; }
    .notif-item { padding: 0.6rem 0.7rem; border-radius: 8px; background: #101010; margin-bottom: 0.5rem; }
    .notif-item:last-child { margin-bottom: 0; }
    .notif-item.prestamo_iniciado, .notif-item.devolucion_registrada { border-left: 3px solid #2ecc71; }
    .notif-item.prestamo_por_vencer, .notif-item.reserva_vencida { border-left: 3px solid #e8a020; }
    .notif-item.prestamo_vencido { border-left: 3px solid #e74c3c; background: rgba(231,76,60,0.08); }
    .notif-item.reserva_cancelada { border-left: 3px solid #e74c3c; }
    .notif-item.reserva_creada { border-left: 3px solid #3a8fd6; }
    .notif-msg { font-size: 0.8rem; color: #d8d8d8; line-height: 1.4; }
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
  mostrarNotificaciones = false;
  notificaciones: Notificacion[] = [];

  constructor(private router: Router, private notificationService: NotificationService, private authService: AuthService) {}

  ngOnInit() {
    // El rol real manda: las vistas compartidas (búsqueda, detalle, préstamo) no saben quién las ve.
    const rol = this.authService.getUserRole();
    if (rol) this.esAdmin = rol === 'bibliotecario';
    // Los avisos los genera el servidor (reservas, retiros, vencimientos); el bibliotecario no recibe.
    if (!this.esAdmin) {
      this.notificationService.getAll().subscribe({
        next: items => {
          this.notificaciones = items;
          const leidas = this.idsLeidas();
          this.tieneNotificaciones = items.some(n => !leidas.has(String(n.id)));
        },
        error: () => {}
      });
    }
  }

  toggleNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) this.marcarComoLeidas();
  }

  private idsLeidas(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem('notif_leidas') ?? '[]'));
    } catch {
      return new Set();
    }
  }

  private marcarComoLeidas() {
    const leidas = this.idsLeidas();
    this.notificaciones.forEach(n => leidas.add(String(n.id)));
    localStorage.setItem('notif_leidas', JSON.stringify([...leidas]));
    this.tieneNotificaciones = false;
  }

  irAHome() { this.router.navigate([this.esAdmin ? '/home-admin' : '/home']); }
  irAPerfil() { this.router.navigate([this.esAdmin ? '/profile-admin' : '/profile']); }
  irAHistorial() { this.router.navigate(['/user-history']); }
  buscar() { if (this.busqueda.trim()) this.router.navigate(['/book-search'], { queryParams: { q: this.busqueda } }); }
}
