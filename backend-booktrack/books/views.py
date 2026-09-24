from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from uuid import uuid4
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
        if not image or image.content_type not in allowed_types or image.size > 5 * 1024 * 1024:
            return Response({'detail': 'Elegí una imagen JPG, PNG o WebP de hasta 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        path = default_storage.save(f'book_covers/{uuid4().hex}{allowed_types[image.content_type]}', image)
        return Response({'url': request.build_absolute_uri(default_storage.url(path))}, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        categoria = self.request.query_params.get('categoria')
        if query:
            qs = qs.filter(titulo__icontains=query)
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs
