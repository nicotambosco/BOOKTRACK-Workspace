export interface Bibliotecario {
  id: string;                 // el legajo
  nombreApellido: string;
  email: string;
  legajo: string;
  activo: boolean;
  prestamosGestionados: number;
  devoluciones: number;
  pendientes: number;
}

export interface ActividadBibliotecario { descripcion: string; fecha: string; }

export interface NuevoBibliotecario { legajo: string; nombreApellido: string; email: string; contrasena: string; }
