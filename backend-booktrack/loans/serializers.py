from django.utils import timezone
from rest_framework import serializers
from books.models import Book
from .models import Loan, Reservation


class LoanSerializer(serializers.ModelSerializer):
    estudianteId = serializers.IntegerField(source='estudiante_id', read_only=True)
    estudianteLegajo = serializers.CharField(source='estudiante.legajo', read_only=True)
    estudianteNombre = serializers.CharField(source='estudiante.nombre_apellido', read_only=True)
    libroId = serializers.IntegerField(source='libro_id', read_only=True)
    libroTitulo = serializers.CharField(source='libro.titulo', read_only=True)
    tipoPrestamo = serializers.CharField(source='tipo_prestamo', read_only=True)
    fechaInicio = serializers.DateField(source='fecha_inicio', read_only=True)
    fechaVencimiento = serializers.DateField(source='fecha_vencimiento', read_only=True)
    fechaDevolucion = serializers.DateField(source='fecha_devolucion', read_only=True)
    plazoDeSolicitud = serializers.CharField(source='plazo_de_solicitud', read_only=True)
    extensionPendiente = serializers.BooleanField(source='extension_pendiente', read_only=True)
    extensionEstado = serializers.CharField(source='extension_estado', read_only=True)

    class Meta:
        model = Loan
        fields = ['id', 'estudianteId', 'estudianteLegajo', 'estudianteNombre', 'libroId', 'libroTitulo',
                  'tipoPrestamo', 'fechaInicio', 'fechaVencimiento', 'fechaDevolucion', 'estado',
                  'plazoDeSolicitud', 'extensionPendiente', 'extensionEstado']
        read_only_fields = fields


class ReservationSerializer(serializers.ModelSerializer):
    codigoReserva = serializers.CharField(source='codigo_reserva', read_only=True)
    estudianteId = serializers.IntegerField(source='estudiante_id', read_only=True)
    estudianteNombre = serializers.CharField(source='estudiante.nombre_apellido', read_only=True)
    libroId = serializers.PrimaryKeyRelatedField(source='libro', queryset=Book.objects.all())
    libroTitulo = serializers.CharField(source='libro.titulo', read_only=True)
    fechaReserva = serializers.DateField(source='fecha_reserva', read_only=True)
    fechaVencimiento = serializers.DateField(source='fecha_vencimiento')
    fechaDevolucionPrevista = serializers.DateField(source='fecha_devolucion_prevista')
    prestamoId = serializers.IntegerField(source='prestamo_id', read_only=True)
    bibliotecarioId = serializers.IntegerField(source='bibliotecario_id', read_only=True)

    class Meta:
        model = Reservation
        fields = ['id', 'codigoReserva', 'estudianteId', 'estudianteNombre', 'libroId', 'libroTitulo',
                  'fechaReserva', 'fechaVencimiento', 'fechaDevolucionPrevista', 'prioridad', 'estado',
                  'prestamoId', 'bibliotecarioId']
        read_only_fields = ['estado', 'prioridad']

    def validate(self, attrs):
        if attrs['fecha_vencimiento'] < timezone.localdate():
            raise serializers.ValidationError({'fechaVencimiento': 'El retiro no puede vencer antes de hoy.'})
        if attrs['fecha_devolucion_prevista'] < attrs['fecha_vencimiento']:
            raise serializers.ValidationError({'fechaDevolucionPrevista': 'La devolución no puede ser anterior al retiro.'})
        return attrs


class PrioritySerializer(serializers.Serializer):
    prioridad = serializers.IntegerField(min_value=0, max_value=32767)
