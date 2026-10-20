# Operación, actualizaciones y diagnóstico

## Instalación existente: actualizar con datos

1. Coordiná una ventana sin retiros, devoluciones ni modificaciones. Guardá el commit actualmente instalado con `git rev-parse HEAD` y una copia de tus archivos `.env`.
2. Detené frontend y backend. Conservá MySQL activo para generar el respaldo.
3. Creá un dump consistente de `booktrack_db` y verificá que puede restaurarse en una base de prueba.
4. Actualizá el código con `git pull --ff-only`. Revisá las variables nuevas del `.env.example`, sin sobrescribir tus claves.
5. En Compose, completá el `.env` de la raíz y ejecutá `docker compose up --build -d`. El backend aplica migraciones antes de atender solicitudes.
6. En instalación local, instalá los requirements y ejecutá `python manage.py migrate` antes de iniciar la nueva API y el frontend.
7. Comprobá reservas históricas, préstamos, fechas y stock antes de habilitar nuevamente la operación.

La nueva configuración de Compose usa `MYSQL_ROOT_PASSWORD` del `.env` tanto para MySQL como para Django. **En un volumen existente, usá la contraseña actual de la base**. Cambiar esa variable no cambia la contraseña ya guardada en MySQL. Las cuentas de demostración existentes tampoco cambian al editar `ADMIN_PASSWORD` o `STUDENT_PASSWORD`.

Las nuevas migraciones son `books.0009_book_estado` y `loans.0006_reservations_and_loan_lifecycle`. La segunda cambia el contrato de la API y convierte solicitudes antiguas en reservas, conservando sus datos originales. Frontend y backend se despliegan juntos. Consultá [MODELO_DATOS](MODELO_DATOS.md) para las reglas exactas de conversión.

La migración no admite deshacer automáticamente la separación. Para volver atrás, restaurá el respaldo previo con el código previo y revisá qué operaciones posteriores se perderían. Conservá antes una copia del estado actual. No uses `migrate loans 0005` como procedimiento de recuperación.

## Respaldos MySQL

Desde una terminal con el cliente MySQL, usando las credenciales y puerto reales:

```bash
mysqldump --host=127.0.0.1 --port=3307 --user=root --password --single-transaction --result-file=booktrack-respaldo.sql booktrack_db
```

`--password` pide la clave sin incluirla en la línea de comandos. Con MySQL nativo, el puerto suele ser 3306. Si no tenés cliente instalado, ejecutá `mysqldump` en el contenedor `db` y copiá el archivo fuera del contenedor. Guardá el respaldo en un lugar diferente al volumen de datos y no lo subas al repositorio.

Para verificar/restaurar, usá primero una base de prueba y `mysql --host=127.0.0.1 --port=3307 --user=root --password`, seguido de `SOURCE /ruta/al/respaldo.sql;` en esa sesión. Un dump de la base no incluye los archivos de `backend-booktrack/media`; respaldalos también si se utilizan.

## Respaldos SQLite

Con la aplicación detenida, copiá `backend-booktrack/db.local.sqlite3`. Si configuraste otro `DB_NAME`, respaldá ese archivo. Restaurar consiste en detener la aplicación, preservar el archivo actual y reemplazarlo por el respaldo correspondiente a la versión del código que se usará.

## Cuentas y configuración

- `.env` de la raíz: variables para Docker Compose.
- `backend-booktrack/.env`: variables del backend local.
- `create_admin.py`: crea `12473` como bibliotecario/superusuario y `13885` como usuario cuando faltan. Requiere contraseñas configuradas para las cuentas nuevas; no restablece las existentes.
- `python manage.py createsuperuser`: crea una cuenta administrativa de Django. Para usar también las pantallas de bibliotecario, asigná `categoria=bibliotecario` desde Django Admin.
- Las claves `.env`, archivos SQLite, media y respaldos no se versionan. Si actualizás desde una versión que incluía `.env` en Git, preservá primero tu configuración local.

## Vencimientos

```bash
python manage.py actualizar_estados
```

En Compose: `docker compose exec backend python manage.py actualizar_estados`. El comando marca vencidas las reservas cuyo límite de retiro pasó y vencidos los préstamos cuyo vencimiento pasó. No cambia stock. Las lecturas de la API también realizan esa actualización. El proyecto no instala automáticamente un cron ni una tarea programada.

## Diagnóstico

| Síntoma | Revisar |
| --- | --- |
| Docker informa permiso denegado o no conecta | Docker Desktop/servicio iniciado y permisos del usuario para acceder al motor |
| API aún no inicia | `docker compose logs backend`, estado saludable de MySQL y resultado de migraciones |
| Access denied en MySQL | Contraseña real del volumen existente, `DB_USER`, `DB_PASSWORD` y puerto; cambiar `.env` no altera una cuenta existente |
| Error compilando `mysqlclient` | Headers de MySQL/Python y compilador; usar Docker o `requirements-local.txt` para SQLite |
| Puertos ocupados | 4202, 8000 y 3307 en Compose; 4200 y 8000 en desarrollo |
| API 401 | Reingresar: el access JWT puede haber vencido |
| API 403 | Comprobar `categoria` de la cuenta; ser superusuario Django no reemplaza ese campo para la aplicación |
| Frontend local no conecta | Backend en 8000, `environment.ts` y origen CORS permitido |
| Compilación con Nginx no conecta | Usar ambos servicios del Compose; `/api` necesita el proxy hacia `backend:8000` |
| Reserva no permite retiro | Activa, plazo vigente, libro activo, devolución prevista válida, stock y posición de la cola |
| Reserva histórica sin plazo de devolución | Cancelarla y crear una nueva con ambas fechas |
| Libro/usuario no se puede borrar | Tiene historial protegido; para libros, inactivar |

El listado completo del catálogo y el historial no tienen paginación. Si crecen mucho, será necesario agregar paginación en ambos lados del contrato.
