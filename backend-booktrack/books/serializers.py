from rest_framework import serializers
from .models import Book


class BookSerializer(serializers.ModelSerializer):
    fechaPublicacion = serializers.CharField(source='fecha_publicacion', allow_blank=True)
    nroCodigo = serializers.CharField(source='nro_codigo', allow_blank=True)
    nroInventario = serializers.CharField(source='nro_inventario', allow_blank=True, allow_null=True)

    class Meta:
        model = Book
        fields = [
            'id', 'titulo', 'autor', 'editorial', 'fechaPublicacion',
            'descripcion', 'imagen', 'nroCodigo', 'nroInventario',
            'categoria', 'disponibles', 'tipo',
        ]
