import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LibrarianService } from '../../../core/services/librarian.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { ActividadBibliotecario, Bibliotecario, Persona } from '../../../models/librarian.model';

@Component({
  selector: 'app-librarian-management',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './librarian-management.html',
  styleUrl: './librarian-management.scss',
})
export class LibrarianManagement implements OnInit {
  lista: Bibliotecario[] = [];
  seleccionado: Bibliotecario | null = null;
  actividad: ActividadBibliotecario[] = [];
  busqueda = '';
  form = { nombreApellido: '', email: '' };
  cargando = false; guardando = false; error = ''; aviso = '';
  creando = false;
  nuevo = { legajo: '', nombreApellido: '', email: '', contrasena: '' };
  errorNuevo = '';
  vista: 'bibliotecarios' | 'roles' = 'bibliotecarios';
  personas: Persona[] = [];
  busquedaRoles = '';
  cambio: { persona: Persona; nivel: number } | null = null;
  errorRol = '';
  readonly roles = [{ nivel: 0, nombre: 'Usuario' }, { nivel: 1, nombre: 'Bibliotecario' }, { nivel: 2, nombre: 'Admin' }];

  constructor(private api: LibrarianService, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.cargando = true;
    this.api.getAll().subscribe({
      next: l => { this.lista = l; this.cargando = false; if (l.length) this.seleccionar(l[0]); },
      error: e => { this.cargando = false; this.error = apiErrorMessage(e, 'No se pudo cargar la lista de bibliotecarios.'); }
    });
  }

  get filtrados() {
    const q = this.busqueda.trim().toLowerCase();
    return q ? this.lista.filter(b => (b.nombreApellido + ' ' + b.legajo).toLowerCase().includes(q)) : this.lista;
  }

  get miLegajo() { return this.auth.getUserId(); }

  iniciales(nombre: string) { return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(); }

  seleccionar(b: Bibliotecario) {
    this.seleccionado = b; this.aviso = ''; this.error = '';
    this.form = { nombreApellido: b.nombreApellido, email: b.email };
    this.actividad = [];
    this.api.activity(b.id).subscribe({ next: a => { if (this.seleccionado?.id === b.id) this.actividad = a; }, error: () => {} });
  }

  private aplicar(actualizado: Bibliotecario, mensaje: string) {
    this.lista = this.lista.map(b => b.id === actualizado.id ? actualizado : b);
    this.seleccionado = actualizado;
    this.form = { nombreApellido: actualizado.nombreApellido, email: actualizado.email };
    this.aviso = mensaje;
  }

  guardar() {
    if (!this.seleccionado || this.guardando) return;
    this.guardando = true; this.error = ''; this.aviso = '';
    this.api.update(this.seleccionado.id, { nombreApellido: this.form.nombreApellido.trim(), email: this.form.email.trim() }).subscribe({
      next: b => { this.guardando = false; this.aplicar(b, 'Cambios guardados.'); },
      error: e => { this.guardando = false; this.error = apiErrorMessage(e, 'No se pudieron guardar los cambios.'); }
    });
  }

  alternarActivo() {
    if (!this.seleccionado || this.guardando) return;
    this.guardando = true; this.error = ''; this.aviso = '';
    const activar = !this.seleccionado.activo;
    this.api.update(this.seleccionado.id, { activo: activar }).subscribe({
      next: b => { this.guardando = false; this.aplicar(b, activar ? 'Bibliotecario activado.' : 'Bibliotecario desactivado.'); },
      error: e => { this.guardando = false; this.error = apiErrorMessage(e, 'No se pudo cambiar el estado.'); }
    });
  }

  abrirNuevo() { this.nuevo = { legajo: '', nombreApellido: '', email: '', contrasena: '' }; this.errorNuevo = ''; this.creando = true; }

  crear() {
    const n = this.nuevo;
    if (!n.legajo.trim() || !n.nombreApellido.trim() || n.contrasena.length < 6) { this.errorNuevo = 'Completá legajo, nombre y una contraseña de al menos 6 caracteres.'; return; }
    this.guardando = true; this.errorNuevo = '';
    this.api.create({ ...n, legajo: n.legajo.trim(), nombreApellido: n.nombreApellido.trim(), email: n.email.trim() }).subscribe({
      next: b => { this.guardando = false; this.creando = false; this.lista = [...this.lista, b]; this.seleccionar(b); },
      error: e => { this.guardando = false; this.errorNuevo = apiErrorMessage(e, 'No se pudo crear el bibliotecario.'); }
    });
  }

  abrirRoles() {
    this.vista = 'roles'; this.errorRol = '';
    this.api.people().subscribe({ next: p => this.personas = p, error: e => this.errorRol = apiErrorMessage(e, 'No se pudo cargar la lista de personas.') });
  }

  get personasFiltradas() {
    const q = this.busquedaRoles.trim().toLowerCase();
    return q ? this.personas.filter(p => (p.nombreApellido + ' ' + p.legajo + ' ' + p.email).toLowerCase().includes(q)) : this.personas;
  }

  nombreRol(nivel: number) { return this.roles.find(r => r.nivel === nivel)?.nombre ?? ''; }

  pedirCambio(p: Persona, nivel: string) {
    const n = Number(nivel);
    if (n !== p.nivel) this.cambio = { persona: p, nivel: n };
    this.errorRol = '';
  }

  confirmarCambio() {
    const c = this.cambio; if (!c || this.guardando) return;
    this.guardando = true;
    this.api.setNivel(c.persona.id, c.nivel).subscribe({
      next: nueva => {
        this.guardando = false; this.cambio = null;
        this.personas = this.personas.map(p => p.id === nueva.id ? nueva : p);
        this.api.getAll().subscribe(l => { this.lista = l; if (this.seleccionado && !l.some(b => b.id === this.seleccionado!.id)) this.seleccionado = null; });
      },
      error: e => { this.guardando = false; this.cambio = null; this.errorRol = apiErrorMessage(e, 'No se pudo cambiar el rol.'); }
    });
  }

  cerrarSesion() { this.auth.logout(); this.router.navigate(['/login']); }
}
