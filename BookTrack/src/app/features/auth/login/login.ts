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
      <div class="overlay-card">
        <div class="logos-row">
          <img src="assets/images/logo3_booktrack_light.png" class="logo-img"/>
        </div>
        <span class="subtitle-line"></span>

        <div class="field">
          <img src="assets/images/icon_person.png" class="field-icon"/>
          <input type="text" placeholder="Usuario o email" [(ngModel)]="legajo"/>
        </div>

        <div class="field">
          <img src="assets/images/icon_lock.png" class="field-icon"/>
          <input [type]="verPassword ? 'text' : 'password'" placeholder="Contraseña" [(ngModel)]="password"/>
          <img [src]="verPassword ? 'assets/images/icon_eye_off.png' : 'assets/images/icon_eye.png'"
               class="field-icon-toggle" (click)="verPassword = !verPassword"/>
        </div>

        <div class="row-extra">
          <label class="recordarme">
            <input type="checkbox" [(ngModel)]="recordarme"/> Recordarme
          </label>
          <a class="olvide-link" (click)="irAOlvide()">¿Olvidaste tu contraseña?</a>
        </div>

        <button class="btn-iniciar" (click)="login()" [disabled]="cargando">
          <img src="assets/images/icon_login.png" class="icon-login"/>
          {{ cargando ? '...' : 'INICIAR SESIÓN' }}
        </button>

        @if (error) { <p class="error-msg">{{ error }}</p> }

        <button class="btn-cancelar" (click)="cancelar()">CANCELAR</button>
      </div>
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
    .logos-row {
      display: flex;
      align-items: center;
    }
    .logo-img { width: 300px; object-fit: contain; display: block; }
    .subtitle-line { width: 60px; height: 3px; background: #2ecc71; border-radius: 2px; margin-bottom: 0.5rem; }

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
    .field-icon { width: 18px; height: 18px; object-fit: contain; }
    .field-icon-toggle { width: 18px; height: 18px; object-fit: contain; cursor: pointer; margin-left: auto; }
    .field input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: white;
      font-size: 0.85rem;
      letter-spacing: 0.03rem;
    }
    .field input::placeholder { color: rgba(255,255,255,0.5); }

    .row-extra {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }
    .recordarme { color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .olvide-link { color: #2ecc71; cursor: pointer; text-decoration: none; }
    .olvide-link:hover { text-decoration: underline; }

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
  `]
})
export class Login {
  bg = "url('assets/images/fondo2_login.png')";
  legajo = ''; password = ''; cargando = false; error = ''; recordarme = false; verPassword = false;

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
