import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { Book } from '../../../models/book.model';

@Component({
  selector: 'app-book-search',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './book-search.html',
  styleUrl: './book-search.scss',
})
export class BookSearch implements OnInit {
  query = '';
  libros: Book[] = [];
  cargando = false;
  colores = ['#8B4513','#2d5a8e','#1a6b3a','#e8a020','#7b3f7a','#2e7d5e'];

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private bookService: BookService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.query = params['q'] ?? '';
      this.buscar();
    });
  }

  buscar() {
    this.cargando = true;
    if (this.query) {
      this.bookService.search(this.query).subscribe(l => { this.libros = l; this.cargando = false; });
    } else {
      this.bookService.getAll().subscribe(l => { this.libros = l; this.cargando = false; });
    }
  }

  irADetalle(id: number) { this.router.navigate(['/book', id]); }

  colorLibro(i: number) { return this.colores[i % this.colores.length]; }
}
