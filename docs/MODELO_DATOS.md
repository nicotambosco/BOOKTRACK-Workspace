# Modelo de datos y reglas

El esquema sigue el diagrama de clases del proyecto: tablas `Usuario`, `Bibliotecario`, `Libro`, `Ejemplar`, `Reserva`, `Prestamo`, `Notificacion` y `AccionAdministrativa`, con los nombres de columna del diagrama (`idUsuario`, `fechaReserva`, `ISBN`…).

## Entidades implementadas

```mermaid
erDiagram
  USUARIO ||--o{ RESERVA : reserva
  USUARIO ||--o{ PRESTAMO : recibe
  USUARIO ||--o{ NOTIFICACION : recibe
  BIBLIOTECARIO o|--o{ RESERVA : gestiona
  BIBLIOTECARIO o|--o{ PRESTAMO : entrega
  BIBLIOTECARIO o|--o{ ACCIONADMINISTRATIVA : realiza
  LIBRO ||--|{ EJEMPLAR : tiene
  LIBRO ||--o{ RESERVA : "se reserva"
  EJEMPLAR ||--o{ PRESTAMO : "se presta"
  PRESTAMO o|--o| RESERVA : origina
  RESERVA o|--o{ NOTIFICACION : avisa
  PRESTAMO o|--o{ NOTIFICACION : avisa
  RESERVA o|--o{ ACCIONADMINISTRATIVA : registra
  PRESTAMO o|--o{ ACCIONADMINISTRATIVA : registra
```

| Tabla (modelo) | Columnas principales |
| --- | --- |
| `Usuario` (`users.Usuario`) | `idUsuario` PK (**el legajo**), `nombre`, `apellido`, `email`, `emailAlternativo`, `telefono`, `tipoUsuario` (`alumno` o `docente`); además `password`, `last_login`, `is_active`, `imagen` y `codigo` (código de invitación) |
| `Bibliotecario` (`users.Bibliotecario`) | `idBibliotecario` PK (**el legajo**), `nombre`, `apellido`, `email`; además `password`, `last_login`, `is_active` e `imagen` |
| `Libro` (`books.Libro`) | `ISBN` PK, `titulo`, `autor`, `categoria`, `anioPublicacion`, `resumen`, `palabrasClave`, `estado`; además `imagen` (portada) y `anioCursada` (año de cursada, 0 = general, 99 = electivas) |
| `Ejemplar` (`books.Ejemplar`) | `idEjemplar` PK de texto (código único), `estado` (`disponible`, `prestado`, `baja`), `observaciones`, `ISBN` FK |
| `Reserva` (`loans.Reserva`) | `idReserva` PK, `fechaReserva`, `fechaRetiro`, `fechaVencimiento`, `estado`, `idUsuario`, `ISBN`, `idBibliotecario` (opcional); además `idPrestamo` (el préstamo que generó) |
| `Prestamo` (`loans.Prestamo`) | `idPrestamo` PK, `fechaPrestamo`, `fechaVencimiento`, `fechaDevolucion`, `estado`, `idUsuario`, `idEjemplar`, `idBibliotecario` (opcional) |
| `Notificacion` (`loans.Notificacion`) | `idNotificacion` PK, `fecha`, `tipo`, `mensaje`, `idUsuario`, `idReserva` y `idPrestamo` (opcionales) |
| `AccionAdministrativa` (`loans.AccionAdministrativa`) | `idAccion` PK, `fecha`, `tipoAccion`, `descripcion`, `idBibliotecario`, `idReserva`, `idPrestamo`, `ISBN`, `idEjemplar` (opcionales) |

Las columnas "además" no están en el diagrama; la aplicación las necesita (portada y año de cursada).

No hay tabla de cuentas: `Usuario` y `Bibliotecario` son las tablas de login. La clave primaria de cada una es el legajo, con el que se inicia sesión (también se acepta el email). El legajo es único entre las dos tablas: el registro y la migración lo verifican. El rol es la tabla a la que pertenece la persona, viaja en el token (`categoria`) y decide qué vistas se muestran: el usuario ve las de usuario y el bibliotecario las de bibliotecario. La API identifica a las personas por su legajo (`id`, `legajo`, `estudianteId`, `bibliotecarioId`).

`Libro.estado` es `activo` o `inactivo`. Inactivar bloquea nuevas reservas y entregas; mantiene el historial y permite devolver préstamos abiertos. El stock (`disponibles` en la API) es la cantidad de ejemplares en estado `disponible`. Bajar el stock desde la edición del libro pasa los ejemplares sobrantes a `baja`: no se borran ni se tocan los prestados.

