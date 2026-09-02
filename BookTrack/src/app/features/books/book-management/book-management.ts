import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';

@Component({
  selector: 'app-book-management',
  standalone: true,
  imports: [CommonModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#e8e8e8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Gestionar Libros</h2>
            <p class="section-subtitle">Edita o elimina libros del catálogo.</p>
          </div>
        </div>

        <div class="table-container">
          @if (libros.length === 0) {
            <div class="empty-state">
              <p>No hay libros en el catálogo.</p>
            </div>
          } @else {
            <table class="books-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Editorial</th>
                  <th>Categoría</th>
                  <th>Disponibles</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (libro of libros; track libro.id) {
                  <tr>
                    <td>{{ libro.titulo }}</td>
                    <td>{{ libro.autor }}</td>
                    <td>{{ libro.editorial }}</td>
                    <td>{{ libro.categoria }}</td>
                    <td>{{ libro.disponibles }}</td>
                    <td>
                      <button class="btn-edit" (click)="editarLibro(libro.id)">Editar</button>
                      <button class="btn-delete" (click)="eliminarLibro(libro.id)">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; min-height:100vh; background:#0d0d0d; }
    .page-body {
      flex:1; padding: 1.5rem 2rem; color:#e8e8e8;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .page-body::-webkit-scrollbar { width: 8px; }
    .page-body::-webkit-scrollbar-track { background: transparent; }
    .page-body::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .page-body::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .table-container {
      background:#161616; border-radius:12px; padding:1.5rem;
      overflow-x: auto; overflow-y: auto; max-height: 70vh;
      scrollbar-width: thin;
      scrollbar-color: #3a3a3a transparent;
    }
    .table-container::-webkit-scrollbar { height: 8px; width: 8px; }
    .table-container::-webkit-scrollbar-track { background: transparent; }
    .table-container::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .table-container::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }
    .empty-state { text-align:center; padding:2rem; color:#9a9a9a; }

    .books-table { width:100%; border-collapse:collapse; min-width: 100%; }
    .books-table th {
      background:#1c1c1c; padding:1rem; text-align:left; font-weight:bold;
      color:#e8e8e8; border-bottom:1px solid #2a2a2a; font-size:0.85rem;
    }
    .books-table td {
      padding:0.9rem 1rem; border-bottom:1px solid #2a2a2a; font-size:0.85rem;
    }
    .books-table tbody tr:hover { background:#1c1c1c; }

    .btn-edit, .btn-delete {
      padding:0.4rem 0.8rem; border:none; border-radius:6px; cursor:pointer;
      font-size:0.75rem; font-weight:bold; margin-right:0.4rem;
    }
    .btn-edit {
      background:#2ecc71; color:#0a0a0a;
    }
    .btn-edit:hover { background:#3ddb80; }
    .btn-delete {
      background:#e74c3c; color:#fff;
    }
    .btn-delete:hover { background:#c0392b; }
  `]
})
export class BookManagement implements OnInit {
  libros: any[] = [];

  constructor(private bookService: BookService, private router: Router) {}

  ngOnInit() {
    this.cargarLibros();
  }

  cargarLibros() {
    this.bookService.getAll().subscribe({
      next: libros => this.libros = libros,
      error: () => console.error('Error al cargar libros')
    });
  }

  editarLibro(id: number) {
    this.router.navigate(['/book-edit', id]);
  }

  eliminarLibro(id: number) {
    if (!confirm('¿Está seguro que desea eliminar este libro?')) return;
    this.bookService.delete(id).subscribe({
      next: () => this.cargarLibros(),
      error: () => alert('Error al eliminar el libro')
    });
  }
}
