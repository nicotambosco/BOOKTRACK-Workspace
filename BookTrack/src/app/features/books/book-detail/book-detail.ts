import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../models/book.model';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [Header, CommonModule],
  template: `
    <div class="page">
      <app-header [esAdmin]="false"></app-header>
      <div class="content">
        @if (cargando) {
          <p style="padding:2rem;color:#333;">Cargando...</p>
        } @else if (!libro) {
          <div style="padding:2rem;display:flex;flex-direction:column;gap:1rem;">
            <p>No se encontró el libro.</p>
            <button class="btn-prestamo" (click)="volver()">VOLVER</button>
          </div>
        } @else {
          <div class="left-panel">
            <div class="book-cover">
              @if (libro.imagen) {
                <img [src]="libro.imagen" [alt]="libro.titulo"/>
              }
            </div>
            <div class="codigos">
              <small>{{ libro.nroCodigo }}</small>
              <small>{{ libro.nroInventario }}</small>
            </div>
          </div>
          <div class="right-panel">
            <div class="info-row"><span class="label">TÍTULO:</span><span>{{ libro.titulo }}</span></div>
            <div class="info-row"><span class="label">AUTOR:</span><span>{{ libro.autor }}</span></div>
            <div class="info-row"><span class="label">EDITORIAL:</span><span>{{ libro.editorial }}</span></div>
            <div class="info-row"><span class="label">FECHA DE PUBLICACIÓN:</span><span>{{ libro.fechaPublicacion }}</span></div>
            <div class="descripcion">
              <span class="label">DESCRIPCIÓN:</span>
              <p>{{ libro.descripcion || 'Sin descripción.' }}</p>
            </div>
            <div class="disponibles">Disponibles: {{ libro.disponibles }}</div>
            <button class="btn-prestamo" (click)="solicitarPrestamo()" [disabled]="(libro.disponibles ?? 0) === 0">
              {{ (libro.disponibles ?? 0) > 0 ? 'SOLICITAR PRÉSTAMO' : 'SIN DISPONIBILIDAD' }}
            </button>
            <div class="tipo-badge">{{ libro.tipo }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { display:flex; flex:1; padding:1.5rem; gap:2rem; overflow:auto; }
    .left-panel { display:flex; flex-direction:column; gap:0.8rem; width:180px; flex-shrink:0; }
    .book-cover { width:150px; height:210px; border-radius:4px; overflow:hidden; background:#8B4513; box-shadow:3px 3px 10px rgba(0,0,0,0.3); }
    .book-cover img { width:100%; height:100%; object-fit:cover; }
    .codigos { display:flex; flex-direction:column; font-size:0.7rem; color:#333; }
    .sugerencias { display:flex; flex-direction:column; gap:0.5rem; }
    .sug-titulo { font-size:0.7rem; font-weight:bold; color:#333; margin:0; }
    .sug-item { cursor:pointer; }
    .sug-cover { width:60px; height:85px; border-radius:2px; background:#8B4513; }
    .right-panel { flex:1; display:flex; flex-direction:column; gap:0.8rem; }
    .info-row { display:flex; gap:0.5rem; font-size:0.85rem; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:0.3rem; }
    .label { font-weight:bold; font-size:0.8rem; min-width:120px; }
    .descripcion { display:flex; flex-direction:column; gap:0.3rem; }
    .descripcion p { font-size:0.8rem; line-height:1.5; background:white; padding:0.8rem; border-radius:4px; }
    .disponibles { font-size:0.85rem; font-weight:bold; }
    .btn-prestamo {
      background:#e8a020; color:white; border:none; padding:0.7rem 1.5rem;
      border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.85rem; width:fit-content;
    }
    .tipo-badge { font-size:0.75rem; color:#555; font-style:italic; }
  `]
})
export class BookDetail implements OnInit {
  libro: Book | null = null;
  cargando = true;

  constructor(private route: ActivatedRoute, private router: Router, private bookService: BookService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookService.getById(id).subscribe({
      next: l => { this.libro = l; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  solicitarPrestamo() { if (this.libro?.id) this.router.navigate(['/loan-request', this.libro.id]); }
  verLibro(id: number) { this.router.navigate(['/book', id]); }
  volver() { this.router.navigate(['/home']); }
}