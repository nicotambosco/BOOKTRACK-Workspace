import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { LoanService } from '../../../core/services/loan.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, Header],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  cargando = false;
  librosTotal = 0;
  usuariosTotal = 0;
  prestamosPendientes = 0;
  prestamosAprobados = 0;
  prestamosDevueltos = 0;

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.bookService.getAll().subscribe({ next: l => this.librosTotal = l.length, error: () => {} });
    this.userService.getAll().subscribe({ next: u => this.usuariosTotal = u.length, error: () => {} });
    this.loanService.getAll().subscribe({
      next: prestamos => {
        this.prestamosPendientes = prestamos.filter(p => p.estado === 'pendiente').length;
        this.prestamosAprobados = prestamos.filter(p => p.estado === 'aprobado').length;
        this.prestamosDevueltos = prestamos.filter(p => p.estado === 'devuelto').length;
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }
}
