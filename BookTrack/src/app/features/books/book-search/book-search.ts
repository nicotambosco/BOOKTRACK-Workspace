import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';
import { Book } from '../../../models/book.model';
import { Category } from '../../../models/category.model';

@Component({
  selector: 'app-book-search',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './book-search.html',
  styleUrl: './book-search.scss',
})
export class BookSearch implements OnInit {
  query = '';
  categoriaSeleccionada = '';
  libros: Book[] = [];
  categorias: Category[] = [];
  cargando = false;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private bookService: BookService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.categoryService.getAll().subscribe(c => this.categorias = c);
    this.route.queryParams.subscribe(params => {
      this.query = params['q'] ?? '';
      this.categoriaSeleccionada = params['categoria'] ?? '';
      this.buscar();
    });
  }

  buscar() {
    this.cargando = true;
    if (this.query) {
      this.bookService.search(this.query).subscribe(l => { this.libros = l; this.cargando = false; });
    } else if (this.categoriaSeleccionada) {
      this.bookService.getByCategory(this.categoriaSeleccionada).subscribe(l => { this.libros = l; this.cargando = false; });
    } else {
      this.bookService.getAll().subscribe(l => { this.libros = l; this.cargando = false; });
    }
  }

  filtrarCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
    this.query = '';
    this.buscar();
  }

  irADetalle(id: number) { this.router.navigate(['/book', id]); }
}
