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
    <div class="page">
      <app-header [esAdmin]="true"></app-header>
      <div class="content">
        <div class="card">
          <div class="left-panel">
            <div class="cover-placeholder">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <rect x="8" y="4" width="34" height="46" rx="2" stroke="#888" stroke-width="2" fill="none"/>
                <circle cx="42" cy="42" r="12" fill="#1a1a1a"/>
                <line x1="42" y1="36" x2="42" y2="48" stroke="white" stroke-width="2"/>
                <line x1="36" y1="42" x2="48" y2="42" stroke="white" stroke-width="2"/>
              </svg>
              <button class="btn-imagen" (click)="agregarImagen()">AGREGAR IMÁGENES</button>
            </div>
            <select [(ngModel)]="categoriaSeleccionada">
              <option value="">seleccionar en libro</option>
              <option *ngFor="let c of categorias" [value]="c">{{ c }}</option>
            </select>
          </div>
          <div class="right-panel">
            <div class="campo"><label>TÍTULO:</label><input [(ngModel)]="libro.titulo" placeholder="Ingrese Título"/></div>
            <div class="campo"><label>AUTOR:</label><input [(ngModel)]="libro.autor" placeholder="Ingrese Autor"/></div>
            <div class="campo"><label>EDITORIAL:</label><input [(ngModel)]="libro.editorial" placeholder="Ingrese Editorial"/></div>
            <div class="campo"><label>FECHA DE PUBLICACIÓN:</label><input [(ngModel)]="libro.fechaPublicacion" placeholder="Ingrese Fecha de Publicación"/></div>
            <div class="campo descripcion"><label>DESCRIPCIÓN:</label><textarea [(ngModel)]="libro.descripcion" rows="4" placeholder="Ingrese una descripción del libro..."></textarea></div>
            <div class="codigos-row">
              <div class="campo"><label>nro de código:</label><input [(ngModel)]="libro.nroCodigo" placeholder="ingrese numero"/></div>
              <div class="campo"><label>nro de inventario:</label><input [(ngModel)]="libro.nroInventario" placeholder="ingrese numero"/></div>
            </div>
            <div class="botones">
              <button class="btn-primary" (click)="guardar()">GUARDAR</button>
              <button class="btn-outline" (click)="salir()">SALIR</button>
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
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; overflow:auto; }
    .card { background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; display:flex; gap:2rem; width:100%; max-width:750px; }
    .left-panel { display:flex; flex-direction:column; gap:1rem; align-items:center; }
    .cover-placeholder { width:140px; height:190px; border:2px dashed #888; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; background:rgba(255,255,255,0.3); }
    .btn-imagen { background:#1a1a1a; color:white; border:none; padding:0.3rem 0.5rem; border-radius:4px; cursor:pointer; font-size:0.7rem; }
    select { padding:0.4rem; border:1px solid #888; border-radius:4px; background:white; font-size:0.75rem; width:140px; }
    .right-panel { flex:1; display:flex; flex-direction:column; gap:0.7rem; }
    .campo { display:flex; flex-direction:column; gap:0.2rem; }
    .campo label { font-size:0.7rem; font-weight:bold; color:#333; }
    .campo input, .campo textarea { padding:0.4rem 0.6rem; border:1px solid #888; border-radius:4px; background:white; font-size:0.8rem; resize:none; }
    .codigos-row { display:flex; gap:1rem; }
    .codigos-row .campo { flex:1; }
    .botones { display:flex; gap:0.8rem; margin-top:0.5rem; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.5rem 1.2rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.2rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
  `]
})
export class BookAdd implements OnInit {
  modal=false; modalMsg=''; categoriaSeleccionada='';
  categorias: string[] = [];
  libro = { titulo:'', autor:'', editorial:'', fechaPublicacion:'', descripcion:'', nroCodigo:'', nroInventario:'' };

  constructor(private router: Router, private bookService: BookService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: cats => this.categorias = cats.map(c => c.nombre),
      error: () => this.categorias = ['sistemas','química','electricia','mecánica','básicas']
    });
  }

  guardar() {
    if (!this.libro.titulo || !this.libro.autor) { this.modalMsg='¡Revise y complete todos los campos!'; this.modal=true; return; }
    this.bookService.create({ ...this.libro, categoria: this.categoriaSeleccionada }).subscribe({
      next: () => { this.modalMsg='¡Libro añadido exitosamente!'; this.modal=true; },
      error: () => { this.modalMsg='Error al guardar. Intente de nuevo.'; this.modal=true; }
    });
  }

  cerrarModal() { this.modal=false; if (this.modalMsg.includes('exitosamente')) this.router.navigate(['/home-admin']); }
  agregarImagen() { }
  salir() { this.router.navigate(['/home-admin']); }
}