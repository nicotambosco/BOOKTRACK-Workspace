import type { Loan } from './loan.model';

export interface User {
  id?: string;             // el legajo
  username?: string;
  nombreApellido: string;
  nombre?: string;
  apellido?: string;
  emailAlternativo?: string;
  telefono?: string;
  tipoUsuario?: string;
  email: string;
  legajo?: string;
  contrasena?: string;
  codigo?: string;         // código de invitación (opcional)
  categoria: 'usuario' | 'bibliotecario' | 'admin';
  imagen?: string;         // URL de imagen de perfil
  historialPrestamos?: Loan[];
}

export type { Book } from './book.model';
export type { Loan } from './loan.model';
