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
    <div class="home-page">
      <app-header [esAdmin]="false"></app-header>
      <div class="home-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M8 9h8M8 13h5" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Solicitud de Préstamo</h2>
            <p class="section-subtitle">Indicá el plazo que necesitás para este libro.</p>
          </div>
        </div>

        <div class="request-card">
          <div class="left-panel">
            <div class="book-cover" [style.background]="libro?.imagen ? 'none' : '#8B4513'">
              @if (libro?.imagen) { <img [src]="libro!.imagen" alt="portada"/> }
            </div>
            <div class="codigos">
              <small>{{ libro?.nroCodigo }}</small>
              <small>{{ libro?.nroInventario }}</small>
            </div>
          </div>

          <div class="divider-v"></div>

          <div class="form-area">
            <div class="campo-fila">
              <div class="campo">
                <label>DESDE</label>
                <input type="date" [(ngModel)]="desde" [min]="hoy"/>
              </div>
              <div class="campo">
                <label>HASTA</label>
                <input type="date" [(ngModel)]="hasta" [min]="desde || hoy"/>
              </div>
            </div>
            @if (error) { <p class="error-msg">{{ error }}</p> }
            <div class="botones">
              <button class="btn-primary" (click)="enviar()" [disabled]="!desde || !hasta">ENVIAR SOLICITUD</button>
              <button class="btn-outline" (click)="volver()">VOLVER</button>
            </div>
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
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .home-body { flex:1; display:flex; flex-direction:column; align-items:center; padding: 1.5rem 2rem; overflow-y:auto; color:#e8e8e8; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.6rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .request-card { background:#161616; border-radius:12px; padding:2.5rem; display:flex; gap:2.5rem; max-width: 700px; }
    .left-panel { display:flex; flex-direction:column; gap:0.9rem; align-items:center; width: 140px; flex-shrink:0; }
    .book-cover { width:120px; height:170px; border-radius:4px; overflow:hidden; box-shadow:3px 3px 10px rgba(0,0,0,0.4); }
    .book-cover img { width:100%; height:100%; object-fit:cover; }
    .codigos { display:flex; flex-direction:column; align-items:center; font-size:0.7rem; color:#8a8a8a; gap:0.15rem; }

    .divider-v { width:1px; background:#2a2a2a; align-self: stretch; }

    .form-area { flex:1; display:flex; flex-direction:column; gap:1.2rem; justify-content:center; }
    .campo-fila { display:flex; gap:1rem; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; flex:1; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .campo input {
      padding:0.7rem 0.9rem; border:1px solid #2a2a2a; border-radius:8px;
      background:#101010; color:#e8e8e8; font-size:0.85rem;
      color-scheme: dark;
    }
    .campo input::placeholder { color:#6a6a6a; }

    .error-msg { color: #ff6b6b; font-size: 0.8rem; margin: 0; }
    .botones { display:flex; gap:0.9rem; margin-top:0.3rem; }
    .btn-primary {
      background:#2ecc71; color:#0a0a0a; border:none; padding:0.65rem 2rem;
      border-radius:24px; cursor:pointer; font-size:0.85rem; font-weight:700;
      box-shadow: 0 0 16px rgba(46,204,113,0.35);
    }
    .btn-primary:hover { background:#3ddb80; }
    .btn-outline { background:transparent; border:1px solid #3a3a3a; color:#e8e8e8; padding:0.65rem 2rem; border-radius:24px; cursor:pointer; font-size:0.85rem; }
    .btn-outline:hover { background:#1a1a1a; }

    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; }
    .modal { background:#161616; border:1px solid #2a2a2a; padding:2rem 3rem; border-radius:12px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; color:#f5f5f5; margin:0; }
  `]
})
export class LoanRequest implements OnInit {
  desde = ''; hasta = ''; exito = false; error = ''; bookId = 0;
  hoy = new Date().toISOString().slice(0, 10);
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
    if (!this.desde || !this.hasta) return;
    const plazo = `${this.desde} a ${this.hasta}`;
    this.loanService.request(this.bookId, plazo, 0).subscribe({
      next: () => this.exito = true,
      error: () => this.error = 'No se pudo enviar la solicitud. Intentá de nuevo.'
    });
  }

  continuar() { this.router.navigate(['/home']); }
  volver() { this.router.navigate(['/book', this.bookId]); }
}