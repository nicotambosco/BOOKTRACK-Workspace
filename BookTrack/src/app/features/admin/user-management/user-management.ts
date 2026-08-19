import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {
  usuarios: User[] = [];
  cargando = false;
  error: string | null = null;
  usuarioEnEdicion: number | null = null;
  rolesDisponibles = ['usuario', 'bibliotecario'];

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando = true;
    this.error = null;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar usuarios: ' + err.message;
        this.cargando = false;
      }
    });
  }

  editarRol(usuarioId: number | undefined) {
    if (usuarioId) {
      this.usuarioEnEdicion = usuarioId;
    }
  }

  guardarRol(usuario: User) {
    if (usuario.id && usuario.categoria) {
      this.userService.update(usuario.id, usuario).subscribe({
        next: () => {
          this.usuarioEnEdicion = null;
          this.error = null;
        },
        error: (err) => {
          this.error = 'Error al guardar rol: ' + err.message;
        }
      });
    }
  }

  cancelarEdicion() {
    this.usuarioEnEdicion = null;
    this.cargarUsuarios();
  }

  eliminarUsuario(usuarioId: number | undefined) {
    if (!usuarioId) return;
    if (confirm('¿Está seguro que desea eliminar este usuario?')) {
      this.userService.delete(usuarioId).subscribe({
        next: () => {
          this.cargarUsuarios();
        },
        error: (err) => {
          this.error = 'Error al eliminar usuario: ' + err.message;
        }
      });
    }
  }
}
