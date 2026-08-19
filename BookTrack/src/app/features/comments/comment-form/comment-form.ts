import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../../core/services/comment.service';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="card">
        <p class="titulo">Indique sección a comentar:</p>
        <input type="text" placeholder="Ingrese la sección..." [(ngModel)]="seccion"/>
        <p class="titulo">Agregue su comentario:</p>
        <textarea placeholder="Ingrese su comentario..." [(ngModel)]="comentario" rows="6"></textarea>
        <div class="botones">
          <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
          <button class="btn-primary" (click)="enviar()">ACEPTAR</button>
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
    .page { display:flex; justify-content:center; align-items:center; height:100vh; background:#C9A96E; }
    .card { background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; width:400px; display:flex; flex-direction:column; gap:0.8rem; }
    .titulo { font-size:0.85rem; font-weight:bold; color:#333; margin:0; }
    input, textarea { padding:0.6rem; border:1px solid #888; border-radius:4px; background:white; font-size:0.8rem; resize:none; }
    .botones { display:flex; justify-content:space-between; margin-top:0.5rem; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.5rem 1.5rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.5rem; border-radius:4px; cursor:pointer; font-size:0.8rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
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
  continuar() { this.router.navigate(['/home']); }
  cancelar() { this.router.navigate(['/home']); }
}