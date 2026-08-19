from rest_framework import serializers
from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    estudianteId = serializers.IntegerField(source='estudiante_id')
    libroId = serializers.IntegerField(source='libro_id')
    tipoPrestamo = serializers.CharField(source='tipo_prestamo')
    fechaInicio = serializers.DateField(source='fecha_inicio', read_only=True)
    fechaFin = serializers.DateField(source='fecha_fin', allow_null=True)
    plazoDeSolicitud = serializers.CharField(source='plazo_de_solicitud', allow_blank=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'estudianteId', 'libroId', 'tipoPrestamo',
            'fechaInicio', 'fechaFin', 'estado', 'plazoDeSolicitud',
        ]
        read_only_fields = ['fechaInicio', 'estado']
