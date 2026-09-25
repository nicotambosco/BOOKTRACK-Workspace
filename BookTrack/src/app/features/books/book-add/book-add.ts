import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-book-add',
  standalone: true,
  imports: [FormsModule, CommonModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="page-container">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="18" rx="2" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M12 8v6M9 11h6" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Agregar Libro</h2>
            <p class="section-subtitle">Completá los datos para sumarlo al catálogo.</p>
          </div>
        </div>

        <div class="form-card">
          <div class="left-panel">
            <div class="cover-placeholder">
              @if (libro.imagen) {
                <img [src]="libro.imagen" alt="portada" />
              } @else {
                <svg width="50" height="50" viewBox="0 0 60 60" fill="none">
                  <rect x="8" y="4" width="34" height="46" rx="2" stroke="#5a5a5a" stroke-width="2" fill="none"/>
                  <circle cx="42" cy="42" r="12" fill="#1c1c1c"/>
                  <line x1="42" y1="36" x2="42" y2="48" stroke="#e8e8e8" stroke-width="2"/>
                  <line x1="36" y1="42" x2="48" y2="42" stroke="#e8e8e8" stroke-width="2"/>
                </svg>
              }
              <input #fileInput type="file" accept="image/*" hidden (change)="onImagenSeleccionada($event)"/>
              <button class="btn-outline btn-sm" (click)="fileInput.click()">AGREGAR IMÁGENES</button>
            </div>
            <select [(ngModel)]="categoriaSeleccionada">
              <option value="">seleccionar categoría</option>
              <option *ngFor="let c of categorias" [value]="c">{{ c }}</option>
            </select>
          </div>
          <div class="right-panel">
            <div class="campo"><label>TÍTULO</label><input [(ngModel)]="libro.titulo" placeholder="Ingrese Título"/></div>
            <div class="campo"><label>AUTOR</label><input [(ngModel)]="libro.autor" placeholder="Ingrese Autor"/></div>
            <div class="campo"><label>EDITORIAL</label><input [(ngModel)]="libro.editorial" placeholder="Ingrese Editorial"/></div>
            <div class="campo"><label>FECHA DE PUBLICACIÓN</label><input [(ngModel)]="libro.fechaPublicacion" placeholder="Ingrese Fecha de Publicación"/></div>
            <div class="campo"><label>DESCRIPCIÓN</label><textarea [(ngModel)]="libro.descripcion" rows="4" placeholder="Ingrese una descripción del libro..."></textarea></div>
            <div class="codigos-row">
              <div class="campo"><label>NRO DE CÓDIGO</label><input [(ngModel)]="libro.nroCodigo" placeholder="ingrese numero"/></div>
              <div class="campo"><label>NRO DE INVENTARIO</label><input [(ngModel)]="libro.nroInventario" placeholder="ingrese numero"/></div>
            </div>
            <div class="botones">
              <button class="btn-primary" (click)="guardar()">GUARDAR</button>
              <button class="btn-outline" (click)="salir()">SALIR</button>
            </div>
          </div>
        </div>
        </div>
      </div>
      @if (modal) {
        <div class="modal-overlay">
          <div class="modal">
            <p>{{ modalMsg }}</p>
            <button class="btn-primary" (click)="cerrarModal()">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .page-body {
      flex:1; overflow-y:auto; color:#e8e8e8;
      display:flex; justify-content:center; padding: 1.5rem 2rem;
      scrollbar-color:#3a3a3a #0d0d0d; scrollbar-width:thin;
    }
    .page-body::-webkit-scrollbar { width:10px; }
    .page-body::-webkit-scrollbar-track { background:#0d0d0d; }
    .page-body::-webkit-scrollbar-thumb { background:#3a3a3a; border-radius:6px; }
    .page-body::-webkit-scrollbar-thumb:hover { background:#4a4a4a; }
    .page-container { width:100%; max-width:900px; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .form-card { background:#161616; border-radius:12px; padding:2.5rem; display:flex; gap:2.5rem; width:100%; box-sizing:border-box; }
    .left-panel { display:flex; flex-direction:column; gap:1rem; align-items:center; }
    .cover-placeholder {
      width:140px; height:190px; border:2px dashed #3a3a3a; border-radius:8px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.7rem;
      background:#101010; overflow:hidden;
    }
    .cover-placeholder img { width:100%; height:100%; object-fit:cover; }
    select { padding:0.5rem; border:1px solid #2a2a2a; border-radius:8px; background:#101010; color:#e8e8e8; font-size:0.8rem; width:140px; }

    .right-panel { flex:1; display:flex; flex-direction:column; gap:1rem; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .campo input, .campo textarea {
      padding:0.7rem 0.9rem; border:1px solid #2a2a2a; border-radius:8px;
      background:#101010; color:#e8e8e8; font-size:0.85rem; resize:none;
    }
    .campo input::placeholder, .campo textarea::placeholder { color:#6a6a6a; }
    .codigos-row { display:flex; gap:1rem; }
    .codigos-row .campo { flex:1; }

    .botones { display:flex; gap:0.9rem; margin-top:0.5rem; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.65rem 2rem;
      border-radius:24px; cursor:pointer; font-size:0.85rem; font-weight:700;
      box-shadow: 0 0 16px rgba(46,204,113,0.35);
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }
    .btn-outline.btn-sm { padding:0.35rem 0.8rem; font-size:0.7rem; }

    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class BookAdd implements OnInit {
  modal=false; modalMsg=''; categoriaSeleccionada='';
  categorias: string[] = [];
  libro = { titulo:'', autor:'', editorial:'', fechaPublicacion:'', descripcion:'', nroCodigo:'', nroInventario:'', imagen:'' };

  constructor(private router: Router, private bookService: BookService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: cats => this.categorias = cats.map(c => c.nombre),
      error: () => this.categorias = ['sistemas','química','electricia','mecánica','básicas']
    });
  }

  guardar() {
    if (!this.libro.titulo || !this.libro.autor) { this.modalMsg='¡Revise y complete todos los campos!'; this.modal=true; return; }
    if (!this.categoriaSeleccionada) { this.modalMsg='¡Seleccione una categoría!'; this.modal=true; return; }
    this.bookService.create({ ...this.libro, categoria: this.categoriaSeleccionada }).subscribe({
      next: () => { this.modalMsg='¡Libro añadido exitosamente!'; this.modal=true; },
      error: () => { this.modalMsg='Error al guardar. Intente de nuevo.'; this.modal=true; }
    });
  }

  cerrarModal() { this.modal=false; if (this.modalMsg.includes('exitosamente')) this.router.navigate(['/home-admin']); }

  onImagenSeleccionada(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.bookService.uploadImage(file).subscribe(res => this.libro.imagen = res.url);
  }

  salir() { this.router.navigate(['/home-admin']); }
}
