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
    <div class="login-page" [style.backgroundImage]="bg">
      <div class="overlay-card">
        <div class="logos-row">
          <img src="assets/images/logo3_booktrack_light.png" class="logo-img"/>
        </div>
        <span class="subtitle-line"></span>

        <p class="info-text">Ingresá tu email y te enviaremos un correo para restablecer tu contraseña.</p>

        <div class="field">
          <input type="email" placeholder="Email" [(ngModel)]="email"/>
        </div>

        <div class="field">
          <input type="email" placeholder="Confirmar email" [(ngModel)]="emailConfirm"/>
        </div>

        @if (error) { <p class="error-msg">{{ error }}</p> }

        <button class="btn-iniciar" (click)="enviar()" [disabled]="cargando">
          <img src="assets/images/icon_login.png" class="icon-login"/>
          {{ cargando ? '...' : 'ENVIAR' }}
        </button>

        <button class="btn-cancelar" (click)="cancelar()">CANCELAR</button>
      </div>

      @if (exito) {
        <div class="modal-overlay">
          <div class="overlay-card modal">
            <p>¡Se ha enviado un email para restablecer la contraseña!</p>
            <button class="btn-iniciar" (click)="continuar()">
              <img src="assets/images/icon_login.png" class="icon-login"/>
              CONTINUAR
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; width:100vw; height:100vh; overflow:hidden; }
    .login-page {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .overlay-card {
      background: rgba(24,24,24,0.85);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 2.5rem 3.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      min-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .logos-row { display: flex; align-items: center; }
    .logo-img { width: 300px; object-fit: contain; display: block; }
    .subtitle-line { width: 60px; height: 3px; background: #2ecc71; border-radius: 2px; margin-bottom: 0.5rem; }

    .info-text { color: rgba(255,255,255,0.6); font-size: 0.8rem; text-align: center; margin: 0; line-height: 1.4; }

    .field {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 30px;
      padding: 0.7rem 1.2rem;
      box-sizing: border-box;
    }
    .field input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 0.85rem;
      letter-spacing: 0.03rem;
      text-align: center;
    }
    .field input::placeholder { color: rgba(255,255,255,0.5); }

    .btn-iniciar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.9rem 2rem;
      background: rgba(46,204,113,0.15);
      color: white;
      border: 1px solid #2ecc71;
      border-radius: 30px;
      font-size: 0.9rem;
      letter-spacing: 0.12rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn-iniciar .icon-login { width: 20px; height: 20px; object-fit: contain; }
    .btn-iniciar:hover { background: rgba(46,204,113,0.28); }
    .btn-iniciar:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-cancelar {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 0.78rem;
      letter-spacing: 0.1rem;
      cursor: pointer;
      margin-top: -0.3rem;
    }
    .btn-cancelar:hover { color: rgba(255,255,255,0.8); }

    .error-msg { color: #ff6b6b; font-size: 0.78rem; text-align: center; margin: 0; }

    .modal-overlay {
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.6);
      display: flex; justify-content: center; align-items: center;
    }
    .modal { min-width: 320px; text-align: center; }
    .modal p { color: white; font-size: 0.95rem; margin: 0 0 0.5rem; }
  `]
})
export class ForgotPassword {
  bg = "url('assets/images/fondo2_login.png')";
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
