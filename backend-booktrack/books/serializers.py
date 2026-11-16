from django.db import transaction
from rest_framework import serializers
from . import services
from .models import Ejemplar, Libro


class EjemplarSerializer(serializers.ModelSerializer):
    isbn = serializers.PrimaryKeyRelatedField(source='libro', queryset=Libro.objects.all())

    class Meta:
        model = Ejemplar
        fields = ['id', 'estado', 'observaciones', 'isbn']

    def create(self, validated_data):
        if validated_data.get('estado') == 'prestado':
            raise serializers.ValidationError({'estado': 'El ejemplar se presta al registrar un retiro.'})
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        # Mismo orden de bloqueo que retiros y devoluciones. La instancia recibida
        # puede haberse leído antes de que otra petición prestara el ejemplar.
        Libro.objects.select_for_update().get(pk=instance.libro_id)
        instance = Ejemplar.objects.select_for_update().get(pk=instance.pk)
        if 'id' in validated_data and validated_data['id'] != instance.pk:
            raise serializers.ValidationError({'id': 'Usá la operación de cambio de código del ejemplar.'})
        if 'estado' in validated_data:
            estado = validated_data['estado']
            if estado != instance.estado and (estado == 'prestado' or instance.estado == 'prestado'):
                raise serializers.ValidationError({'estado': 'Usá las operaciones de retiro y devolución para cambiar un ejemplar prestado.'})
            if estado != 'prestado' and instance.prestamos.filter(estado__in=['vigente', 'vencido']).exists():
                raise serializers.ValidationError({'estado': 'El ejemplar tiene un préstamo abierto. Registrá su devolución primero.'})
        return super().update(instance, validated_data)


class CopyCodeSerializer(serializers.Serializer):
    nuevoCodigo = serializers.RegexField(r'^[a-zA-Z0-9_-]+$', max_length=50,
        error_messages={'invalid': 'Usá letras, números, guiones o guiones bajos.'})


class LibroSerializer(serializers.ModelSerializer):
    """`id` repite el ISBN para que el front identifique libros igual que antes."""
    id = serializers.CharField(source='isbn', read_only=True)
    anioPublicacion = serializers.IntegerField(source='anio_publicacion', required=False, allow_null=True)
    palabrasClave = serializers.CharField(source='palabras_clave', required=False, allow_blank=True)
    anioCursada = serializers.IntegerField(source='anio_cursada', required=False, min_value=0)
    disponibles = serializers.IntegerField(required=False, min_value=0)
    ejemplares = EjemplarSerializer(many=True, read_only=True)

    class Meta:
        model = Libro
        fields = ['id', 'isbn', 'titulo', 'autor', 'categoria', 'anioPublicacion', 'resumen', 'palabrasClave',
                  'estado', 'imagen', 'anioCursada', 'disponibles', 'ejemplares']

    def to_representation(self, libro):
        data = super().to_representation(libro)
        # el viewset anota `disponibles`; al crear/editar se cuenta
        data['disponibles'] = getattr(libro, 'disponibles', None)
        if data['disponibles'] is None:
            data['disponibles'] = services.available_count(libro)
        return data

    @transaction.atomic
    def create(self, validated_data):
        stock = validated_data.pop('disponibles', 1)
        libro = Libro.objects.create(**validated_data)
        services.add_copies(libro, stock)
        return libro

    @transaction.atomic
    def update(self, libro, validated_data):
        validated_data.pop('isbn', None)  # el ISBN identifica al libro y no se cambia
        validated_data.pop('disponibles', None)  # el stock cambia administrando ejemplares
        libro = super().update(libro, validated_data)
        return libro
