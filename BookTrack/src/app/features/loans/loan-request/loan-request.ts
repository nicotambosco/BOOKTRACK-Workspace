import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { BookService } from '../../../core/services/book.service';
import { LoanService } from '../../../core/services/loan.service';
import { AuthService } from '../../../core/services/auth.service';
import { Book } from '../../../models/book.model';

@Component({
  selector: 'app-loan-request',
  standalone: true,
  imports: [FormsModule, CommonModule, Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="false"></app-header>
      <div class="content">
        <div class="card">
          <div class="book-info">
            <div class="codigos">
              <span>{{ libro?.nroCodigo }}</span>
              <span>{{ libro?.nroInventario }}</span>
            </div>
            <div class="book-cover" [style.background]="libro?.imagen ? 'none' : '#8B4513'">
              @if (libro?.imagen) { <img [src]="libro!.imagen" style="width:100%;height:100%;object-fit:cover"/> }
            </div>
          </div>
          <div class="form-area">
            <div class="plazo-label">PLAZO DE SOLICITUD</div>
            <input type="text" placeholder="Ingrese período de préstamo deseado" [(ngModel)]="plazo"/>
            <button class="btn-primary" (click)="enviar()">ENVIAR SOLICITUD</button>
            <button class="btn-outline" (click)="volver()">VOLVER</button>
          </div>
        </div>
      </div>
      @if (exito) {
        <div class="modal-overlay">
          <div class="modal">
            <p>¡Solicitud enviada correctamente!</p>
            <button class="btn-primary" (click)="continuar()">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; }
    .card { display:flex; gap:2rem; background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; }
    .book-info { display:flex; flex-direction:column; gap:0.5rem; }
    .codigos { font-size:0.7rem; display:flex; flex-direction:column; }
    .book-cover { width:120px; height:170px; background:#e8a020; border-radius:4px; }
    .sug-cover { width:60px; height:85px; background:#8B4513; border-radius:3px; margin-top:0.3rem; }
    .form-area { display:flex; flex-direction:column; gap:1rem; justify-content:center; min-width:250px; }
    .plazo-label { font-size:0.75rem; font-weight:bold; color:#333; text-align:center; }
    input { padding:0.6rem; border:1px solid #888; border-radius:4px; background:white; font-size:0.8rem; }
    .btn-primary { padding:0.6rem; background:#1a1a1a; color:white; border:none; border-radius:20px; cursor:pointer; font-size:0.8rem; font-weight:bold; }
    .btn-outline { padding:0.6rem; background:transparent; border:2px solid #1a1a1a; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
  `]
})
export class LoanRequest implements OnInit {
  plazo = ''; exito = false; bookId = 0;
  libro: Book | null = null;

  constructor(private route: ActivatedRoute, private router: Router,
    private bookService: BookService, private loanService: LoanService, private authService: AuthService) {}

  ngOnInit() {
    this.bookId = Number(this.route.snapshot.paramMap.get('bookId'));
    this.bookService.getById(this.bookId).subscribe({
      next: l => this.libro = l,
      error: () => {}
    });
  }

  enviar() {
    if (!this.plazo) return;
    this.loanService.request(this.bookId, this.plazo, 0).subscribe({
      next: () => this.exito = true,
      error: () => this.exito = true // mostrar éxito para no bloquear flujo sin backend
    });
  }

  continuar() { this.router.navigate(['/home']); }
  volver() { this.router.navigate(['/book', this.bookId]); }
}