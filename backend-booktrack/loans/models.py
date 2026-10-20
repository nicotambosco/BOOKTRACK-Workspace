import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from books.models import Book


class Loan(models.Model):
    class Estado(models.TextChoices):
        VIGENTE = 'vigente', 'Vigente'
        VENCIDO = 'vencido', 'Vencido'
        DEVUELTO = 'devuelto', 'Devuelto'

    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='loans')
    libro = models.ForeignKey(Book, on_delete=models.PROTECT, related_name='loans')
    tipo_prestamo = models.CharField(max_length=50, default='normal')
    fecha_inicio = models.DateField(default=timezone.localdate)
    # Historical records may lack a known deadline or actual return date.
    fecha_vencimiento = models.DateField(null=True, blank=True)
    fecha_devolucion = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.VIGENTE)
    plazo_de_solicitud = models.CharField(max_length=50, blank=True)
    extension_pendiente = models.BooleanField(default=False)
    EXTENSION_ESTADO_CHOICES = [('', 'Sin resolver'), ('aprobada', 'Aprobada'), ('denegada', 'Denegada')]
    extension_estado = models.CharField(max_length=10, choices=EXTENSION_ESTADO_CHOICES, blank=True)

    class Meta:
        db_table = 'loans'
        constraints = [models.CheckConstraint(condition=models.Q(estado__in=['vigente', 'vencido', 'devuelto']), name='loan_valid_state')]

    def __str__(self):
        return f'{self.estudiante} → {self.libro} ({self.estado})'


class Reservation(models.Model):
    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        CANCELADA = 'cancelada', 'Cancelada'
        VENCIDA = 'vencida', 'Vencida'
        FINALIZADA = 'finalizada', 'Finalizada'

    codigo_reserva = models.CharField(max_length=40, unique=True, default=uuid.uuid4, editable=False)
    estudiante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reservations')
    libro = models.ForeignKey(Book, on_delete=models.PROTECT, related_name='reservations')
    bibliotecario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_reservations')
    fecha_reserva = models.DateField(default=timezone.localdate)
    fecha_vencimiento = models.DateField()
    fecha_devolucion_prevista = models.DateField(null=True, blank=True)
    prioridad = models.PositiveSmallIntegerField(default=0)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ACTIVA)
    prestamo = models.OneToOneField(Loan, on_delete=models.PROTECT, null=True, blank=True, related_name='reserva')
    # Original requests are preserved verbatim by the migration.
    datos_legacy = models.JSONField(default=dict, blank=True, editable=False)

    class Meta:
        db_table = 'reservations'
        ordering = ['-prioridad', 'fecha_reserva', 'id']
        indexes = [models.Index(fields=['libro', 'estado', 'prioridad'], name='reservation_queue_idx')]
        constraints = [
            models.CheckConstraint(condition=models.Q(estado__in=['activa', 'cancelada', 'vencida', 'finalizada']), name='reservation_valid_state'),
            models.CheckConstraint(condition=(models.Q(estado='finalizada', prestamo__isnull=False) | (~models.Q(estado='finalizada') & models.Q(prestamo__isnull=True))), name='reservation_finalized_loan'),
        ]

    def __str__(self):
        return f'{self.codigo_reserva} ({self.estado})'
