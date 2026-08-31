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
    <div class="home-page">
      <app-header [esAdmin]="false"></app-header>
      <div class="home-body">
        @if (cargando) {
          <p class="estado-msg">Cargando...</p>
        } @else if (!libro) {
          <div class="estado-msg-col">
            <p>No se encontró el libro.</p>
            <button class="btn-primary" (click)="volver()">VOLVER</button>
          </div>
        } @else {
          <div class="content-header">
            <div class="title-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#e8e8e8" stroke-width="2" fill="none"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h2 class="section-title">{{ libro.titulo }}</h2>
              <p class="section-subtitle">{{ libro.autor }}</p>
            </div>
          </div>

          <div class="detail-card">
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

            <div class="divider-v"></div>

            <div class="right-panel">
              <div class="info-row"><span class="label">TÍTULO</span><span>{{ libro.titulo }}</span></div>
              <div class="info-row"><span class="label">AUTOR</span><span>{{ libro.autor }}</span></div>
              <div class="info-row"><span class="label">EDITORIAL</span><span>{{ libro.editorial }}</span></div>
              <div class="info-row"><span class="label">FECHA DE PUBLICACIÓN</span><span>{{ libro.fechaPublicacion }}</span></div>
              <div class="campo">
                <label>DESCRIPCIÓN</label>
                <p class="descripcion-texto">{{ libro.descripcion || 'Sin descripción.' }}</p>
              </div>
              <div class="disponibles">Disponibles: {{ libro.disponibles }}</div>
              <div class="botones">
                <button class="btn-primary" (click)="solicitarPrestamo()" [disabled]="(libro.disponibles ?? 0) === 0">
                  {{ (libro.disponibles ?? 0) > 0 ? 'SOLICITAR PRÉSTAMO' : 'SIN DISPONIBILIDAD' }}
                </button>
                <button class="btn-outline" (click)="volver()">VOLVER</button>
              </div>
              @if (libro.tipo) { <div class="tipo-badge">{{ libro.tipo }}</div> }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body { flex:1; display:flex; flex-direction:column; padding: 1.5rem 2rem; overflow-y:auto; color:#e8e8e8; }
    .estado-msg { color:#9a9a9a; }
    .estado-msg-col { display:flex; flex-direction:column; gap:1rem; align-items:flex-start; color:#9a9a9a; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon {
      width: 72px; height: 72px;
      background: #1c1c1c;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink: 0;
    }
    .section-title { font-family: Georgia, serif; font-size: 1.6rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .detail-card {
      background: #161616;
      border-radius: 12px;
      padding: 2.5rem;
      display: flex;
      gap: 2.5rem;
    }
    .left-panel { display:flex; flex-direction:column; gap:0.9rem; align-items:center; width: 220px; flex-shrink:0; }
    .book-cover { width:150px; height:210px; border-radius:4px; overflow:hidden; background:#232323; box-shadow:3px 3px 10px rgba(0,0,0,0.4); }
    .book-cover img { width:100%; height:100%; object-fit:cover; }
    .codigos { display:flex; flex-direction:column; align-items:center; font-size:0.7rem; color:#8a8a8a; gap:0.15rem; }

    .divider-v { width:1px; background:#2a2a2a; align-self: stretch; }

    .right-panel { flex:1; display:flex; flex-direction:column; gap:0.9rem; max-width: 560px; }
    .info-row { display:flex; gap:0.8rem; font-size:0.85rem; border-bottom:1px solid #2a2a2a; padding-bottom:0.5rem; }
    .label { font-weight:bold; font-size:0.72rem; color:#9a9a9a; letter-spacing:0.03rem; min-width:150px; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .descripcion-texto { font-size:0.85rem; line-height:1.5; background:#101010; border:1px solid #2a2a2a; color:#e8e8e8; padding:0.8rem 0.9rem; border-radius:8px; margin:0; }
    .disponibles { font-size:0.85rem; font-weight:bold; color:#e8e8e8; }

    .botones { display:flex; gap:0.9rem; margin-top:0.3rem; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.65rem 2rem;
      border-radius:24px; cursor:pointer; font-size:0.85rem; font-weight:700;
      box-shadow: 0 0 16px rgba(46,204,113,0.35);
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }

    .tipo-badge { font-size:0.75rem; color:#8a8a8a; font-style:italic; }
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