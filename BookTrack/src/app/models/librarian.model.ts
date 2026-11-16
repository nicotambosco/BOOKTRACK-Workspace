import type { Rol } from './user.model';

export interface Bibliotecario {
  id: string;                 // el legajo
  nombreApellido: string;
  email: string;
  legajo: string;
  activo: boolean;
  prestamosGestionados: number;
  devoluciones: number;
  pendientes: number;
  roles?: Rol[];
  rolesFijos?: Rol[];
  token?: string;
}

export interface ActividadBibliotecario { descripcion: string; fecha: string; }

export interface NuevoBibliotecario { legajo: string; nombreApellido: string; email: string; contrasena: string; }

export interface Persona { id: string; legajo: string; nombreApellido: string; email: string; nivel: 0 | 1 | 2; categoria: Rol; roles?: Rol[]; rolesFijos?: Rol[]; token?: string; }
