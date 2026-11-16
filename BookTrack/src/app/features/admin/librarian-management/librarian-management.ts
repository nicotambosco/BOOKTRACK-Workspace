import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { LibrarianService } from '../../../core/services/librarian.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { ActividadBibliotecario, Bibliotecario, Persona } from '../../../models/librarian.model';
import { Rol } from '../../../models/user.model';
import { RoleSwitcher } from '../../../shared/components/role-switcher/role-switcher';
import { RolePicker } from '../../../shared/components/role-picker/role-picker';
import { ROLE_OPTIONS, rolePolicy } from '../../../core/utils/role-policy';

interface Cuenta extends Persona {
  activo: boolean;
  roles: Rol[];
  bibliotecario?: Bibliotecario;
}

@Component({
  selector: 'app-librarian-management',
  standalone: true,
  imports: [FormsModule, DatePipe, RoleSwitcher, RolePicker],
  templateUrl: './librarian-management.html',
  styleUrl: './librarian-management.scss',
})
export class LibrarianManagement implements OnInit, OnDestroy {
  @ViewChild('dialogoRol', { static: true }) dialogoRol!: ElementRef<HTMLDialogElement>;
  @ViewChild('dialogoNuevo', { static: true }) dialogoNuevo!: ElementRef<HTMLDialogElement>;
  personas: Cuenta[] = [];
  seleccionado: Cuenta | null = null;
  actividad: ActividadBibliotecario[] = [];
  busqueda = '';
  filtroRol = '';
  form = { nombreApellido: '', email: '' };
  cargando = false;
  guardando = false;
  cargandoActividad = false;
  errorActividad = '';
  error = '';
  aviso = '';
  nuevo = { legajo: '', nombreApellido: '', email: '', contrasena: '' };
  errorNuevo = '';
  rolesElegidos: Rol[] = [];
  cambio: { persona: Cuenta; roles: Rol[] } | null = null;
  readonly roles = ROLE_OPTIONS;
  private peticionActividad?: Subscription;
  private peticionLista?: Subscription;

  constructor(private api: LibrarianService, private auth: AuthService, private router: Router) {}

  ngOnInit() { this.cargar(); }

  ngOnDestroy() {
    this.peticionActividad?.unsubscribe();
    this.peticionLista?.unsubscribe();
  }

  cargar(preferido = this.seleccionado?.id) {
    this.cargando = true;
    this.error = '';
    this.peticionLista?.unsubscribe();
    this.peticionLista = forkJoin({ personas: this.api.people(), bibliotecarios: this.api.getAll() }).subscribe({
      next: ({ personas, bibliotecarios }) => {
        const cuentas = new Map<string, Cuenta>(personas.map(p => [p.id, { ...p, activo: true, roles: p.roles ?? [p.categoria] }]));
        for (const b of bibliotecarios) {
          const actual = cuentas.get(b.id);
          if (actual && !actual.roles.includes('bibliotecario')) continue;
          cuentas.set(b.id, { ...b, nivel: 1, categoria: 'bibliotecario', ...actual,
            roles: actual?.roles ?? b.roles ?? (b.activo ? ['bibliotecario'] : []), bibliotecario: b });
        }
        this.personas = [...cuentas.values()].sort((a, b) => a.nombreApellido.localeCompare(b.nombreApellido, 'es'));
        this.cargando = false;
        this.seleccionar(this.filtrados.find(p => p.id === preferido) ?? this.filtrados[0] ?? null);
      },
      error: e => { this.cargando = false; this.error = apiErrorMessage(e, 'No se pudo cargar la lista de usuarios.'); }
    });
  }

  get filtrados() {
    const q = this.busqueda.trim().toLowerCase();
    return this.personas.filter(p =>
      (this.filtroRol === '' || p.roles.includes(this.filtroRol as Rol) || (this.filtroRol === 'bibliotecario' && !!p.bibliotecario)) &&
      (!q || `${p.nombreApellido} ${p.legajo} ${p.email}`.toLowerCase().includes(q)));
  }

  get miLegajo() { return this.auth.getUserId(); }
  get permisosRoles() {
    const s = this.seleccionado;
    return rolePolicy(this.miLegajo, this.auth.getUserRoles(), s?.id ?? '', s?.roles ?? [], s?.rolesFijos ?? []);
  }

