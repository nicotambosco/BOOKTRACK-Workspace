import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="logo-area">
          <img src="assets/images/logo-booktrack.png" class="logo-img"/>
        </div>
        <input type="email" placeholder="EMAIL" [(ngModel)]="email"/>
        <input type="email" placeholder="CONFIRMAR EMAIL" [(ngModel)]="emailConfirm"/>
        <p class="info-text">Al presionar enviar se le enviará un correo al mail colocado donde podrá reestablecer su contraseña.</p>
        <button class="btn-primary" (click)="enviar()">ENVIAR</button>
        <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
      </div>
      @if (exito) {
        <div class="modal-overlay">
          <div class="modal">
            <p>¡Se ha enviado un email para restablecer la contraseña!</p>
            <button class="btn-primary" (click)="continuar()">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display:flex; justify-content:center; align-items:center; min-height:100vh; background-color:#C9A96E; }
    .card { display:flex; flex-direction:column; align-items:center; gap:0.9rem; width:340px; background:rgba(201,169,110,0.6); padding:2.5rem 2rem; border-radius:4px; }
    .logo-area { margin-bottom:0.5rem; }
    .logo-img { width:200px; object-fit:contain; filter:brightness(0); }
    input { width:100%; padding:0.65rem 1rem; border:1px solid #888; border-radius:3px; background:white; text-align:center; font-size:0.8rem; box-sizing:border-box; }
    input::placeholder { color:#888; }
    .info-text { font-size:0.75rem; text-align:center; color:#333; margin:0; }
    .btn-primary { width:100%; padding:0.6rem; background:#1a1a1a; color:white; border:none; border-radius:20px; font-size:0.8rem; letter-spacing:0.1rem; cursor:pointer; font-weight:bold; }
    .btn-outline { width:100%; padding:0.6rem; background:transparent; color:#1a1a1a; border:2px solid #1a1a1a; border-radius:20px; font-size:0.8rem; letter-spacing:0.1rem; cursor:pointer; font-weight:bold; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; max-width:300px; }
    .modal p { font-size:1rem; font-weight:bold; }
  `]
})
export class ForgotPassword {
  email=''; emailConfirm=''; exito=false; error=''; cargando=false;

  constructor(private router: Router, private authService: AuthService) {}

  enviar() {
    if (!this.email || this.email !== this.emailConfirm) { this.error='Los emails no coinciden.'; return; }
    this.cargando=true; this.error='';
    this.authService.forgotPassword(this.email).subscribe({
      next: () => { this.cargando=false; this.exito=true; },
      error: () => { this.cargando=false; this.exito=true; } // mostrar éxito igual (no revelar si existe)
    });
  }

  continuar() { this.router.navigate(['/login']); }
  cancelar() { this.router.navigate(['/login']); }
}