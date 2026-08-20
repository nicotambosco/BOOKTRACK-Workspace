import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing-page" [style.backgroundImage]="bg">
      <div class="overlay-card">
        <div class="logos-row">
          <img src="assets/images/logo3_booktrack_light.png" class="logo-img"/>
        </div>
        <span class="subtitle-line"></span>
        <button class="btn-iniciar" (click)="irAlLogin()">
          <img src="assets/images/icon_login.png" class="icon-login"/>
          INICIAR SESIÓN
        </button>
      </div>
    </div>
  `,
  styles: [`
    .landing-page {
      width: 100vw;
      height: 100vh;
      background-size: cover;
      background-position: center;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    .overlay-card {
      background: rgba(24,24,24,0.85);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 2.5rem 3.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      min-width: 460px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .logos-row {
      display: flex;
      align-items: center;
    }
    .logo-img {
      width: 420px;
      object-fit: contain;
      display: block;
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      letter-spacing: 0.05rem;
      margin-top: -0.75rem;
    }
    .subtitle-line {
      width: 60px;
      height: 3px;
      background: #2ecc71;
      border-radius: 2px;
      margin-bottom: 0.5rem;
    }
    .btn-iniciar {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.8rem 2.5rem;
      background: rgba(255,255,255,0.05);
      color: white;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 30px;
      font-size: 0.85rem;
      letter-spacing: 0.12rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn-iniciar .icon-login { width: 18px; height: 18px; object-fit: contain; }
    .btn-iniciar:hover { background: rgba(255,255,255,0.12); }
  `]
})
export class Landing {
  bg = "url('assets/images/fondo2_login.png')";
  constructor(private router: Router) {}
  irAlLogin() { this.router.navigate(['/login']); }
}