  nombreRol(rol: Rol) { return this.roles.find(r => r.clave === rol)?.nombre ?? ''; }
  nombresRoles(roles: Rol[]) { return roles.map(r => this.nombreRol(r)).join(', '); }
  iniciales(nombre: string) { return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'; }

  filtrar() {
    this.aviso = '';
    const siguiente = this.filtrados.find(p => p.id === this.seleccionado?.id) ?? this.filtrados[0] ?? null;
    if (siguiente?.id !== this.seleccionado?.id) this.seleccionar(siguiente);
  }

  seleccionar(p: Cuenta | null) {
    this.peticionActividad?.unsubscribe();
    this.seleccionado = p;
    this.rolesElegidos = [...(p?.roles ?? [])];
    this.form = { nombreApellido: p?.nombreApellido ?? '', email: p?.email ?? '' };
    this.actividad = [];
    this.errorActividad = '';
    this.cargandoActividad = !!p?.bibliotecario;
    if (!p?.bibliotecario) return;
    this.peticionActividad = this.api.activity(p.id).subscribe({
      next: a => { this.actividad = a; this.cargandoActividad = false; },
      error: e => { this.cargandoActividad = false; this.errorActividad = apiErrorMessage(e, 'No se pudo cargar la actividad.'); }
    });
  }

  private aplicar(b: Bibliotecario, mensaje: string) {
    if (b.token) this.auth.actualizarToken(b.token);
    this.aviso = mensaje;
    this.seleccionar(null);
    this.cargar(b.id);
  }

  get rolesModificados() {
    return !!this.seleccionado && (this.rolesElegidos.length !== this.seleccionado.roles.length ||
      this.rolesElegidos.some(r => !this.seleccionado!.roles.includes(r)));
  }

  actualizarRoles(values: string[]) {
    this.rolesElegidos = this.roles.filter(r => values.includes(r.clave)).map(r => r.clave);
  }

  restablecerRoles() {
    this.rolesElegidos = [...(this.seleccionado?.roles ?? [])];
  }

  guardar() {
    if (!this.seleccionado?.bibliotecario || this.guardando || this.cargando) return;
    if (!this.form.nombreApellido.trim()) { this.error = 'Ingresá el nombre y apellido.'; return; }
    this.guardando = true; this.error = ''; this.aviso = '';
    this.api.update(this.seleccionado.id, { nombreApellido: this.form.nombreApellido.trim(), email: this.form.email.trim() }).subscribe({
      next: b => { this.guardando = false; this.aplicar(b, 'Cambios guardados.'); },
      error: e => { this.guardando = false; this.error = apiErrorMessage(e, 'No se pudieron guardar los cambios.'); }
    });
  }

  alternarActivo() {
    if (!this.seleccionado?.bibliotecario || this.guardando || this.cargando) return;
    const permitido = this.seleccionado.activo ? this.permisosRoles.quitables.includes('bibliotecario') : this.permisosRoles.asignables.includes('bibliotecario');
    if (!permitido) { this.error = 'No tenés permiso para cambiar este rango.'; return; }
    this.guardando = true; this.error = ''; this.aviso = '';
    const activar = !this.seleccionado.activo;
    this.api.update(this.seleccionado.id, { activo: activar }).subscribe({
      next: b => { this.guardando = false; this.aplicar(b, activar ? 'Bibliotecario activado.' : 'Bibliotecario desactivado.'); },
      error: e => { this.guardando = false; this.error = apiErrorMessage(e, 'No se pudo cambiar el estado.'); }
    });
  }

  abrirNuevo() {
    this.nuevo = { legajo: '', nombreApellido: '', email: '', contrasena: '' };
    this.errorNuevo = '';
    this.dialogoNuevo.nativeElement.showModal();
  }

  cerrarNuevo(event?: Event) {
    if (this.guardando) { event?.preventDefault(); return; }
    this.dialogoNuevo.nativeElement.close();
  }

  crear() {
    if (this.guardando) return;
    const n = this.nuevo;
    if (!n.legajo.trim() || !n.nombreApellido.trim() || n.contrasena.length < 6) { this.errorNuevo = 'Completá legajo, nombre y una contraseña de al menos 6 caracteres.'; return; }
    this.guardando = true; this.errorNuevo = '';
    this.api.create({ ...n, legajo: n.legajo.trim(), nombreApellido: n.nombreApellido.trim(), email: n.email.trim() }).subscribe({
      next: b => {
        this.guardando = false; this.cerrarNuevo();
        this.busqueda = ''; this.filtroRol = '';
        this.aviso = 'Bibliotecario creado.';
        this.cargar(b.id);
      },
      error: e => { this.guardando = false; this.errorNuevo = apiErrorMessage(e, 'No se pudo crear el bibliotecario.'); }
    });
  }

  pedirCambio() {
    const p = this.seleccionado;
    if (!p || this.guardando || this.cargando || !p.activo || !this.rolesModificados) return;
    if (!this.rolesElegidos.length) { this.error = 'Elegí al menos un rol.'; return; }
    if (p.rolesFijos?.some(r => !this.rolesElegidos.includes(r))) {
      this.error = 'El rol administrador de la cuenta principal es fijo.'; return;
    }
    const cambios = this.permisosRoles;
    if (this.rolesElegidos.some(r => !p.roles.includes(r) && !cambios.asignables.includes(r)) ||
        p.roles.some(r => !this.rolesElegidos.includes(r) && !cambios.quitables.includes(r))) {
      this.error = 'Solo podés modificar rangos inferiores. No podés asignarte roles.'; return;
    }
    this.cambio = { persona: p, roles: [...this.rolesElegidos] };
    this.error = '';
    this.dialogoRol.nativeElement.showModal();
  }

  cancelarCambio(event?: Event) {
    if (this.guardando) { event?.preventDefault(); return; }
    this.cambio = null;
    this.dialogoRol.nativeElement.close();
  }

  confirmarCambio() {
    const c = this.cambio;
    if (!c || this.guardando) return;
    this.guardando = true; this.error = ''; this.aviso = '';
    this.api.setRoles(c.persona.id, c.roles).subscribe({
      next: nueva => {
        this.guardando = false; this.cancelarCambio();
        if (nueva.token) this.auth.actualizarToken(nueva.token);
        this.aviso = `Roles de ${nueva.nombreApellido} actualizados.`;
        this.personas = this.personas.map(p => p.id === nueva.id ? { ...nueva, roles: nueva.roles ?? [nueva.categoria], activo: true } : p);
        this.seleccionar(null);
        this.cargar(nueva.id);
      },
      error: e => { this.guardando = false; this.cancelarCambio(); this.error = apiErrorMessage(e, 'No se pudo cambiar el rol.'); }
    });
  }

  cerrarSesion() { this.auth.logout(); this.router.navigate(['/login']); }
}
