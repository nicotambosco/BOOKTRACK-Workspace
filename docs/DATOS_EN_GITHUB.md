# Incluir los datos en GitHub

El repositorio puede guardar una **copia cifrada de todos los datos de BookTrack** en `data/booktrack.btbak`. Incluye usuarios y sus hashes de contraseña, grupos/permisos, libros, reservas, préstamos, comentarios, categorías, sesiones, registros administrativos de Django y todos los archivos de `media`. Las portadas y fotos guardadas como data URI viajan dentro de los registros.

Es una copia portable de los modelos administrados por Django, con sus IDs y relaciones. El esquema y las migraciones viajan en el código. No es un dump de otras bases o tablas externas a Django del servidor MySQL. No incluye `.env`, la contraseña de MySQL, `SECRET_KEY` ni la clave de cifrado.

**La copia se genera en la PC que contiene la base o puede conectarse a ella.** No se puede extraer la base de otra computadora con un push ejecutado desde una PC que no tiene acceso a esa base.

## Primera configuración en la PC con MySQL

1. Antes de actualizar una instalación con datos, creá el respaldo MySQL descrito en [OPERACION](OPERACION.md).
2. Hacé `git pull --ff-only`, instalá las dependencias actualizadas del backend y ejecutá `python manage.py migrate` con la configuración de esa base.
3. Configurá una clave independiente para las copias, de al menos 16 caracteres. Generá una aleatoria larga con:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. Guardala en `backend-booktrack/.env`, que está excluido de Git:

   ```dotenv
   BOOKTRACK_BACKUP_PASSWORD=tu-clave-aleatoria-larga
   ```

5. Conservá esa clave también en un gestor de contraseñas o en otro lugar privado. Hace falta la misma clave para restaurar la copia en otra PC. Si la perdés, no se puede descifrar el archivo de GitHub. No uses la contraseña de MySQL como clave de la copia ni subas `.env` al repositorio.
6. Comprobá que Git tenga configurados tu identidad y el acceso de escritura al repositorio.

En Docker, configurá `BOOKTRACK_BACKUP_PASSWORD` en el `.env` de la raíz y actualizá la imagen/servicio backend con `docker compose up --build -d`. Compose comparte `./data` con `/app/data` del backend. La clave se inyecta como variable local del contenedor; no se escribe dentro de la copia.

## Publicar código y datos

Primero revisá y commiteá los cambios de código de la forma habitual. Después, desde la raíz del repositorio en **la PC que tiene los datos**, ejecutá:

```bash
python tools/publicar_datos.py
```

Si la aplicación y la base están en Compose:

```bash
python tools/publicar_datos.py --docker
```

El publicador utiliza la `.venv` de `backend-booktrack` si existe; también acepta `--python /ruta/al/python` para otro entorno. En Docker se necesita Python 3 en la computadora para el publicador, pero no las dependencias Django fuera del contenedor.

Este comando:

1. Rechaza cambios de código o archivos pendientes para evitar incluirlos por accidente.
2. Consulta `origin` y se detiene si la rama remota tiene commits que todavía no integraste.
3. Crea una copia consistente de los registros, agrega los archivos cargados y cifra el conjunto.
4. Agrega a Git **solo** `data/booktrack.btbak` y crea un commit de datos.
5. Hace push de la rama actual a `origin`, incluyendo también sus commits de código pendientes.

No usa `git add .`, no fuerza el push y no hace una restauración automática. Si el push falla, el commit de datos queda local para reintentarlo con `git push`. Para crear el commit sin acceder a GitHub, agregá `--no-push`.

**`git push` solo no vuelve a leer MySQL.** Para incluir lo recién agregado a la base, usá el publicador después de cargar los datos. No se instalan hooks que modifiquen commits o la base de forma oculta.

Antes de copiar, terminá las operaciones y cerrá o pausá las pantallas que escriben en la aplicación. La lectura de MySQL usa una transacción con aislamiento repetible y requiere tablas InnoDB; los archivos de `media` deben permanecer sin cambios mientras se genera la copia.

## Restaurar en otra PC

1. Cloná o actualizá el repo y montá el entorno siguiendo el [README](../README.md).
2. Configurá la conexión de destino a una base propia y ejecutá `migrate`. Se necesitan exactamente las mismas migraciones aplicadas que en la copia. No se necesita el mismo nombre de base ni el mismo motor: se puede pasar de MySQL a SQLite y viceversa.
3. Colocá la clave de copia en el `.env` local de esa PC.
4. Detené la aplicación o su actividad de escritura y verificá primero el archivo:

   ```bash
   cd backend-booktrack
   python manage.py restaurar_datos --check-only
   ```

5. Para reemplazar los datos de esa instalación y su carpeta `media` por la copia de GitHub:

   ```bash
   python manage.py restaurar_datos --replace
   ```

`--replace` es obligatorio: esta operación reemplaza el contenido de la base configurada, no mezcla registros. Antes crea una copia cifrada del estado previo en `data/recovery/`; esa carpeta no se publica. Si falla la carga o el cambio de archivos, se revierte la transacción y se conserva la copia de recuperación. Verificá siempre `DB_HOST`, `DB_NAME` y la instalación de destino antes de restaurar.

En Compose, los comandos equivalentes desde la raíz son:

```bash
docker compose exec -T backend python manage.py restaurar_datos --check-only --no-input
docker compose exec -T backend python manage.py restaurar_datos --replace --no-input
```

El backend del contenedor necesita estar iniciado para ejecutar esos comandos, pero no debe recibir operaciones durante la restauración. Después podés reiniciarlo con `docker compose restart backend`.

Si cambiás `SECRET_KEY` entre PCs, las sesiones antiguas pueden dejar de ser válidas; ingresá nuevamente. Las contraseñas de los usuarios se conservan porque se restauran sus hashes, pero la clave de MySQL de destino se configura por separado en `.env`.

## Exportar sin hacer un commit

Desde el backend:

```bash
python manage.py exportar_datos
```

También se admite `--output /ruta/copia.btbak` y una clave en un archivo local con `--password-file /ruta/privada/clave.txt`. Si no configuraste la clave, el comando interactivo la pregunta sin mostrarla; `--no-input` falla en lugar de esperar una entrada. El publicador usa el modo sin preguntas, por eso requiere configurar la clave previamente.

## Alcance y límites

- No se generó una copia inicial con datos reales desde otra PC; el archivo aparecerá después de ejecutar el publicador allí. No se publican datos de pruebas como si fueran tu base.
- La copia guarda una versión completa. Cada publicación agrega otra versión al historial de Git y ocupa espacio; se admite hasta 90 MiB cifrados y 512 MiB sin comprimir. Para bases grandes corresponde otro almacenamiento de respaldos.
- Git distribuye archivos de copia, no es una base compartida en tiempo real. Dos personas que cargan registros en bases distintas deben coordinar qué copia restaurar; no hay fusión automática de esos registros.
- El cifrado utiliza AES-256-GCM autenticado con una clave derivada mediante scrypt y salt/nonce nuevos en cada exportación. La clave y el contenido no se imprimen ni se agregan al commit.

Referencias técnicas: [cifrado autenticado](https://cryptography.io/en/latest/hazmat/primitives/aead/), [serialización de Django](https://docs.djangoproject.com/en/6.0/topics/serialization/).
