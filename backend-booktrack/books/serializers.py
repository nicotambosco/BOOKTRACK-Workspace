from django.db import transaction
from rest_framework import serializers
from . import services
from .models import Ejemplar, Libro


class EjemplarSerializer(serializers.ModelSerializer):
    isbn = serializers.PrimaryKeyRelatedField(source='libro', queryset=Libro.objects.all())

    class Meta:
        model = Ejemplar
        fields = ['id', 'estado', 'observaciones', 'isbn']


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
        stock = validated_data.pop('disponibles', None)
        libro = super().update(libro, validated_data)
        if stock is not None:
            services.set_available(libro, stock)
        return libro
