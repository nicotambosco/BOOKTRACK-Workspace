# Instructivo backend — rol Admin y gestión de bibliotecarios

Estado: niveles de privilegio **hechos** (secciones 2, 3, 4 y 6); **pendientes** los endpoints de la sección 5. El front ya está hecho (`/admin-bibliotecarios`) y llama a estos endpoints; hasta que se implementen, la vista muestra el error "No se pudo cargar la lista".

## 1. Objetivo

Un tercer rol, `admin`, que solo gestiona cuentas de bibliotecarios (alta, edición de ficha, activar/desactivar y ver su actividad). El admin **no** opera préstamos ni libros. Sigue la convención actual: **cada rol vive en su propia tabla**, con el legajo como clave primaria.

## 2. Modelo (HECHO)

Tres cuentas distintas, cada una en su tabla y con su legajo como clave primaria. Cada persona tiene además `nivel` (privilegios): **0 usuario, 1 bibliotecario, 2 admin**. `categoria` ('usuario' / 'bibliotecario' / 'admin') se deriva del nivel y se sigue enviando al front.

- Tabla nueva `Administrador` (separada de `Bibliotecario`). El admin no es un bibliotecario con más permisos.
- Restricciones en la base: `Usuario.nivel = 0`, `Bibliotecario.nivel = 1`, `Administrador.nivel = 2`.
- `find_persona` busca en las tres tablas, así que el legajo es único entre las tres.
- Migración `users/0006_nivel_y_administrador.py`: crea la tabla y la columna `nivel` (usuarios en 0, bibliotecarios en 1). **Falta aplicarla** con `python manage.py migrate`.

## 3. Autenticación (HECHO)

El token lleva `categoria` y con eso se elige la tabla (`MODELO_POR_CATEGORIA`). El login busca en las tres tablas. `/users/login/` y `/users/me/` devuelven también `nivel`.

## 4. Permiso (`loans/permissions.py`)

```python
class IsAdmin(BasePermission):
    message = 'Esta operación requiere el rol admin.'

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.categoria == 'admin')
```

## 5. Endpoints (nueva app o `users/`, montar en `booktrack/urls.py`)

`path('api/librarians/', include('users.librarian_urls'))`. Todos con `permission_classes = [IsAdmin]`.

| Método | Ruta | Uso | Body |
|---|---|---|---|
| GET | `/api/librarians/` | Lista (activos e inactivos) ordenada por legajo | — |
| POST | `/api/librarians/` | Alta | `legajo, nombreApellido, email, contrasena` (≥ 6 caracteres) |
| PATCH | `/api/librarians/<legajo>/` | Editar / activar / desactivar | cualquiera de `nombreApellido, email, activo` |
| GET | `/api/librarians/<legajo>/activity/` | Últimas 10 acciones | — |

**Respuesta de bibliotecario** (lista, alta y PATCH), la misma forma que `Bibliotecario` en `models/librarian.model.ts`:

```json
{ "id": "L-0012", "legajo": "L-0012", "nombreApellido": "Mariana López", "email": "mlopez@booktrack.com",
  "activo": true, "prestamosGestionados": 128, "devoluciones": 119, "pendientes": 9 }
```

Cómo se calculan (sobre `Prestamo.bibliotecario`):
- `prestamosGestionados` = total de préstamos del bibliotecario.
- `devoluciones` = los de `estado='devuelto'`.
- `pendientes` = los de `estado` `vigente` o `vencido`.
- En la lista, usar `annotate(Count(..., filter=Q(...)))` sobre `Bibliotecario` para no hacer una consulta por fila.

**Actividad**: `AccionAdministrativa.objects.filter(bibliotecario=b)[:10]` (ya viene ordenada por fecha desc) → `[{ "descripcion": "...", "fecha": "<ISO 8601>" }]`. El front formatea la fecha.

Reglas:
- - Alta: el rol **nunca** viene del cliente; se crea siempre un `Bibliotecario`. Validar legajo no vacío y único con `find_persona` (409/400 con mensaje "Ya existe una cuenta con ese legajo."), contraseña con `set_password`, `nombreApellido` partido con `split_name`.
- PATCH: el legajo no se puede cambiar (es la clave primaria); se ignora si llega. Si llega `nombreApellido`, usar `split_name`.
- No hay DELETE: un bibliotecario con préstamos/acciones históricas no se borra, se desactiva (`is_active=False`). Un bibliotecario inactivo ya no puede iniciar sesión ni usar su token (login y `PersonaJWTAuthentication` ya lo rechazan).
- 404 si el legajo no es de un bibliotecario (no exponer usuarios ni admins por este endpoint).

## 6. Crear el primer admin (`create_admin.py`)

Agregar, junto a las cuentas de demostración:

```python
create_person(Administrador, 'ADMIN-1', config('SUPERADMIN_PASSWORD'),
              nombre='Admin', email='superadmin@booktrack.local')
```

Variable nueva `SUPERADMIN_PASSWORD` en el `.env` (documentarla en `STARTUP.md`). No se crean admins desde la API: solo por este script o por consola.

## 7. Tests (patrón de `users/test_api.py`)

- Login de admin devuelve `categoria: 'admin'`.
- Un bibliotecario y un usuario reciben 403 en `/api/librarians/`; sin token, 401.
- El admin recibe 403 en endpoints de bibliotecario (`/api/loans/` de gestión, libros) — confirma que no hereda permisos.
- Alta: crea `Bibliotecario`, legajo duplicado (incluso de un usuario o admin) falla, contraseña corta falla.
- PATCH `activo=false` → ese bibliotecario ya no puede iniciar sesión; `activo=true` lo recupera.
- Estadísticas: con 3 préstamos (1 devuelto, 1 vigente, 1 vencido) → 3 / 1 / 2.

## 8. Docs a actualizar

`docs/API.md` (4 endpoints), `docs/MODELO_DATOS.md` (tabla `Administrador` y columna `nivel`), `docs/FUNCIONALIDADES.md` (rol admin) y `docs/credenciales.md` (cuenta demo).

## 9. Orden de implementación sugerido

1. Modelo + migración + `find_persona`.
2. Autenticación (token y login).
3. `IsAdmin` + endpoints + serializer.
4. `create_admin.py`.
5. Tests y docs.

Mientras tanto no se toca el front salvo que cambie el contrato de la sección 5.
