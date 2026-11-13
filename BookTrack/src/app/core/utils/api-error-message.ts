/** Extrae el motivo que devuelve la API, tanto en detail como en listas de validación. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const respuesta = error as { status?: number; error?: unknown } | null;
  const texto = (valor: unknown): string => {
    if (typeof valor === 'string') return valor.trim().startsWith('<') ? '' : valor.trim();
    if (Array.isArray(valor)) return valor.map(texto).filter(Boolean).join(' ');
    if (valor && typeof valor === 'object') {
      const datos = valor as Record<string, unknown>;
      return texto(datos['detail']) || Object.values(datos).map(texto).filter(Boolean).join(' ');
    }
    return '';
  };
  return texto(respuesta?.error) || (respuesta?.status === 0 ? 'No se pudo conectar con el servidor.' : fallback);
}
