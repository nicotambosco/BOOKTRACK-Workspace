import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-profile-admin',
  standalone: true,
  imports: [FormsModule, CommonModule, Header],
  template: `
    <div class="page">
      <app-header [esAdmin]="true"></app-header>
      <div class="content">
        <div class="card">
          <div class="avatar-area">
            <div class="avatar">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="22" r="12" stroke="#1a1a1a" stroke-width="2" fill="none"/>
                <path d="M10 52c0-11 9-19 20-19s20 8 20 19" stroke="#1a1a1a" stroke-width="2" fill="none"/>
              </svg>
              <div class="avatar-plus">+</div>
            </div>
            <div *ngIf="usuario.categoria" class="categoria-badge" [class]="'rol-' + usuario.categoria">
              {{ usuario.categoria === 'usuario' ? '👤 Usuario' : '📚 Bibliotecario' }}
            </div>
            <div *ngIf="!usuario.categoria" class="categoria-badge rol-usuario">
              👤 Usuario
            </div>
            <button class="btn-usuarios" (click)="irAUsuarios()">👥 VER USUARIOS</button>
          </div>
          <div class="form-area">
            <div class="campo">
              <label>NOMBRE Y APELLIDO</label>
              <input [disabled]="!editando" [(ngModel)]="usuario.nombreApellido" [placeholder]="editando ? 'Ingrese nombre y apellido' : ''"/>
            </div>
            <div class="campo">
              <label>LEGAJO</label>
              <input [disabled]="!editando" [(ngModel)]="usuario.legajo" [placeholder]="editando ? 'Ingrese Legajo' : ''"/>
            </div>
            <div class="campo">
              <label>EMAIL</label>
              <input [disabled]="!editando" [(ngModel)]="usuario.email" [placeholder]="editando ? 'Ingrese Email' : ''"/>
            </div>
            <div class="campo">
              <label>CONTRASEÑA</label>
              <input type="password" [disabled]="!editando" [(ngModel)]="usuario.password"/>
            </div>
            <div class="botones">
              @if (!editando) {
                <button class="btn-primary" (click)="editando=true">EDITAR</button>
                <button class="btn-outline" (click)="cancelar()">CANCELAR</button>
              } @else {
                <button class="btn-primary" (click)="guardar()">GUARDAR</button>
                <button class="btn-outline" (click)="editando=false">SALIR</button>
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
    .page { display:flex; flex-direction:column; height:100vh; background:#C9A96E; }
    .content { flex:1; display:flex; justify-content:center; align-items:center; padding:2rem; }
    .card { background:rgba(201,169,110,0.7); padding:2rem; border-radius:8px; display:flex; gap:2rem; }
    .avatar-area { display:flex; flex-direction:column; align-items:center; gap:0.8rem; }
    .avatar { position:relative; width:80px; height:80px; border:2px solid #1a1a1a; border-radius:50%; display:flex; align-items:center; justify-content:center; background:white; }
    .avatar-plus { position:absolute; bottom:0; right:0; width:20px; height:20px; background:#1a1a1a; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.9rem; cursor:pointer; }
    .categoria-badge { padding:0.5rem 1rem; border-radius:20px; font-size:0.85rem; font-weight:bold; text-align:center; min-width:120px; }
    .categoria-badge.rol-usuario { background:#e3f2fd; color:#1976d2; border:2px solid #1976d2; }
    .categoria-badge.rol-bibliotecario { background:#f3e5f5; color:#7b1fa2; border:2px solid #7b1fa2; }
    .btn-usuarios { background:#1a1a1a; color:white; border:none; padding:0.4rem 0.8rem; border-radius:4px; cursor:pointer; font-size:0.75rem; transition:all 0.2s; }
    .btn-usuarios:hover { background:#333; transform:scale(1.05); }
    .form-area { display:flex; flex-direction:column; gap:0.8rem; min-width:280px; }
    .campo { display:flex; flex-direction:column; gap:0.2rem; }
    .campo label { font-size:0.7rem; font-weight:bold; color:#333; }
    .campo input { padding:0.5rem; border:1px solid #888; border-radius:4px; background:white; font-size:0.8rem; }
    .campo input:disabled { background:#f0f0f0; color:#555; }
    .botones { display:flex; gap:0.8rem; margin-top:0.5rem; }
    .btn-primary { background:#1a1a1a; color:white; border:none; padding:0.5rem 1.2rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .btn-outline { background:transparent; border:2px solid #1a1a1a; padding:0.5rem 1.2rem; border-radius:20px; cursor:pointer; font-size:0.8rem; }
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; }
    .modal { background:white; padding:2rem 3rem; border-radius:8px; text-align:center; display:flex; flex-direction:column; gap:1rem; }
    .modal p { font-weight:bold; }
  `]
})
export class ProfileAdmin implements OnInit {
  editando = false; exito = false;
  usuarioId: number | null = null;
  usuario = { nombreApellido:'', legajo:'', email:'', password:'', categoria:'' };

  constructor(private router: Router, private userService: UserService) {}

  ngOnInit() {
    this.userService.getProfile().subscribe({
      next: u => {
        this.usuarioId = u.id ?? null;
        this.usuario = { nombreApellido: u.nombreApellido, legajo: u.legajo ?? '', email: u.email, password:'', categoria: u.categoria };
      },
      error: () => {}
    });
  }

  guardar() {
    if (!this.usuarioId) { this.editando=false; this.exito=true; return; }
    this.userService.update(this.usuarioId, { nombreApellido: this.usuario.nombreApellido, email: this.usuario.email }).subscribe({
      next: () => { this.editando=false; this.exito=true; },
      error: () => { this.editando=false; this.exito=true; }
    });
  }

  irAUsuarios() { this.router.navigate(['/user-management']); }
  cancelar() { this.router.navigate(['/home-admin']); }
}
