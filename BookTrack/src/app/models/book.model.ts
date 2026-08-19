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

export interface BookTableRow {
  estudiante: string;
  codigoLibro: string;
  tipoPrestamo: string;
  id: string;
  periodo: string;
}