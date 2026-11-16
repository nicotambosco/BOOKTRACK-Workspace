# Roles y gestión de cuentas

Una misma identidad (legajo) puede tener uno o varios roles: `usuario`, `bibliotecario` y `admin`. Los roles se asignan con casillas en la pantalla **Usuarios y roles** (`/admin-bibliotecarios`). La búsqueda y el filtro por rol se aplican en el frontend. Una cuenta con varios roles aparece una sola vez y coincide con cada uno de sus roles.

Cada rol conserva su fila en `Usuario`, `Bibliotecario` o `Administrador`. Las filas activas del mismo legajo representan los roles asignados. Al quitar un rol se desactiva su fila; sus préstamos, reservas y acciones históricas se conservan. Nombre, email, imagen y hash de contraseña se mantienen sincronizados entre las filas. No se necesitan migraciones nuevas para habilitar las combinaciones de roles.

Las altas y ediciones rechazan un email que pertenezca a otro legajo, incluso si esa cuenta está inactiva, sin distinguir mayúsculas de minúsculas. Los roles de una misma identidad comparten el email y se permite dejarlo vacío. Si hay emails duplicados de datos anteriores, el acceso por email solicita ingresar con el legajo y corregir el email desde el perfil; no selecciona una cuenta arbitrariamente.

## Elegir la vista de trabajo

El login devuelve `token` y `user`, ambos con `roles` (la lista de roles disponibles). `categoria` sigue indicando la vista activa y `nivel` el tipo de fila, no un nivel que reemplace a los demás roles. Si la cuenta tiene el rol bibliotecario, esa es siempre su vista inicial, incluso si también tiene admin y aunque en la sesión anterior haya usado la vista admin. Una cuenta que solo tiene admin inicia en su panel de administración.

Cuando hay varios roles, el selector **Vista** permite alternar entre Usuario, Bibliotecario y Administrador. El guard solicita al servidor un token para la vista elegida antes de abrir sus rutas; no hace falta volver a escribir la contraseña. Se conserva la preferencia de recordar sesión.

| Método | Ruta | Datos / uso |
|---|---|---|
| POST | `/api/users/active-role/` | `{ "rol": "bibliotecario" }`; valida que ese rol esté activo y devuelve un nuevo `token` y `user` |
| GET | `/api/roles/` | Solo vista admin; cuentas activas sin duplicados, con `roles` |
| PATCH | `/api/roles/<legajo>/` | Requiere vista admin, tanto para la cuenta propia como para terceros; se aplica la jerarquía. Body: `{ "roles": ["admin", "bibliotecario"] }` |

Se exige al menos un rol válido y sin duplicados. La jerarquía es **Administrador > Bibliotecario > Usuario**. Se toma el rango más alto asignado a la cuenta; cambiar la vista activa no modifica su autoridad.

| Cuenta | Gestión de roles en la aplicación |
|---|---|
| Usuario | Sin acceso al panel admin; no modifica roles desde su perfil |
| Bibliotecario | Sin acceso al panel admin; los cambios los realiza un administrador |
| Administrador normal | Desde el panel admin puede quitarse Bibliotecario y Usuario; conserva Admin y no puede agregarse roles |
| Administrador fijo (`ADMIN-1`) | Puede agregar y quitar roles; conserva siempre su Admin fijo |

Un administrador normal puede modificar los roles inferiores de otras cuentas desde la vista admin, pero no otorgar ni retirar Admin. Solo `ADMIN-1` puede hacer esos cambios. La regla también se valida en la desactivación del rol bibliotecario y en las eliminaciones de cuentas para evitar eludir la jerarquía.

`rolesFijos` identifica el Admin permanente de `ADMIN-1`; el frontend distingue los roles fijos de las opciones bloqueadas por la jerarquía. La gestión de roles se realiza exclusivamente en el panel admin (`/admin-bibliotecarios`), con la vista administrador activa. Los perfiles de usuario y bibliotecario solo muestran datos personales y permiten actualizar el email; no incluyen controles de asignación ni eliminación de roles. El selector no permite autoasignaciones salvo para `ADMIN-1`.

La modificación de roles invalida los tokens anteriores del destinatario, que deberá volver a iniciar sesión. Al modificar la propia cuenta, la respuesta incluye un token actualizado. La operación conserva la vista admin, desde la que se realizó el cambio. La preferencia de iniciar como bibliotecario se aplica en el próximo login.

Se admite el cuerpo anterior `{ "nivel": 0|1|2 }` para clientes previos: asigna exclusivamente ese rol. No se puede enviar `nivel` y `roles` a la vez. Los endpoints de perfil y registro no permiten asignar privilegios.

## Gestión de bibliotecarios

Todos estos endpoints requieren la vista admin:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/librarians/` | Fichas con estadísticas; incluye bibliotecarios activos aunque también sean administradores |
| POST | `/api/librarians/` | Alta con `legajo`, `nombreApellido`, `email` y `contrasena` (mínimo 6 caracteres) |
| PATCH | `/api/librarians/<legajo>/` | Editar `nombreApellido` y `email`, o activar/desactivar el rol bibliotecario con `activo` |
| GET | `/api/librarians/<legajo>/activity/` | Últimas diez acciones del bibliotecario |

Desactivar el rol bibliotecario no desactiva los demás roles de la persona. Una fila bibliotecaria inactiva de alguien que tiene otros roles activos se conserva como historial y deja de aparecer como bibliotecario actual. Puede recuperarse asignando nuevamente ese rol desde su ficha de usuario. Una cuenta exclusivamente bibliotecaria inactiva sigue visible para poder reactivarla.

En la vista bibliotecario se pueden gestionar libros, ejemplares, lectores, reservas, retiros, devoluciones, reportes y actividad. Las relaciones y la auditoría se registran con su fila `Bibliotecario`, aunque la misma cuenta también tenga rol admin. En la vista usuario se muestran sus propias reservas y préstamos.

## Respaldo y comprobaciones

Las copias `.btbak` incluyen las filas y sus estados activos, por lo que conservan las combinaciones de roles y sus credenciales. Las copias anteriores con un único rol siguen siendo compatibles.

Las pruebas cubren asignación múltiple, selección de vista, permisos, invalidación de tokens, sincronización de la ficha, retiros/devoluciones con auditoría y restauración de una cuenta con varios roles.
