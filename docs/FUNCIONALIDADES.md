# Funcionalidades y recorrido

## Usuario

1. Registrarse e ingresar con legajo o email y contraseña. El registro público asigna el rol usuario.
2. Consultar y buscar el catálogo, filtrar por categoría y abrir el detalle del libro.
3. Elegir **Reservar libro**, completar **Fecha de retiro** y **Fecha de vencimiento**, y crear una reserva activa. Un libro sin copias disponibles admite lista de espera; un libro inactivo no admite reserva.
4. Abrir **Mi historial** para consultar las reservas, cancelar una activa o ver el préstamo generado.
5. Retirar físicamente el libro: el bibliotecario selecciona el ejemplar y crea el préstamo con el vencimiento de la reserva.
6. Consultar el préstamo y su fecha de vencimiento.
7. Entregar físicamente el libro al bibliotecario, que registra la devolución.

También puede editar su perfil y foto. El historial personal solo muestra sus propias reservas y préstamos.

## Bibliotecario

Desde la pantalla de inicio administrativa se accede al catálogo, usuarios, reportes, historial y gestión de reservas/préstamos.

- Dar de alta libros, modificar datos, portada, disponibilidad y estado activo/inactivo.
- Consultar todas las reservas, y registrar el retiro de una reserva activa.
- Cancelar una reserva activa. No existe una aprobación o rechazo previo para que se active.
- Registrar devoluciones de préstamos vigentes o vencidos.
- Consultar el archivo y exportar los préstamos a PDF o Excel, respetando el filtro de estado.
- Ver totales de libros, usuarios, reservas activas y préstamos vigentes, vencidos o devueltos.
- Consultar y administrar perfiles. El rol lo define la tabla (`Usuario` o `Bibliotecario`); no se asigna mediante registro público ni edición de perfil.

La eliminación de un libro o usuario con historial devuelve un error de validación. Para retirar un título del servicio se usa el estado inactivo.

## Pantallas y rutas principales

| Ruta | Uso |
| --- | --- |
| `/login`, `/register` | Sesión y registro |
| `/home`, `/book-search`, `/book/:id` | Catálogo y detalle |
| `/loan-request/:bookId` | Crear reserva; se conserva la ruta anterior por compatibilidad de navegación |
| `/user-history` | Reservas y préstamos propios |
| `/home-admin` | Panel de bibliotecario |
| `/loan-management` | Reservas, retiros y devoluciones |
| `/loan-history`, `/loan-archive` | Historial y exportaciones |
| `/book-management`, `/book-add`, `/book-edit/:id` | Catálogo administrativo |
| `/user-management`, `/reports` | Usuarios y estadísticas |
| `/profile`, `/profile-admin` | Perfil |

## Alcances actuales

La recuperación de contraseña de la interfaz es una simulación; no envía un correo ni cambia credenciales. El encabezado muestra avisos derivados del estado y las fechas de préstamos; los IDs leídos se guardan en `localStorage` del navegador, sin sincronización entre dispositivos. No hay notificaciones persistentes ni emails de vencimiento.


Los formularios y componentes antiguos que no están enlazados en `app.routes.ts` no agregan funcionalidades por sí mismos. Los módulos de ejemplares individuales y auditoría de negocio del diseño conceptual siguen pendientes.

## Actividad administrativa

Desde el inicio del bibliotecario, **Actividad administrativa** consulta la tabla `AccionAdministrativa`: creación de préstamos, devoluciones y cancelaciones realizadas por bibliotecarios. Muestra responsable, fecha/hora de Argentina, lector, libro y referencias de reserva/préstamo/ejemplar. Se puede buscar, filtrar por operación, bibliotecario o fechas y abrir el perfil del lector. El registro es de solo lectura y no está disponible para usuarios comunes.
