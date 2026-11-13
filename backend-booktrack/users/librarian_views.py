"""Gestión de bibliotecarios: solo para el rol admin (contrato en docs/ADMIN_BIBLIOTECARIOS.md)."""
from django.db.models import Count, Q
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import IsAdmin
from .models import Bibliotecario, find_persona
from .serializers import split_name


def con_estadisticas():
    return Bibliotecario.objects.annotate(
        total=Count('prestamos', distinct=True),
        devueltos=Count('prestamos', filter=Q(prestamos__estado='devuelto'), distinct=True),
        abiertos=Count('prestamos', filter=Q(prestamos__estado__in=['vigente', 'vencido']), distinct=True),
    ).order_by('pk')


def representar(b):
    return {'id': b.pk, 'legajo': b.pk, 'nombreApellido': b.nombre_apellido, 'email': b.email, 'activo': b.is_active,
            'prestamosGestionados': b.total, 'devoluciones': b.devueltos, 'pendientes': b.abiertos}


class NuevoBibliotecarioSerializer(serializers.Serializer):
    legajo = serializers.CharField(max_length=50)
    nombreApellido = serializers.CharField(max_length=200)
    email = serializers.EmailField(required=False, allow_blank=True)
    contrasena = serializers.CharField(min_length=6)

    def validate_legajo(self, value):
        value = value.strip()
        if not value or find_persona(value):
            raise serializers.ValidationError('Ya existe una cuenta con ese legajo.' if value else 'Ingresá el legajo.')
        return value


class EdicionBibliotecarioSerializer(serializers.Serializer):
    nombreApellido = serializers.CharField(max_length=200, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    activo = serializers.BooleanField(required=False)


class LibrarianListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response([representar(b) for b in con_estadisticas()])

    def post(self, request):
        s = NuevoBibliotecarioSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        nombre, apellido = split_name(d['nombreApellido'])
        b = Bibliotecario(id=d['legajo'], nombre=nombre, apellido=apellido, email=d.get('email', ''))
        b.set_password(d['contrasena'])
        b.save()
        return Response(representar(con_estadisticas().get(pk=b.pk)), status=status.HTTP_201_CREATED)


class LibrarianDetailView(APIView):
    permission_classes = [IsAdmin]

    def _get(self, pk):
        b = con_estadisticas().filter(pk=pk).first()
        if b is None:
            raise NotFound()
        return b

    def patch(self, request, pk):
        b = self._get(pk)
        s = EdicionBibliotecarioSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        if 'nombreApellido' in d:
            b.nombre, b.apellido = split_name(d['nombreApellido'])
        if 'email' in d:
            b.email = d['email']
        if 'activo' in d:
            b.is_active = d['activo']
        b.save()
        return Response(representar(self._get(pk)))


class LibrarianActivityView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        b = Bibliotecario.objects.filter(pk=pk).first()
        if b is None:
            raise NotFound()
        return Response([{'descripcion': a.descripcion or a.tipo_accion, 'fecha': a.fecha} for a in b.acciones.all()[:10]])
