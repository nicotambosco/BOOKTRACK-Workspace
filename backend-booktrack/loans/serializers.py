from rest_framework import serializers
from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    estudianteId = serializers.IntegerField(source='estudiante_id', read_only=True)
    estudianteLegajo = serializers.CharField(source='estudiante.legajo', read_only=True)
    estudianteNombre = serializers.CharField(source='estudiante.nombre_apellido', read_only=True)
    libroId = serializers.IntegerField(source='libro_id')
    libroTitulo = serializers.CharField(source='libro.titulo', read_only=True)
    tipoPrestamo = serializers.CharField(source='tipo_prestamo')
    fechaInicio = serializers.DateField(source='fecha_inicio')
    fechaFin = serializers.DateField(source='fecha_fin', allow_null=True)
    plazoDeSolicitud = serializers.CharField(source='plazo_de_solicitud', allow_blank=True)
    extensionPendiente = serializers.BooleanField(source='extension_pendiente', read_only=True)
    extensionEstado = serializers.CharField(source='extension_estado', read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'estudianteId', 'estudianteLegajo', 'estudianteNombre', 'libroId', 'libroTitulo',
            'tipoPrestamo', 'fechaInicio', 'fechaFin', 'estado', 'plazoDeSolicitud',
            'extensionPendiente', 'extensionEstado',
        ]
        read_only_fields = ['estado']
