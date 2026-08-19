import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="login-page" [style.backgroundImage]="bg">
      <div class="logo-area">
        <img src="assets/images/logo-booktrack.png" class="logo-utn"/>
      </div>
      <div class="book-wrapper">
        <img src="assets/images/Libro.png" class="libro-img"/>
        <div class="inputs-overlay">
          <input type="text" placeholder="INGRESE LEGAJO / CORREO" [(ngModel)]="legajo"/>
          <input type="password" placeholder="CONTRASEÑA" [(ngModel)]="password"/>
          <a class="olvide-link" (click)="irAOlvide()">olvidé mi contraseña</a>
        </div>
      </div>
      <div class="botones">
        <button class="btn-primary" (click)="login()" [disabled]="cargando">{{ cargando ? '...' : 'CONTINUAR' }}</button>
        <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
      </div>
      @if (error) { <p class="error-msg">{{ error }}</p> }
    </div>
  `,
  styles: [`
    :host { display:block; width:100vw; height:100vh; overflow:hidden; }
    .login-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      gap: 1.5rem;
    }
    .logo-area { display:flex; align-items:center; gap:1rem; }
    .logo-utn { height:130px; object-fit:contain; }
    .book-wrapper { position:relative; width:400px; height:260px; }
    .libro-img { width:100%; height:100%; object-fit:contain; }
    .inputs-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 75%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }
    input {
      width: 100%;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 20px;
      background: rgba(255,255,255,0.85);
      text-align: center;
      font-size: 0.78rem;
      letter-spacing: 0.08rem;
      box-sizing: border-box;
      color: #333;
    }
    input::placeholder { color:#666; font-size:0.75rem; }
    .olvide-link { font-size:0.72rem; color:#1a1a1a; text-decoration:underline; cursor:pointer; align-self:flex-end; }
    .botones { display:flex; gap:1rem; }
    .btn-primary { padding:0.6rem 2rem; background:#1a1a1a; color:white; border:none; border-radius:20px; font-size:0.85rem; letter-spacing:0.1rem; cursor:pointer; font-weight:bold; }
    .btn-primary:disabled { background:#666; cursor:not-allowed; }
    .btn-outline { padding:0.6rem 2rem; background:white; color:#1a1a1a; border:2px solid #1a1a1a; border-radius:20px; font-size:0.85rem; letter-spacing:0.1rem; cursor:pointer; font-weight:bold; }
    .error-msg { color:#c0392b; font-size:0.78rem; text-align:center; background:rgba(255,255,255,0.8); padding:0.4rem 1rem; border-radius:4px; }
  `]
})
export class Login {
  bg = "url('assets/images/paper-texture.png')";
  legajo = ''; password = ''; cargando = false; error = '';

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    if (!this.legajo || !this.password) { this.error = 'Completá los campos.'; return; }
    this.cargando = true; this.error = '';
    this.authService.login(this.legajo, this.password).subscribe({
      next: res => {
        this.cargando = false;
        this.router.navigate([res.user.categoria === 'bibliotecario' ? '/home-admin' : '/home']);
      },
      error: () => { this.cargando = false; this.error = 'Credenciales incorrectas.'; }
    });
  }

  cancelar() { this.router.navigate(['/']); }
  irAOlvide() { this.router.navigate(['/forgot-password']); }
}