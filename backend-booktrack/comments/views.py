from rest_framework import generics, permissions
from .models import Comment
from .serializers import CommentSerializer


class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(usuario=user if user.is_authenticated and user.categoria == 'usuario' else None)
