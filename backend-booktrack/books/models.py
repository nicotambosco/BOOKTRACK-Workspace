from django.db import models


class Libro(models.Model):
    ESTADO_CHOICES = [('activo', 'Activo'), ('inactivo', 'Inactivo')]

    isbn = models.CharField(max_length=32, primary_key=True, db_column='ISBN')
    titulo = models.CharField(max_length=255)
    autor = models.CharField(max_length=255, blank=True)
    categoria = models.CharField(max_length=100)
    anio_publicacion = models.PositiveSmallIntegerField(null=True, blank=True, db_column='anioPublicacion')
    resumen = models.TextField(blank=True)
    palabras_clave = models.CharField(max_length=255, blank=True, db_column='palabrasClave')
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='activo')
    # Fuera del diagrama, pero la app las usa: portada (viaja con la base) y año de cursada de la materia.
    imagen = models.TextField(blank=True)
    anio_cursada = models.PositiveSmallIntegerField(default=0, db_column='anioCursada')

    class Meta:
        db_table = 'Libro'

    def __str__(self):
        return self.titulo


class Ejemplar(models.Model):
    ESTADO_CHOICES = [('disponible', 'Disponible'), ('prestado', 'Prestado'), ('baja', 'Baja')]

    id = models.CharField(primary_key=True, db_column='idEjemplar', max_length=50)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='disponible')
    observaciones = models.TextField(blank=True)
    libro = models.ForeignKey(Libro, on_delete=models.PROTECT, related_name='ejemplares', db_column='ISBN')

    class Meta:
        db_table = 'Ejemplar'
        constraints = [models.CheckConstraint(condition=models.Q(estado__in=['disponible', 'prestado', 'baja']), name='ejemplar_valid_state')]

    def __str__(self):
        return f'{self.pk} ({self.estado})'
