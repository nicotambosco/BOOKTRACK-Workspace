import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing-page" [style.backgroundImage]="bg">
      <div class="overlay-card">
        <div class="logos-row">
          <img src="assets/images/logo-booktrack.png" class="logo-img"/>
        </div>
        <button class="btn-iniciar" (click)="irAlLogin()">INICIAR SESIÓN</button>
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
      background: rgba(20,20,20,0.72);
      border-radius: 24px;
      padding: 3rem 4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
      min-width: 500px;
    }
    .logos-row {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .logo-img {
      width: 380px;
      object-fit: contain;
    }
    .btn-iniciar {
      padding: 0.8rem 3rem;
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 30px;
      font-size: 0.95rem;
      letter-spacing: 0.15rem;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: background 0.3s;
    }
    .btn-iniciar:hover { background: rgba(255,255,255,0.25); }
  `]
})
export class Landing {
  bg = "url('assets/images/biblioteca.png')";
  constructor(private router: Router) {}
  irAlLogin() { this.router.navigate(['/login']); }
}