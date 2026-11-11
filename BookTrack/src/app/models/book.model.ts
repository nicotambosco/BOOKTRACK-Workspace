export interface Ejemplar {
  id: string;
  estado: 'disponible' | 'prestado' | 'baja';
  observaciones: string;
  isbn: string;
}

export interface Book {
  id?: string;             // el ISBN (también viene en `isbn`)
  isbn?: string;
  estado?: 'activo' | 'inactivo';
  titulo: string;
  autor: string;
  categoria: string;       // sistemas, química, electricia, mecánica, básicas, cursos
  anioPublicacion?: number | null;
  resumen?: string;
  palabrasClave?: string;
  imagen?: string;         // portada
  anioCursada?: number;    // año de cursada de la materia (0 = general, 99 = electivas)
  disponibles?: number;    // ejemplares disponibles
  ejemplares?: Ejemplar[];
  sugerencias?: Book[];    // libros relacionados
}

export interface BookTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}
