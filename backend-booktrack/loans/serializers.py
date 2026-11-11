from django.utils import timezone
from rest_framework import serializers
from books.models import Libro
from .models import AccionAdministrativa, Notificacion, Prestamo, Reserva


class LoanSerializer(serializers.ModelSerializer):
    """Los ids de persona son legajos (los mismos que devuelve el login)."""
    estudianteId = serializers.CharField(source='usuario_id', read_only=True)
    estudianteLegajo = serializers.CharField(source='usuario_id', read_only=True)
    estudianteNombre = serializers.SerializerMethodField()
    libroId = serializers.CharField(source='ejemplar.libro_id', read_only=True)
    libroTitulo = serializers.CharField(source='ejemplar.libro.titulo', read_only=True)
    ejemplarId = serializers.IntegerField(source='ejemplar_id', read_only=True)
    ejemplarCodigo = serializers.CharField(source='ejemplar.codigo', read_only=True)
    bibliotecarioId = serializers.CharField(source='bibliotecario_id', read_only=True)
    fechaInicio = serializers.DateField(source='fecha_prestamo', read_only=True)
    fechaVencimiento = serializers.DateField(source='fecha_vencimiento', read_only=True)
    fechaDevolucion = serializers.DateField(source='fecha_devolucion', read_only=True)
    extensionPendiente = serializers.BooleanField(source='extension_pendiente', read_only=True)
    extensionEstado = serializers.CharField(source='extension_estado', read_only=True)

    class Meta:
        model = Prestamo
        fields = ['id', 'estudianteId', 'estudianteLegajo', 'estudianteNombre', 'libroId', 'libroTitulo',
                  'ejemplarId', 'ejemplarCodigo', 'bibliotecarioId', 'fechaInicio', 'fechaVencimiento',
                  'fechaDevolucion', 'estado', 'extensionPendiente', 'extensionEstado']
        read_only_fields = fields

    def get_estudianteNombre(self, loan):
        return str(loan.usuario)


class ReservationSerializer(serializers.ModelSerializer):
    codigoReserva = serializers.CharField(source='codigo_reserva', read_only=True)
    estudianteId = serializers.CharField(source='usuario_id', read_only=True)
    estudianteNombre = serializers.SerializerMethodField()
    libroId = serializers.PrimaryKeyRelatedField(source='libro', queryset=Libro.objects.all())
    libroTitulo = serializers.CharField(source='libro.titulo', read_only=True)
    fechaReserva = serializers.DateField(source='fecha_reserva', read_only=True)
    fechaVencimiento = serializers.DateField(source='fecha_vencimiento')
    fechaDevolucionPrevista = serializers.DateField(source='fecha_devolucion_prevista')
    prestamoId = serializers.IntegerField(source='prestamo_id', read_only=True)
    bibliotecarioId = serializers.CharField(source='bibliotecario_id', read_only=True)

    class Meta:
        model = Reserva
        fields = ['id', 'codigoReserva', 'estudianteId', 'estudianteNombre', 'libroId', 'libroTitulo',
                  'fechaReserva', 'fechaVencimiento', 'fechaDevolucionPrevista', 'prioridad', 'estado',
                  'prestamoId', 'bibliotecarioId']
        read_only_fields = ['estado', 'prioridad']

    def get_estudianteNombre(self, reservation):
        return str(reservation.usuario)

    def validate(self, attrs):
        if attrs['fecha_vencimiento'] < timezone.localdate():
            raise serializers.ValidationError({'fechaVencimiento': 'El retiro no puede vencer antes de hoy.'})
        if attrs['fecha_devolucion_prevista'] < attrs['fecha_vencimiento']:
            raise serializers.ValidationError({'fechaDevolucionPrevista': 'La devolución no puede ser anterior al retiro.'})
        return attrs


class PrioritySerializer(serializers.Serializer):
    prioridad = serializers.IntegerField(min_value=0, max_value=32767)


class NotificationSerializer(serializers.ModelSerializer):
    reservaId = serializers.IntegerField(source='reserva_id', read_only=True)
    prestamoId = serializers.IntegerField(source='prestamo_id', read_only=True)

    class Meta:
        model = Notificacion
        fields = ['id', 'fecha', 'tipo', 'mensaje', 'reservaId', 'prestamoId']


class AdminActionSerializer(serializers.ModelSerializer):
    bibliotecarioNombre = serializers.SerializerMethodField()
    tipoAccion = serializers.CharField(source='tipo_accion', read_only=True)
    reservaId = serializers.IntegerField(source='reserva_id', read_only=True)
    prestamoId = serializers.IntegerField(source='prestamo_id', read_only=True)
    libroId = serializers.CharField(source='libro_id', read_only=True)
    ejemplarId = serializers.IntegerField(source='ejemplar_id', read_only=True)

    class Meta:
        model = AccionAdministrativa
        fields = ['id', 'fecha', 'tipoAccion', 'descripcion', 'bibliotecarioNombre', 'reservaId', 'prestamoId',
                  'libroId', 'ejemplarId']

    def get_bibliotecarioNombre(self, action):
        return str(action.bibliotecario) if action.bibliotecario else ''
