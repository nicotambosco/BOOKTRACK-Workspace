import { Component, Input, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { homeDeRol } from '../../../core/guards/auth/auth-guard';
import { Rol } from '../../../models/user.model';

@Component({
  selector: 'app-role-switcher',
  standalone: true,
  template: `
    @if (auth.getUserRoles().length > 1) {
      <label>Vista
        <select #vista [value]="vistaActual" [disabled]="disabled || auth.cambiandoRol()" (change)="cambiar(vista.value); vista.value = vistaActual ?? ''" aria-label="Cambiar vista de trabajo">
          @for (rol of auth.getUserRoles(); track rol) {
            <option [value]="rol" [selected]="rol === vistaActual">{{ nombres[rol] }}</option>
          }
        </select>
      </label>
      @if (auth.cambiandoRol()) { <span class="switching" role="status">Cambiando vista…</span> }
    }
    @if (auth.errorCambioRol()) { <p role="alert">{{ auth.errorCambioRol() }}</p> }
  `,
  styles: [`
    :host { display:block; }
    label { display:flex; align-items:center; gap:.5rem; color:#b5b5b5; font-size:.8rem; }
    select { font:inherit; background:#1f1f1f; color:#f5f5f5; border:1px solid #666; border-radius:8px; padding:.55rem; max-width:170px; }
    select:focus-visible { outline:2px solid #2ecc71; outline-offset:3px; }
    p { margin:.3rem 0 0; color:#ffbaba; font-size:.8rem; }
    .switching { display:block; margin-top:.3rem; color:#b5b5b5; font-size:.75rem; }
  `],
})
export class RoleSwitcher {
  @Input() disabled = false;
  readonly auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly nombres = { usuario: 'Usuario', bibliotecario: 'Bibliotecario', admin: 'Administrador' };

  get vistaActual(): Rol | null {
    const roles: Rol[] | undefined = this.route.snapshot.data['roles'];
    return roles?.length === 1 ? roles[0] : this.auth.getUserRole();
  }

  cambiar(rol: string) {
    if (!this.disabled && !this.auth.cambiandoRol() && rol !== this.vistaActual && this.auth.getUserRoles().some(r => r === rol)) {
      this.router.navigate([homeDeRol(rol)]);
    }
  }
}
