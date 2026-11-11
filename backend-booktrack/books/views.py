import base64
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import ReadOnlyOrLibrarian
from .models import Ejemplar, Favorito, Libro
from .serializers import EjemplarSerializer, LibroSerializer

HISTORY_ERROR = 'El registro tiene historial de reservas o préstamos y no se puede eliminar.'


class BookViewSet(viewsets.ModelViewSet):
    queryset = Libro.objects.prefetch_related('ejemplares').annotate(
        disponibles=Count('ejemplares', filter=Q(ejemplares__estado='disponible'))).order_by('anio_cursada', 'titulo')
    serializer_class = LibroSerializer
    permission_classes = [ReadOnlyOrLibrarian]

    @action(detail=False, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request):
        image = request.FILES.get('file')
        allowed_types = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
        if not image or image.content_type not in allowed_types or image.size > 1024 * 1024:
            return Response({'detail': 'Elegí una imagen JPG, PNG o WebP de hasta 1 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        # ponytail: la portada se guarda en la base (data URI), sin carpeta media; si pesa, redimensionar o mover a storage externo
        data = base64.b64encode(image.read()).decode()
        return Response({'url': f'data:{image.content_type};base64,{data}'}, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        try:
            with transaction.atomic():
                instance.ejemplares.all().delete()  # PROTECT si algún ejemplar tuvo préstamos
                instance.delete()
        except ProtectedError:
            raise ValidationError(HISTORY_ERROR)

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        categoria = self.request.query_params.get('categoria')
        if query:
            qs = qs.filter(titulo__icontains=query)
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs


class EjemplarViewSet(viewsets.ModelViewSet):
    queryset = Ejemplar.objects.select_related('libro').order_by('libro_id', 'codigo')
    serializer_class = EjemplarSerializer
    permission_classes = [ReadOnlyOrLibrarian]

    def get_queryset(self):
        qs = super().get_queryset()
        isbn = self.request.query_params.get('isbn')
        return qs.filter(libro_id=isbn) if isbn else qs

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(HISTORY_ERROR)


def _usuario(request):
    if request.user.categoria != 'usuario':
        raise PermissionDenied('Los favoritos son para usuarios, no para bibliotecarios.')
    return request.user


class FavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        libros = Libro.objects.filter(favoritos__usuario=_usuario(request)).prefetch_related('ejemplares').order_by('titulo')
        return Response(LibroSerializer(libros, many=True).data)

    def post(self, request, isbn=None):
        libro = Libro.objects.filter(pk=request.data.get('isbn')).first()
        if libro is None:
            raise ValidationError({'isbn': 'El libro no existe.'})
        Favorito.objects.get_or_create(usuario=_usuario(request), libro=libro)
        return Response(LibroSerializer(libro).data, status=status.HTTP_201_CREATED)

    def delete(self, request, isbn=None):
        Favorito.objects.filter(usuario=_usuario(request), libro_id=isbn).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
