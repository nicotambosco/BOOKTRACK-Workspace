from django.db import models


class Book(models.Model):
    TIPO_CHOICES = [('libro base', 'Libro base'), ('libro de consulta', 'Libro de consulta')]

    titulo = models.CharField(max_length=255)
    autor = models.CharField(max_length=255, blank=True)
    editorial = models.CharField(max_length=255, blank=True)
    fecha_publicacion = models.CharField(max_length=20, blank=True)
    descripcion = models.TextField(blank=True)
    imagen = models.URLField(blank=True)
    nro_codigo = models.CharField(max_length=50, blank=True)
    nro_inventario = models.CharField(max_length=50, blank=True, unique=True, null=True)
    categoria = models.CharField(max_length=100)
    disponibles = models.PositiveIntegerField(default=1)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, blank=True)

    class Meta:
        db_table = 'books'

    def __str__(self):
        return self.titulo
