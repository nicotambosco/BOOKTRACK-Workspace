import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, Header],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {
  usuarios: User[] = [];
  cargando = false;
  error: string | null = null;

  constructor(private userService: UserService, private router: Router) {}

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

  // Los usuarios solo se consultan: no se editan ni se eliminan desde acá.
  verHistorial(usuario: User) {
    if (usuario.id) this.router.navigate(['/user-loans', usuario.id]);
  }
}
