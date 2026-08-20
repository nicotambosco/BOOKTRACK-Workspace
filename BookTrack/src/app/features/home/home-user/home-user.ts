import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../models/book.model';

const CAT_ICONS: Record<string, string> = {
  sistemas: 'assets/icons/sistemas_filtro.png',
  química: 'assets/icons/quimica_filtros.png',
  eléctrica: 'assets/icons/Electrica_filtro.png',
  mecánica: 'assets/icons/mecanica_filtros.png',
  básicas: 'assets/icons/Basicas_filtro.png',
};

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="false"></app-header>
      <div class="home-body">
        <div class="main-content">
          <div class="content-header">
            <div class="title-icon">
              <img [src]="catIcon(catActiva)" [alt]="catActiva" class="title-icon-img"/>
            </div>
            <div>
              <h2 class="section-title">{{ vistaActual }}</h2>
              <p class="section-subtitle">Seleccioná una categoría para explorar los libros disponibles.</p>
            </div>
          </div>

          <div class="bookshelf-card">
            @if (libros.length === 0) {
              <div class="empty-state">
                <div class="empty-icon">📖</div>
                <div class="empty-text">
                  <h3>Sin libros en esta categoría.</h3>
                  <p>Cuando agregues libros, aparecerán aquí para que puedas acceder fácilmente.</p>
                </div>
              </div>
            } @else {
              <div class="bookshelf">
                @for (libro of libros; track libro.id; let i = $index) {
                  <div class="book-card" (click)="verLibro(libro.id!)">
                    <div class="book-cover" [style.background]="colorLibro(i)">
                      <span class="book-title-mini">{{ libro.titulo }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="footer-strip">
            <span class="footer-icon">🎓</span>
            <span>Reservá tu libro, seguí tu camino</span>
            <span class="footer-sep">|</span>
            <span class="footer-tagline">Contactanos a example&#64;frd.utn.edu.ar</span>
          </div>
        </div>

        <div class="sidebar" [class.collapsed]="sidebarColapsado">
          <div class="sidebar-header">
            @if (!sidebarColapsado) {
              <h3 class="sidebar-title">Categorías</h3>
            }
            <svg class="sidebar-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" (click)="sidebarColapsado = !sidebarColapsado">
              <path d="M3 6h18M3 12h12M3 18h8" stroke="#b8b8b8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          @if (!sidebarColapsado) {
            @for (cat of categorias; track cat) {
              <div class="cat-item" [class.active]="catActiva === cat" (click)="filtrar(cat)">
                <img [src]="catIcon(cat)" [alt]="cat" class="cat-icon-img"/>
                <span class="cat-label">{{ cat[0].toUpperCase() + cat.slice(1) }}</span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body { display:flex; flex:1; overflow:hidden; }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 2rem;
      overflow-y: auto;
      color: #e8e8e8;
    }
    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon {
      width: 84px; height: 84px;
      background: #1c1c1c;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink: 0;
    }
    .title-icon-img { width:56px; height:56px; object-fit:contain; }
    .section-title { font-family: Georgia, serif; font-size: 1.8rem; margin: 0 0 0.3rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .bookshelf-card {
      flex: 1;
      background: #161616;
      border-radius: 12px;
      padding: 1.5rem;
      min-height: 300px;
      display:flex;
    }
    .empty-state { display:flex; align-items:center; gap:1.5rem; margin: auto; }
    .empty-icon { font-size: 3rem; opacity:0.6; }
    .empty-text h3 { margin:0 0 0.5rem; color:#f0f0f0; font-family: Georgia, serif; font-size:1.2rem; }
    .empty-text p { margin:0; color:#8a8a8a; font-size:0.9rem; max-width: 420px; }

    .bookshelf { display: flex; flex-wrap: wrap; gap: 1rem; }
    .book-card { cursor:pointer; transition: transform 0.2s; }
    .book-card:hover { transform: translateY(-4px); }
    .book-cover {
      width: 90px;
      height: 130px;
      border-radius: 3px;
      display: flex;
      align-items: flex-end;
      padding: 0.3rem;
      box-shadow: 3px 3px 8px rgba(0,0,0,0.4);
    }
    .book-title-mini { font-size:0.6rem; color:white; font-weight:bold; }

    .footer-strip {
      display:flex; align-items:center; gap:0.6rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #2a2a2a;
      color: #8a8a8a;
      font-size: 0.85rem;
    }
    .footer-sep { opacity:0.4; }
    .footer-tagline { opacity:0.7; }

    .sidebar {
      width: 240px;
      background: #141414;
      border-left: 1px solid #232323;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      transition: width 0.25s ease, padding 0.25s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 48px; padding: 1.5rem 0.7rem; }
    .sidebar.collapsed .sidebar-header { justify-content: center; }
    .sidebar-header { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom: 0.5rem; }
    .sidebar-toggle { cursor:pointer; flex-shrink:0; }
    .sidebar-title { font-family: Georgia, serif; color:#f0f0f0; margin: 0; font-size:1.2rem; }
    .cat-item {
      display:flex; align-items:center; gap:0.7rem;
      padding: 0.7rem 0.9rem;
      cursor: pointer;
      border-radius: 8px;
      color: #b8b8b8;
      background: #1a1a1a;
      border: 1px solid transparent;
    }
    .cat-icon-img { width:18px; height:18px; object-fit:contain; }
    .cat-item:hover { background: #202020; }
    .cat-item.active { background: #232323; border-left: 3px solid #f5f5f5; color:#f5f5f5; font-weight:600; }
  `]
})
export class HomeUser implements OnInit {
  vistaActual = 'Materias Básicas';
  catActiva = 'básicas';
  sidebarColapsado = false;
  categorias = ['sistemas', 'química', 'eléctrica', 'mecánica', 'básicas'];
  libros: Book[] = [];
  colores = ['#8B4513','#2d5a8e','#1a6b3a','#e8a020','#7b3f7a','#2e7d5e'];

  constructor(private router: Router, private bookService: BookService) {}

  ngOnInit() { this.filtrar('básicas'); }

  verLibro(id: number) { this.router.navigate(['/book', id]); }

  filtrar(cat: string) {
    this.catActiva = cat;
    this.vistaActual = cat === 'básicas' ? 'Libros de Básicas' : `Libros de  ${cat[0].toUpperCase() + cat.slice(1)}`;
    this.bookService.getByCategory(cat).subscribe({
      next: l => this.libros = l,
      error: () => this.libros = []
    });
  }

  colorLibro(i: number) { return this.colores[i % this.colores.length]; }

  catIcon(cat: string) { return CAT_ICONS[cat] ?? CAT_ICONS['básicas']; }
}
