import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile-admin',
  standalone: true,
  imports: [FormsModule, CommonModule, Header],
  template: `
    <div class="home-page">
      <app-header [esAdmin]="true"></app-header>
      <div class="profile-body">
        <div class="content-header">
          <div class="title-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#e8e8e8" stroke-width="2" fill="none"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#e8e8e8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 class="section-title">Mi Perfil</h2>
            <p class="section-subtitle">Consultá tus datos y actualizá tu email.</p>
          </div>
        </div>

        <div class="profile-card">
          <div class="avatar-col">
            <div class="avatar">
              <div class="avatar-photo">
                @if (usuario.imagen) {
                  <img [src]="usuario.imagen" alt="foto de perfil" class="avatar-img"/>
                } @else {
                  <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="22" r="12" stroke="#e8e8e8" stroke-width="2" fill="none"/>
                    <path d="M10 52c0-11 9-19 20-19s20 8 20 19" stroke="#e8e8e8" stroke-width="2" fill="none"/>
                  </svg>
                }
              </div>
            </div>

            <button class="pill-rol rol-bibliotecario">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              Bibliotecario
            </button>

            <button class="pill-historial" (click)="irAHistorial()">
              Historial de préstamos
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <button class="pill-logout" (click)="cerrarSesion()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Cerrar sesión
            </button>
          </div>

          <div class="divider-v"></div>

          <div class="form-area">
            <div class="campo">
              <label for="nombrePerfil">NOMBRE Y APELLIDO</label>
              <input id="nombrePerfil" [value]="usuario.nombreApellido" readonly/>
            </div>
            <div class="campo">
              <label for="legajoPerfil">LEGAJO</label>
              <input id="legajoPerfil" [value]="usuario.legajo" readonly/>
            </div>
            <div class="campo">
              <label for="emailPerfil">EMAIL</label>
              <input id="emailPerfil" type="email" [disabled]="!editando || guardando" [(ngModel)]="usuario.email" [placeholder]="editando ? 'Ingrese Email' : ''"/>
            </div>
            @if (errorPerfil) { <p class="error-perfil" role="alert">{{ errorPerfil }}</p> }
            <div class="botones">
              @if (!editando) {
                <button class="btn-primary" (click)="editando=true">EDITAR</button>
                <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
              } @else {
                <button class="btn-primary" (click)="guardar()" [disabled]="guardando">{{ guardando ? 'GUARDANDO…' : 'GUARDAR' }}</button>
                <button class="btn-outline" (click)="cancelarEdicion()" [disabled]="guardando">SALIR</button>
              }
            </div>
          </div>
        </div>
      </div>
      @if (exito) {
        <div class="modal-overlay">
          <div class="modal">
            <p>¡Información Actualizada!</p>
            <button class="btn-primary" (click)="exito=false">CONTINUAR</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-page { display:flex; flex-direction:column; height:100vh; background:#0a0a0a; }
    .profile-body {
      flex:1; padding: 1.5rem 2rem; color:#e8e8e8;
      overflow-y: auto; scrollbar-width: thin; scrollbar-color: #3a3a3a transparent;
    }
    .profile-body::-webkit-scrollbar { width: 8px; }
    .profile-body::-webkit-scrollbar-track { background: transparent; }
    .profile-body::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
    .profile-body::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

    .content-header { display:flex; align-items:center; gap:1rem; margin-bottom: 1.5rem; }
    .title-icon {
      width: 72px; height: 72px;
      background: #1c1c1c;
      border-radius: 14px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink: 0;
    }
    .section-title { font-family: Georgia, serif; font-size: 1.7rem; margin: 0 0 0.2rem; color:#f5f5f5; }
    .section-subtitle { margin:0; color:#9a9a9a; font-size:0.9rem; }

    .profile-card {
      background: #161616;
      border-radius: 12px;
      padding: 2.5rem;
      display: flex;
      gap: 2.5rem;
    }
    .avatar-col { display:flex; flex-direction:column; align-items:center; gap:0.9rem; width: 220px; flex-shrink:0; }
    .avatar { position:relative; width:100px; height:100px; }
    .avatar-photo { width:100%; height:100%; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#232323; overflow:hidden; }
    .avatar-img { width:100%; height:100%; object-fit:cover; }

    .pill-rol {
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width: 100%;
      padding:0.55rem 1rem; border-radius:24px; font-size:0.85rem; font-weight:600;
      background: transparent; cursor: default;
    }
    .pill-rol.rol-usuario { color:#2ecc71; border:1px solid #2ecc71; }
    .pill-rol.rol-bibliotecario { color:#b388ff; border:1px solid #7b3f7a; }

    .pill-historial {
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width: 100%;
      padding:0.55rem 1rem; border-radius:24px; font-size:0.85rem;
      background: transparent; border: 1px solid #3a3a3a; color:#e8e8e8; cursor:pointer;
    }
    .pill-historial:hover { background:#1e1e1e; }
    .pill-historial svg.rotated { transform: rotate(180deg); }

    .pill-logout {
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width: 100%;
      padding:0.55rem 1rem; border-radius:24px; font-size:0.85rem;
      background: transparent; border: 1px solid #7a2e2e; color:#ff6b6b; cursor:pointer;
    }
    .pill-logout:hover { background:rgba(255,107,107,0.1); }

    .divider-v { width:1px; background:#2a2a2a; align-self: stretch; }

    .form-area { display:flex; flex-direction:column; gap:1.2rem; flex:1; max-width: 520px; }
    .campo { display:flex; flex-direction:column; gap:0.4rem; }
    .campo label { font-size:0.72rem; font-weight:bold; color:#9a9a9a; letter-spacing:0.03rem; }
    .campo input {
      width: 100%; box-sizing: border-box;
      padding:0.7rem 0.9rem; border:1px solid #2a2a2a; border-radius:8px;
      background:#101010; color:#e8e8e8; font-size:0.85rem;
    }
    .campo input::placeholder { color:#6a6a6a; }
    .error-perfil { color:#ffbaba; font-size:.85rem; }
    .campo input[readonly] { color:#aaa; background:#0d0d0d; }
    .campo input:disabled { background:#0d0d0d; color:#7a7a7a; }

    .botones { display:flex; gap:0.9rem; margin-top:0.5rem; }
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
export class ProfileAdmin implements OnInit {
  editando = false; exito = false; mostrarHistorial = false;
  usuarioId: string | null = null;
  guardando = false;
  errorPerfil = '';
  private emailGuardado = '';
  usuario = { nombreApellido:'', legajo:'', email:'', categoria:'', imagen:'' };

  constructor(private router: Router, private userService: UserService, private authService: AuthService, private changeDetector: ChangeDetectorRef) {}

  ngOnInit() {
    this.userService.getProfile().subscribe({
      next: u => {
        this.usuarioId = u.id ?? null;
        this.emailGuardado = u.email;
        this.usuario = { nombreApellido: u.nombreApellido, legajo: u.legajo ?? '', email: u.email, categoria: u.categoria, imagen: u.imagen ?? '' };
      },
      error: () => {}
    });
  }

  guardar() {
    if (this.guardando) return;
    if (!this.usuarioId) { this.errorPerfil = 'No se pudo identificar al usuario. Actualizá la página.'; return; }
    this.guardando = true;
    this.exito = false;
    this.errorPerfil = '';
    this.userService.update(this.usuarioId, { email: this.usuario.email.trim() }).pipe(finalize(() => {
      this.guardando = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: u => { this.emailGuardado = this.usuario.email = u.email; this.editando=false; this.exito=true; },
      error: err => this.errorPerfil = apiErrorMessage(err, 'No se pudo guardar el email. Podés reintentar.')
    });
  }

  cancelarEdicion() {
    this.usuario.email = this.emailGuardado;
    this.editando = false;
    this.errorPerfil = '';
  }

  irAHistorial() { this.router.navigate(['/loan-history']); }
  cancelar() { this.router.navigate(['/home-admin']); }
  cerrarSesion() { this.authService.logout(); this.router.navigate(['/login']); }
}
