# API REST

Base local: `http://127.0.0.1:8000/api/`. Las rutas terminan en `/`. En Compose, la aplicación usa `/api/` en el origen de Nginx. JSON usa nombres camelCase; los modelos Django usan snake_case.

## Autenticación y perfiles

| Método y ruta | Acceso | Resultado |
| --- | --- | --- |
| `POST users/register/` | Público | Crea un usuario común |
| `POST users/login/` | Público | `{ "token": "...", "user": { ... } }` |
| `POST token/refresh/` | Token refresh válido | Access renovado; la interfaz actual no administra refresh tokens |
| `GET/PATCH users/me/` | Autenticado | Perfil propio |
| `GET users/` | Bibliotecario | Lista de usuarios |
| `GET/PATCH/PUT/DELETE users/{id}/` | Usuario propio o bibliotecario | Perfil; borrar con historial no está permitido |

Login:

```json
{ "legajoOEmail": "12473", "contrasena": "tu-contraseña-local" }
```

En las llamadas protegidas enviar `Authorization: Bearer <token>`. El cliente no puede asignarse `categoria` mediante registro o edición de perfil.

## Reservas

| Método y ruta | Acceso | Comportamiento |
| --- | --- | --- |
| `GET reservations/` | Autenticado | Usuario ve las propias; bibliotecario ve todas |
| `GET reservations/{id}/` | Propietario o bibliotecario | Detalle |
| `POST reservations/` | Autenticado | Crea reserva activa propia |
| `PATCH reservations/{id}/cancelar/` | Propietario o bibliotecario | Activa a cancelada |
| `PATCH reservations/{id}/retirar/` | Bibliotecario | Activa a finalizada y crea préstamo |
| `PATCH reservations/{id}/priorizar/` | Bibliotecario | Modifica prioridad de una activa |

Crear:

```json
{
  "libroId": 7,
  "fechaVencimiento": "2026-11-01",
  "fechaDevolucionPrevista": "2026-11-08"
}
```

Las fechas del ejemplo deben reemplazarse por fechas vigentes al probar. El primer campo de fecha limita el retiro; el segundo será el vencimiento del préstamo. No se envía `estudianteId`, `estado`, `codigoReserva` ni `prioridad`: los determina el servidor.

La respuesta incluye `id`, `codigoReserva`, `estudianteId`, `estudianteNombre`, `libroId`, `libroTitulo`, `fechaReserva`, ambas fechas solicitadas, `prioridad`, `estado`, `prestamoId` y `bibliotecarioId`. `prestamoId` es nulo hasta retirar.

Para priorizar, enviar `{ "prioridad": 2 }`. Retiro y cancelación reciben `{}`. `GET reservations/?estado=activa` permite filtrar por un estado válido. El orden es prioridad descendente, fecha de reserva e ID ascendentes.

Retirar y cancelar son idempotentes cuando se reintenta la misma operación ya terminada. Una operación incompatible con el estado, las fechas, la disponibilidad o la cola devuelve 400. PATCH/PUT/DELETE directos sobre una reserva no están habilitados.

## Préstamos

| Método y ruta | Acceso | Comportamiento |
| --- | --- | --- |
| `GET loans/`, `GET loans/{id}/` | Propietario o bibliotecario | Consulta de préstamos reales |
| `PATCH loans/{id}/devolver/` | Bibliotecario | Registra devolución efectiva y repone una copia |
| `PATCH loans/{id}/solicitar-extension/` | Propietario o bibliotecario | Solicita renovación de un vigente |
| `PATCH loans/{id}/aprobar-extension/` | Bibliotecario | Resuelve pendiente y suma siete días |
| `PATCH loans/{id}/denegar-extension/` | Bibliotecario | Resuelve sin cambiar vencimiento |
| `GET loans/export/pdf/` | Autenticado | PDF del historial visible para el usuario |
| `GET loans/export/excel/` | Autenticado | XLSX del historial visible para el usuario |

Las acciones reciben `{}`. Una respuesta contiene:

```json
{
  "id": 12,
  "estudianteId": 3,
  "libroId": 7,
  "tipoPrestamo": "normal",
  "fechaInicio": "2026-11-01",
  "fechaVencimiento": "2026-11-08",
  "fechaDevolucion": null,
  "estado": "vigente",
  "extensionPendiente": false,
  "extensionEstado": ""
}
```

Además se entregan `estudianteLegajo`, `estudianteNombre`, `libroTitulo` y `plazoDeSolicitud`. El filtro `?estado=vigente|vencido|devuelto` funciona en listado y exportaciones. Las fechas históricas desconocidas pueden ser nulas.

Los préstamos solo se crean al retirar una reserva. `POST loans/`, PATCH/PUT/DELETE genéricos, `/aprobar/` y `/denegar/` del flujo antiguo ya no están disponibles. `fechaFin` fue reemplazada por `fechaVencimiento`; la devolución efectiva está en `fechaDevolucion`. Frontend y backend deben actualizarse juntos.

Una renovación requiere una solicitud pendiente y un préstamo vigente. Su aprobación no se puede repetir para sumar días dos veces. Devolver nuevamente un préstamo ya devuelto no repone otra copia.

## Otros recursos

| Ruta | Comportamiento |
| --- | --- |
| `books/` | Catálogo público; filtros `q` por título y `categoria`; escrituras requieren bibliotecario |
| `books/{id}/` | Detalle y modificación; `estado` admite `activo` o `inactivo` |
| `books/upload-image/` | POST multipart `file`, bibliotecario; JPG, PNG o WebP hasta 1 MB, devuelve data URI |
| `categories/` | Consulta pública; escrituras requieren bibliotecario |
| `comments/` | POST autenticado con sección y comentario |

## Errores

401 indica sesión ausente o inválida; 403, rol insuficiente; 404, registro inexistente o ajeno al usuario; 400, validación o transición incompatible; 405, método no habilitado. Los errores de campos pueden ser objetos y los de negocio listas de mensajes. Las consultas de reservas y préstamos actualizan vencimientos antes de aplicar filtros.
