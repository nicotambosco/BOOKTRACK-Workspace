from rest_framework import serializers
from .models import Book


class BookSerializer(serializers.ModelSerializer):
    fechaPublicacion = serializers.CharField(source='fecha_publicacion', allow_blank=True)
    nroCodigo = serializers.CharField(source='nro_codigo', allow_blank=True)
    nroInventario = serializers.CharField(source='nro_inventario', allow_blank=True, allow_null=True)

    def validate_nroInventario(self, value):
        value = value or None  # '' rompería el unique; NULL puede repetirse
        if value:
            others = Book.objects.filter(nro_inventario=value)
            if self.instance:
                others = others.exclude(pk=self.instance.pk)
            if others.exists():
                raise serializers.ValidationError('Ya existe un libro con ese número de inventario.')
        return value

    class Meta:
        model = Book
        fields = [
            'id', 'titulo', 'autor', 'editorial', 'fechaPublicacion',
            'descripcion', 'imagen', 'nroCodigo', 'nroInventario',
            'categoria', 'anio', 'disponibles', 'tipo', 'estado',
        ]