Las acciones del bibliotecario (retiro, devolución, cancelación) dejan una `AccionAdministrativa`. Las novedades del usuario (reserva creada, cancelada o vencida, retiro, vencimiento próximo, vencido, devolución) dejan una `Notificacion`; el encabezado las lee de `GET /api/notifications/`.

## Reserva

```mermaid
stateDiagram-v2
  [*] --> Activa: crear reserva
  Activa --> Cancelada: cancelar
  Activa --> Vencida: supera fecha de retiro sin retirar
  Activa --> Finalizada: retirar libro / generar préstamo
  Cancelada --> [*]
  Vencida --> [*]
  Finalizada --> [*]
```

- `fecha_reserva`: fecha local de creación.
- `fecha_retiro`: último día permitido para retirar, inclusive.
- `fecha_vencimiento`: fecha de vencimiento que tendrá el préstamo generado.
- Las reservas requieren retiro desde hoy y vencimiento igual o posterior al retiro.
- Se permiten reservas sin stock para mantener una cola. Una persona no puede tener dos reservas activas del mismo libro.
- Las reservas se atienden por fecha de reserva y, si coinciden, por ID ascendente.
- Con N copias disponibles pueden retirar las primeras N reservas activas de la cola. Las vencidas y canceladas no bloquean la atención.
- Crear, cancelar o vencer una reserva no cambia el stock. Solo el retiro lo reduce.
- Una reserva finalizada referencia exactamente un préstamo. Reintentar el retiro devuelve el mismo resultado, sin duplicar préstamo ni descontar otra copia.

## Préstamo

```mermaid
stateDiagram-v2
  [*] --> Vigente: registrar retiro
  Vigente --> Vencido: supera fechaVencimiento sin devolver
  Vigente --> Devuelto: devolver
  Vencido --> Devuelto: devolver
  Devuelto --> [*]
```

- `fecha_inicio`: fecha efectiva de retiro; la API la llama `fechaInicio`.
- `fecha_vencimiento`: devolución prevista; la API la llama `fechaVencimiento`.
- `fecha_devolucion`: devolución efectiva, nula hasta registrar la entrega; la API la llama `fechaDevolucion`.
- La fecha límite es inclusiva según `America/Argentina/Buenos_Aires`; pasa a vencido cuando el límite es menor que la fecha local actual.
- Devolver un préstamo vigente o vencido registra la fecha efectiva y repone una copia una sola vez.
- Un aviso visual de "vence pronto" tampoco representa un estado `PorVencer`.

## Migración de datos existentes

Las migraciones `users.0003`, `books.0010`, `loans.0007`, `loans.0008` y `books.0011` pasan los datos del esquema anterior (`books`, `loans`, `reservations`) al del diagrama, conservando los IDs de préstamos y reservas:

| Antes | Después |
| --- | --- |
| Cuenta con `categoria='bibliotecario'` | Fila en `Bibliotecario`; el resto va a `Usuario`. `nombre_apellido` se divide en `nombre` y `apellido` (primera palabra / resto). La contraseña (hash), imagen y código pasan a la persona |
| Tabla `users` | Se elimina (`users.0005`). La clave primaria de `Usuario` y `Bibliotecario` pasa de un número a el legajo (si la cuenta no tenía legajo, su nombre de usuario) y todas las referencias se actualizan |
| Libro con `nro_codigo` `ISBN-…` | Ese código sin el prefijo pasa a ser el `ISBN` |
| Libro sin código | `ISBN` provisorio `SIN-ISBN-<id de 6 dígitos>`; editalo cuando tengas el real |
| `disponibles` N y M préstamos abiertos | N ejemplares `disponible` y M `prestado`. El `nro_inventario` queda como código del primer ejemplar; los demás son `<código>-02`, `-03`… |
| `tipo` y `editorial` del libro | Se conservan en `palabrasClave`; `descripcion` pasa a `resumen` y `anio` a `anioCursada` |
| Préstamo de un libro | Apunta a un ejemplar del libro: los abiertos a uno `prestado`, los devueltos a cualquiera. Un libro con historial y sin ejemplares recibe uno en `baja` |
| Cuenta de bibliotecario que había pedido un libro | Deja de figurar como `Usuario`: sus préstamos, reservas y avisos como usuario se eliminan (los ejemplares prestados vuelven a disponibles). Un bibliotecario no puede ser usuario |

El admin de Django se quitó (su bitácora apuntaba a `users`). `tipo_prestamo`, `plazo_de_solicitud` y `datos_legacy` no tienen columna en el esquema nuevo y se descartan. El stock no cambia. Una fecha histórica desconocida sigue nula.

La separación no admite rollback automático; el intento falla antes de revertir el esquema. Para volver a la versión anterior hace falta restaurar un respaldo consistente junto con el código anterior. Ver [OPERACION](OPERACION.md).
