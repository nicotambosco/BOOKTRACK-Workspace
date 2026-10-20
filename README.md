# BookTrack

Aplicación de biblioteca con catálogo, reservas, retiro de libros, préstamos, renovaciones y devoluciones. El frontend usa Angular 21; la API usa Django REST Framework y JWT; Docker Compose utiliza MySQL 8.4.

Las **reservas** tienen estados `activa`, `cancelada`, `vencida` y `finalizada`. Un **préstamo** nace al registrar el retiro y tiene estados `vigente`, `vencido` y `devuelto`. La fecha de vencimiento y la devolución efectiva se guardan por separado.

## Montar con Docker

Requisitos: Git, Docker Engine/Desktop y Docker Compose v2, con el servicio Docker iniciado. Esta configuración sirve para trabajar o demostrar el proyecto en una computadora local.

```bash
git clone https://github.com/nicotambosco/BOOKTRACK-Workspace.git
cd BOOKTRACK-Workspace
cp .env.example .env
```

En PowerShell, usá `Copy-Item .env.example .env`. Editá `.env`: elegí contraseñas propias para `MYSQL_ROOT_PASSWORD`, `ADMIN_PASSWORD` y `STUDENT_PASSWORD`, y una `SECRET_KEY` aleatoria. Podés generar la clave con `python -c "import secrets; print(secrets.token_urlsafe(50))"`.

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

El backend aplica migraciones y crea las cuentas de demostración si todavía no existen. Las migraciones iniciales también cargan el catálogo de ejemplo. El frontend espera que la API esté disponible antes de iniciar.

| Servicio | Dirección desde la computadora |
| --- | --- |
| Aplicación | <http://localhost:4202> |
| API REST | <http://localhost:8000/api/> |
| Django Admin | <http://localhost:8000/admin/> |
| MySQL | `127.0.0.1:3307`, base `booktrack_db`, usuario `root` |

Dentro de Compose, Django usa `db:3306`; Nginx envía `/api/` al servicio `backend:8000`. El navegador usa el mismo origen del frontend para la API de la compilación de producción.

| Rol de demostración | Legajo para ingresar | Contraseña |
| --- | --- | --- |
| Bibliotecario | `12473` | La elegida en `ADMIN_PASSWORD` |
| Usuario | `13885` | La elegida en `STUDENT_PASSWORD` |

`create_admin.py` no cambia las contraseñas de usuarios existentes. Para detener sin borrar los datos: `docker compose down`. El volumen `mysql_data` conserva la base. **No uses `down -v` para una actualización**, porque elimina el volumen.

Si ya tenías una instalación, seguí primero [Actualización y respaldo](docs/OPERACION.md): la separación de reservas y préstamos incluye una migración de datos.

## Desarrollo local sin MySQL

Requisitos: Python 3.12, Node.js 24 y npm. Usá dos terminales.

Backend, desde la raíz:

```bash
python -m venv backend-booktrack/.venv
source backend-booktrack/.venv/bin/activate
cd backend-booktrack
python -m pip install -r requirements-local.txt
cp .env.example .env
```

En PowerShell, activá con `backend-booktrack\.venv\Scripts\Activate.ps1` desde la raíz y usá `Copy-Item .env.example .env` después de entrar en `backend-booktrack`. En Windows, si el comando es `py`, podés usar `py -3.12 -m venv backend-booktrack/.venv`.

Revisá la clave y las contraseñas de `backend-booktrack/.env`. Para SQLite:

```dotenv
DB_ENGINE=sqlite3
DB_NAME=db.local.sqlite3
```

```bash
python manage.py migrate
python create_admin.py
python manage.py runserver 127.0.0.1:8000
```

Frontend, en otra terminal desde la raíz:

```bash
cd BookTrack
npm ci
npm start
```

Abrí <http://localhost:4200>. En desarrollo el frontend usa `http://127.0.0.1:8000/api`; esa configuración está en `BookTrack/src/environments/environment.ts`. El archivo `environment.prod.ts` usa `/api` mediante el proxy de Nginx.

## Desarrollo local con MySQL

Creá una base `booktrack_db` con codificación `utf8mb4` y un usuario con permisos sobre esa base. En el entorno virtual del backend instalá `requirements.txt` en lugar de `requirements-local.txt` y configurá:

```dotenv
DB_ENGINE=mysql
DB_NAME=booktrack_db
DB_USER=booktrack
DB_PASSWORD=tu-clave-local
DB_HOST=127.0.0.1
DB_PORT=3306
```

Si la base es la del Compose, el puerto desde la computadora es `3307`. No cambies `DB_NAME` a un nombre de archivo cuando `DB_ENGINE=mysql`. En Ubuntu/Debian, compilar `mysqlclient` requiere `build-essential`, `default-libmysqlclient-dev`, `pkg-config` y los encabezados de Python. Docker ya instala las dependencias del driver.

Después ejecutá `python manage.py migrate`, creá las cuentas e iniciá el backend como en el apartado anterior.

## Verificación

Con el entorno virtual activo, desde `backend-booktrack`:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Desde `BookTrack`:

```bash
npm test
npm run build
```

Las pruebas de concurrencia necesitan MySQL y se omiten con SQLite. [TESTING.md](docs/TESTING.md) explica las comprobaciones, la migración de prueba y el alcance de cada entorno.

## Documentación

- [Índice y decisiones del proyecto](docs/README.md).
- [Funcionalidades y recorrido de uso](docs/FUNCIONALIDADES.md).
- [Arquitectura y despliegue](docs/ARQUITECTURA.md).
- [Modelo de datos y estados](docs/MODELO_DATOS.md).
- [API y permisos](docs/API.md).
- [Actualización, respaldos y problemas frecuentes](docs/OPERACION.md).
- [Pruebas y CI](docs/TESTING.md).
- [Diagramas corregidos en PDF](docs/diagramas/BookTrack_diagramas_A4_corregidos.pdf).

La recuperación de contraseña de la interfaz es una simulación. Los avisos se calculan en el navegador; no hay servicio de correo ni notificaciones persistentes. El modelo conceptual del PDF incluye entidades que todavía no existen como tablas separadas; consultá la correspondencia en [MODELO_DATOS.md](docs/MODELO_DATOS.md).

Compose utiliza `runserver`, credenciales de desarrollo y puertos publicados solo en loopback. Para una publicación en Internet hacen falta un servidor WSGI/ASGI, HTTPS, `DEBUG=False`, gestión de secretos, archivos estáticos y la configuración de hosts/orígenes del despliegue. Las imágenes de GHCR generadas por CI son imágenes de la aplicación, no una instalación de producción ya configurada.
