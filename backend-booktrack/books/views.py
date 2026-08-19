from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Book
from .serializers import BookSerializer


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('titulo')
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q')
        categoria = self.request.query_params.get('categoria')
        if query:
            qs = qs.filter(titulo__icontains=query)
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs
