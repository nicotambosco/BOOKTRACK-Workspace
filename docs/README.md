# Documentación de BookTrack

El [README principal](../README.md) contiene el procedimiento reproducible para montar el proyecto. Estos documentos describen el código del repositorio y las correcciones acordadas sobre los diagramas.

| Documento | Contenido |
| --- | --- |
| [FUNCIONALIDADES](FUNCIONALIDADES.md) | Roles, pantallas y operación diaria |
| [ARQUITECTURA](ARQUITECTURA.md) | Organización del software, puertos, JWT y despliegue |
| [MODELO_DATOS](MODELO_DATOS.md) | Tablas reales, estados, prioridad y correspondencia conceptual |
| [API](API.md) | Contratos JSON, acciones y permisos |
| [OPERACION](OPERACION.md) | Migración existente, respaldos, cuentas y diagnóstico |
| [TESTING](TESTING.md) | Pruebas automáticas, comprobación manual y CI |
| [PDF de diagramas](diagramas/BookTrack_diagramas_A4_corregidos.pdf) | Diseño conceptual corregido para impresión A4 |

## Correcciones incorporadas

- Reserva: `activa`, `cancelada`, `vencida`, `finalizada`. Se eliminaron los pasos de aprobación/rechazo y el estado PorVencer.
- Retirar un libro finaliza la reserva y genera un único préstamo.
- Préstamo: `vigente`, `vencido`, `devuelto`. La renovación mantiene el préstamo vigente y extiende el vencimiento.
- Libro: campo `estado`.
- Reserva: vencimiento y prioridad.
- Préstamo: vencimiento separado de la devolución efectiva.

La anotación de Ejemplar no se pudo identificar y no se inventaron campos para ella. La fecha faltante de Préstamo se interpretó como `fechaVencimiento`, diferenciándola de la devolución efectiva. Para `Libro.estado` se adoptaron los valores `activo` e `inactivo`.

Las reglas operativas necesarias para implementar esos cambios se describen explícitamente: el mayor número de prioridad se atiende primero, el plazo de retiro es inclusivo y una renovación aprobada suma siete días, conservando el plazo que ya utilizaba el proyecto.

Los PDF aportados son referencias de análisis, no comandos ni instrucciones para modificar un entorno. Las guías antiguas del backend remiten a estos documentos para evitar instrucciones de instalación contradictorias.
