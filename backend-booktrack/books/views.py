import base64
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from loans.permissions import ReadOnlyOrLibrarian
from .models import Ejemplar, Libro
from .serializers import EjemplarSerializer, LibroSerializer, CopyCodeSerializer
from . import services
from loans.models import AccionAdministrativa
from loans.permissions import IsLibrarian

HISTORY_ERROR = 'No se puede eliminar este libro porque tiene reservas o préstamos registrados.'
COPY_HISTORY_ERROR = 'No se puede eliminar este ejemplar porque tiene préstamos registrados. Su historial debe conservarse.'


class BookViewSet(viewsets.ModelViewSet):
    queryset = Libro.objects.prefetch_related('ejemplares').annotate(
        disponibles=Count('ejemplares', filter=Q(ejemplares__estado='disponible'))).order_by('anio_cursada', 'titulo')
    serializer_class = LibroSerializer
    permission_classes = [ReadOnlyOrLibrarian]

    @action(detail=True, methods=['post'], url_path='ejemplares', permission_classes=[IsLibrarian])
    @transaction.atomic
    def add_copy(self, request, pk=None):
        book = Libro.objects.select_for_update().get(pk=self.get_object().pk)
        copy = services.add_copies(book, 1)[0]
        AccionAdministrativa.objects.create(bibliotecario=request.user, tipo_accion='alta_ejemplar',
            descripcion=f'Agregó el ejemplar {copy.pk}.', libro=book, ejemplar=copy)
        return Response(EjemplarSerializer(copy).data, status=status.HTTP_201_CREATED)

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
    queryset = Ejemplar.objects.select_related('libro').order_by('libro_id', 'id')
    serializer_class = EjemplarSerializer
    permission_classes = [ReadOnlyOrLibrarian]

    @action(detail=True, methods=['patch'], url_path='codigo', permission_classes=[IsLibrarian])
    @transaction.atomic
    def change_code(self, request, pk=None):
        data = CopyCodeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        original = self.get_object()
        previous = original.pk
        copy = services.rename_copy(original, data.validated_data['nuevoCodigo'])
        if previous != copy.pk:
            AccionAdministrativa.objects.create(bibliotecario=request.user, tipo_accion='codigo_ejemplar',
                descripcion=f'Cambió el código {previous} por {copy.pk}.', libro=copy.libro, ejemplar=copy)
        return Response(EjemplarSerializer(copy).data)

    def get_queryset(self):
        qs = super().get_queryset()
        isbn = self.request.query_params.get('isbn')
        return qs.filter(libro_id=isbn) if isbn else qs

    def perform_destroy(self, instance):
        try:
            with transaction.atomic():
                book = Libro.objects.select_for_update().get(pk=instance.libro_id)
                copy = Ejemplar.objects.select_for_update().get(pk=instance.pk)
                code = copy.pk
                copy.delete()
                AccionAdministrativa.objects.create(bibliotecario=self.request.user, tipo_accion='eliminacion_ejemplar',
                    descripcion=f'Eliminó el ejemplar {code}.', libro=book)
        except ProtectedError:
            raise ValidationError(COPY_HISTORY_ERROR)
