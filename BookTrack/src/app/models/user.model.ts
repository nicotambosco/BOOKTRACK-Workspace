export interface User {
  id?: number;
  username?: string;
  nombreApellido: string;
  email: string;
  legajo?: string;
  contrasena?: string;
  codigo?: string;         // código de invitación (opcional)
  categoria: 'usuario' | 'bibliotecario';
  imagen?: string;         // URL de imagen de perfil
  historialPrestamos?: Loan[];
}

export interface Book {
  id?: number;
  titulo: string;
  autor: string;
  editorial: string;
  fechaPublicacion: string;
  descripcion: string;
  imagen?: string;         // portada
  nroCodigo?: string;      // ej: LIB-ING/MUS-MK-1996
  nroInventario?: string;  // ej: ID-ADM-260611
  categoria: string;       // sistemas, química, electricia, mecánica, básicas, cursos
  disponibles?: number;
  tipo?: 'libro base' | 'libro de consulta';
  sugerencias?: Book[];    // libros relacionados
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

export interface Category {
  id?: number;
  nombre: string; // sistemas, química, electricia, mecánica, básicas, cursos
}