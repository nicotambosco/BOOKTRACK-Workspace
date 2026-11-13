export interface AdminAction {
  id: number;
  fecha: string;
  tipoAccion: string;
  descripcion: string;
  bibliotecarioId: string | null;
  bibliotecarioNombre: string;
  estudianteId: string | null;
  estudianteNombre: string;
  libroId: string | null;
  libroTitulo: string | null;
  ejemplarId: string | null;
  reservaId: number | null;
  prestamoId: number | null;
}
