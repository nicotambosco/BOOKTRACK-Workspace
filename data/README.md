# Datos versionados

`booktrack.btbak` contiene una copia cifrada de los datos y archivos de BookTrack, incluida la cuenta administradora principal `ADMIN-1` con su contraseña almacenada como hash. Para actualizarla desde la base actual, ejecutá `python tools/publicar_datos.py` (o agregá `--docker` si usás Compose).

La clave no está en GitHub. Los archivos SQL/JSON/ZIP sin cifrar y las copias locales de recuperación se excluyen de Git.

En una instalación nueva, `create_admin.py` puede recuperar únicamente `ADMIN-1` si configurás la clave original en `BOOKTRACK_BACKUP_PASSWORD` y dejás `SUPERADMIN_PASSWORD` vacía. Para recuperar también el catálogo, las otras cuentas y las operaciones, seguí la restauración completa del enlace siguiente.

Ver [cómo publicar y restaurar los datos](../docs/DATOS_EN_GITHUB.md). El push de código por sí solo no exporta MySQL y no restaura una copia automáticamente.
