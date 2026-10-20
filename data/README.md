# Datos versionados

`booktrack.btbak` contendrá una copia cifrada de los datos y archivos de BookTrack después de ejecutar `python tools/publicar_datos.py` en la PC que usa la base real.

La clave no está en GitHub. Los archivos SQL/JSON/ZIP sin cifrar y las copias locales de recuperación se excluyen de Git.

Ver [cómo publicar y restaurar los datos](../docs/DATOS_EN_GITHUB.md). El push de código por sí solo no exporta MySQL y no restaura una copia automáticamente.
