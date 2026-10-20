import type { Loan } from './loan.model';

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

export type { Book } from './book.model';
export type { Loan } from './loan.model';
export type { Category } from './category.model';
