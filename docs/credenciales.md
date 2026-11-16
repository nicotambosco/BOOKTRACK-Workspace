# Cuentas locales de demostración

Las cuentas se crean con `backend-booktrack/create_admin.py`: administrador principal `ADMIN-1` (`admin@booktrack.com`), bibliotecario `12473` y usuario `13885`. Configurá sus contraseñas en `SUPERADMIN_PASSWORD`, `ADMIN_PASSWORD` y `STUDENT_PASSWORD` antes de crearlas. No hay una contraseña compartida incorporada al script ni se modifican cuentas existentes.

Si `ADMIN-1` falta y `SUPERADMIN_PASSWORD` está vacía, puede recuperarse desde `data/booktrack.btbak` usando `BOOKTRACK_BACKUP_PASSWORD`. Esa recuperación conserva su contraseña original y solo agrega la cuenta administradora; no reemplaza otros datos.

Ver [instalación](README.md) y [operación](docs/OPERACION.md). No subir claves reales a Git.
