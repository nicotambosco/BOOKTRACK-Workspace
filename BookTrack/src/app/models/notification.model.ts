export interface Notificacion {
  id: number;
  fecha: string;
  tipo: string;
  mensaje: string;
  reservaId: number | null;
  prestamoId: number | null;
}
