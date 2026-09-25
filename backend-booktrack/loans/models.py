from django.db import models
from django.conf import settings
from django.utils import timezone
from books.models import Book


class Loan(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('denegado', 'Denegado'),
        ('devuelto', 'Devuelto'),
    ]

    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    libro = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='loans')
    tipo_prestamo = models.CharField(max_length=50)
    fecha_inicio = models.DateField(default=timezone.localdate)
    fecha_fin = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='pendiente')
    plazo_de_solicitud = models.CharField(max_length=50, blank=True)
    extension_pendiente = models.BooleanField(default=False)
    EXTENSION_ESTADO_CHOICES = [('', 'Sin resolver'), ('aprobada', 'Aprobada'), ('denegada', 'Denegada')]
    extension_estado = models.CharField(max_length=10, choices=EXTENSION_ESTADO_CHOICES, blank=True)

    class Meta:
        db_table = 'loans'

    def __str__(self):
        return f'{self.estudiante} → {self.libro} ({self.estado})'
