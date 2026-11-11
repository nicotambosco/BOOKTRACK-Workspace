import uuid
from django.db import models
from django.utils import timezone


class Prestamo(models.Model):
    class Estado(models.TextChoices):
        VIGENTE = 'vigente', 'Vigente'
        VENCIDO = 'vencido', 'Vencido'
        DEVUELTO = 'devuelto', 'Devuelto'

    id = models.AutoField(primary_key=True, db_column='idPrestamo')
    fecha_prestamo = models.DateField(default=timezone.localdate, db_column='fechaPrestamo')
    # Los préstamos históricos pueden no tener vencimiento ni devolución conocidos.
    fecha_vencimiento = models.DateField(null=True, blank=True, db_column='fechaVencimiento')
    fecha_devolucion = models.DateField(null=True, blank=True, db_column='fechaDevolucion')
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.VIGENTE)
    usuario = models.ForeignKey('users.Usuario', on_delete=models.PROTECT, related_name='prestamos', db_column='idUsuario')
    ejemplar = models.ForeignKey('books.Ejemplar', on_delete=models.PROTECT, related_name='prestamos', db_column='idEjemplar')
    bibliotecario = models.ForeignKey('users.Bibliotecario', on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='prestamos', db_column='idBibliotecario')
    # Fuera del diagrama: renovaciones que el usuario solicita y el bibliotecario resuelve.
    extension_pendiente = models.BooleanField(default=False, db_column='extensionPendiente')
    EXTENSION_ESTADO_CHOICES = [('', 'Sin resolver'), ('aprobada', 'Aprobada'), ('denegada', 'Denegada')]
    extension_estado = models.CharField(max_length=10, choices=EXTENSION_ESTADO_CHOICES, blank=True, db_column='extensionEstado')

    class Meta:
        db_table = 'Prestamo'
        constraints = [models.CheckConstraint(condition=models.Q(estado__in=['vigente', 'vencido', 'devuelto']), name='prestamo_valid_state')]

    @property
    def libro(self):
        return self.ejemplar.libro

    def __str__(self):
        return f'{self.usuario} → {self.ejemplar.libro} ({self.estado})'


class Reserva(models.Model):
    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        CANCELADA = 'cancelada', 'Cancelada'
        VENCIDA = 'vencida', 'Vencida'
        FINALIZADA = 'finalizada', 'Finalizada'

    id = models.AutoField(primary_key=True, db_column='idReserva')
    codigo_reserva = models.CharField(max_length=40, unique=True, default=uuid.uuid4, editable=False, db_column='codigoReserva')
    prioridad = models.PositiveSmallIntegerField(default=0)
    fecha_reserva = models.DateField(default=timezone.localdate, db_column='fechaReserva')
    fecha_vencimiento = models.DateField(db_column='fechaVencimiento')
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ACTIVA)
    usuario = models.ForeignKey('users.Usuario', on_delete=models.PROTECT, related_name='reservas', db_column='idUsuario')
    libro = models.ForeignKey('books.Libro', on_delete=models.PROTECT, related_name='reservas', db_column='ISBN')
    bibliotecario = models.ForeignKey('users.Bibliotecario', on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='reservas', db_column='idBibliotecario')
    # Fuera del diagrama: fecha de devolución pedida y préstamo que originó la reserva al retirarse.
    fecha_devolucion_prevista = models.DateField(null=True, blank=True, db_column='fechaDevolucionPrevista')
    prestamo = models.OneToOneField(Prestamo, on_delete=models.PROTECT, null=True, blank=True,
                                    related_name='reserva', db_column='idPrestamo')

    class Meta:
        db_table = 'Reserva'
        ordering = ['-prioridad', 'fecha_reserva', 'id']
        indexes = [models.Index(fields=['libro', 'estado', 'prioridad'], name='reserva_queue_idx')]
        constraints = [
            models.CheckConstraint(condition=models.Q(estado__in=['activa', 'cancelada', 'vencida', 'finalizada']), name='reserva_valid_state'),
            models.CheckConstraint(condition=(models.Q(estado='finalizada', prestamo__isnull=False) | (~models.Q(estado='finalizada') & models.Q(prestamo__isnull=True))), name='reserva_finalized_loan'),
        ]

    def __str__(self):
        return f'{self.codigo_reserva} ({self.estado})'


class Notificacion(models.Model):
    id = models.AutoField(primary_key=True, db_column='idNotificacion')
    fecha = models.DateTimeField(default=timezone.now)
    tipo = models.CharField(max_length=40)
    mensaje = models.TextField()
    usuario = models.ForeignKey('users.Usuario', on_delete=models.CASCADE, related_name='notificaciones', db_column='idUsuario')
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True, related_name='notificaciones', db_column='idReserva')
    prestamo = models.ForeignKey(Prestamo, on_delete=models.SET_NULL, null=True, blank=True, related_name='notificaciones', db_column='idPrestamo')

    class Meta:
        db_table = 'Notificacion'
        ordering = ['-fecha', '-id']


class AccionAdministrativa(models.Model):
    id = models.AutoField(primary_key=True, db_column='idAccion')
    fecha = models.DateTimeField(default=timezone.now)
    tipo_accion = models.CharField(max_length=40, db_column='tipoAccion')
    descripcion = models.TextField(blank=True)
    bibliotecario = models.ForeignKey('users.Bibliotecario', on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='acciones', db_column='idBibliotecario')
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones', db_column='idReserva')
    prestamo = models.ForeignKey(Prestamo, on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones', db_column='idPrestamo')
    libro = models.ForeignKey('books.Libro', on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones', db_column='ISBN')
    ejemplar = models.ForeignKey('books.Ejemplar', on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones', db_column='idEjemplar')

    class Meta:
        db_table = 'AccionAdministrativa'
        ordering = ['-fecha', '-id']
