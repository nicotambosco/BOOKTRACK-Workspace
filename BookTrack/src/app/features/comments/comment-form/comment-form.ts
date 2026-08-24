import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Header } from '../../../shared/components/header/header';
import { CommentService } from '../../../core/services/comment.service';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [FormsModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="page-body">
        <div class="page-container">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#e8e8e8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Comentarios</h2>
            <p class="section-subtitle">Dejá una observación sobre alguna sección del sistema.</p>
          </div>
        </div>

        <div class="form-card">
          <div class="campo">
            <label>SECCIÓN A COMENTAR</label>
            <input type="text" placeholder="Ingrese la sección..." [(ngModel)]="seccion"/>
          </div>
          <div class="campo">
            <label>COMENTARIO</label>
            <textarea placeholder="Ingrese su comentario..." [(ngModel)]="comentario" rows="6"></textarea>
          </div>
          <div class="botones">
            <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
            <button class="btn-primary" (click)="enviar()">ACEPTAR</button>
          </div>
        </div>
        </div>
      </div>
      @if (exito) {
        <div class="modal-overlay">
          <div class="modal">
            <p>¡Comentario Enviado Correctamente!</p>
            <button class="btn-primary" (click)="continuar()">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0d0d0d; }
    .page-body { flex:1; overflow-y:auto; display:flex; justify-content:center; padding: 1.5rem 2rem; color:#e8e8e8; }
    .page-container { width:100%; max-width:520px; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon { width:72px; height:72px; background:#1c1c1c; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .form-card { background:#161616; border-radius:12px; padding:2rem; display:flex; flex-direction:column; gap:1.2rem; width:100%; box-sizing:border-box; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    input, textarea {
      padding:0.7rem 0.9rem; border:1px solid #2a2a2a; border-radius:8px;
      background:#101010; color:#e8e8e8; font-size:0.85rem; resize:none;
    }
    input::placeholder, textarea::placeholder { color:#6a6a6a; }

    .botones { display:flex; justify-content:flex-end; gap:0.9rem; margin-top:0.5rem; }
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
export class CommentForm {
  seccion=''; comentario=''; exito=false;
  constructor(private router: Router, private commentService: CommentService) {}
  enviar() {
    if (!this.seccion || !this.comentario) return;
    this.commentService.send(this.seccion, this.comentario).subscribe({
      next: () => this.exito=true,
      error: () => this.exito=true
    });
  }
  continuar() { this.router.navigate(['/home-admin']); }
  cancelar() { this.router.navigate(['/home-admin']); }
}
