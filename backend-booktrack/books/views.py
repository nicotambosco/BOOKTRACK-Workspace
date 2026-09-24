from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
import base64
from .models import Book
from .serializers import BookSerializer


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('anio', 'titulo')
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request):
        image = request.FILES.get('file')
        allowed_types = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
        if not image or image.content_type not in allowed_types or image.size > 1024 * 1024:
            return Response({'detail': 'Elegí una imagen JPG, PNG o WebP de hasta 1 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        # ponytail: la portada se guarda en la base (data URI), sin carpeta media; si pesa, redimensionar o mover a storage externo
        data = base64.b64encode(image.read()).decode()
        return Response({'url': f'data:{image.content_type};base64,{data}'}, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        categoria = self.request.query_params.get('categoria')
        if query:
            qs = qs.filter(titulo__icontains=query)
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs
