import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="header">
      <div class="header-left">
        <div class="logo-icon" (click)="irAHome()">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="14" width="24" height="16" rx="1" fill="white"/>
            <path d="M2 16 L16 4 L30 16" stroke="white" stroke-width="2.5" fill="none"/>
            <rect x="12" y="20" width="8" height="10" fill="#1a1a1a"/>
          </svg>
        </div>
        @if (esAdmin) {
          <button class="btn-add" (click)="agregarLibro()">+</button>
        }
      </div>
      <div class="header-center">
        <div class="search-box">
          <input type="text" placeholder="ingresar nombre del libro" [(ngModel)]="busqueda" (keyup.enter)="buscar()"/>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="cursor:pointer" (click)="buscar()">
            <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"/>
            <path d="M16.5 16.5L21 21" stroke="white" stroke-width="2"/>
          </svg>
        </div>
      </div>
      <div class="header-right">
        @if (esAdmin) {
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="cursor:pointer" (click)="irAComentario()">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        } @else {
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="cursor:pointer">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        }
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="cursor:pointer" (click)="irAPerfil()">
          <circle cx="12" cy="8" r="4" stroke="white" stroke-width="2" fill="none"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1a1a1a;
      padding: 0.6rem 1rem;
      height: 50px;
    }
    .header-left { display:flex; align-items:center; gap:0.8rem; }
    .logo-icon { cursor:pointer; }
    .btn-add {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: white;
      color: #1a1a1a;
      border: none;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .header-center { flex: 1; display:flex; justify-content:center; padding: 0 1rem; }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 0.3rem 0.8rem;
      width: 100%;
      max-width: 400px;
    }
    .search-box input {
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 0.8rem;
      flex: 1;
    }
    .search-box input::placeholder { color: rgba(255,255,255,0.6); font-size:0.75rem; }
    .header-right { display:flex; align-items:center; gap:1rem; }
  `]
})
export class Header {
  @Input() esAdmin = false;
  busqueda = '';
  constructor(private router: Router) {}
  irAHome() { this.router.navigate(['/home']); }
  irAPerfil() { this.router.navigate([this.esAdmin ? '/profile-admin' : '/profile']); }
  irAHistorial() { this.router.navigate(['/user-history']); }
  irAComentario() { this.router.navigate(['/comment-form']); }
  agregarLibro() { this.router.navigate(['/book-add']); }
  buscar() { if (this.busqueda.trim()) this.router.navigate(['/book-search'], { queryParams: { q: this.busqueda } }); }
}