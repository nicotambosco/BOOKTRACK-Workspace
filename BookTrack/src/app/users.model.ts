/*
 * Archivo: users.model.ts
 * Descripción: Modelo de datos para el sistema de usuarios
 * Autor: Juan Pérez
 * Fecha: 2026-05-17
 *
 */
export interface User {
  id?: number;
  nombreApellido: string;
  email: string;
  legajo: string;
  contrasena?: string;
  codigo?: string; // código de invitación (opcional)
  categoria: 'usuario' | 'bibliotecario';
  imagen?: string; // URL de imagen de perfil
  historialPrestamos?: Loan[]; // Historia de préstamos
}

export interface Loan {
  id?: number;
  estudianteId: number;
  libroId: number;
  tipoPrestamo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'aprobado' | 'denegado' | 'devuelto';
  plazoDeSolicitud?: string;
}

/*
 * Modelo de datos para préstamos de libros
 * Fecha de creación: 2026-05-17
 * Desarrollador: Juan Pérez
 */
export interface Book {
  id?: number;
  titulo: string;
  autor: string;
  editorial: string;
  fechaPublicacion: string;
  descripcion: string;
  imagen?: string; // portada
  nroCodigo?: string; // ej: LIB-ING/MUS-MK-1996
  nroInventario?: string; // ej: ID-ADM-260611
  categoria: string; // sistemas, química, electricia, mecánica, básicas, cursos
  disponibles?: number;
  tipo?: 'libro base' | 'libro de consulta';
}

/*
 * Modelo de usuario para el sistema de categorías
 * Fecha de creación: 2026-05-17
 * Desarrollador: Juan Pérez
 */
export interface Category {
  id?: number;
  nombre: string; // sistemas, química, electricia, mecánica, básicas, cursos
}

/*
 * Modelo de datos para la interfaz de préstamos
 * Fecha de creación: 2026-05-17
 * Desarrollador: Juan Pérez
 */
export interface LoanTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}
