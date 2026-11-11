from django.db.models.deletion import ProtectedError
from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import IsLibrarian
from .models import Bibliotecario, Usuario, find_persona
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token = serializer.validated_data['token']
        return Response({'token': token, 'user': UserSerializer(user).data})


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Todas las personas con cuenta: bibliotecarios primero, luego usuarios."""
    serializer_class = UserSerializer
    permission_classes = [IsLibrarian]

    def get_queryset(self):
        return [*Bibliotecario.objects.order_by('pk'), *Usuario.objects.order_by('pk')]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        legajo = self.kwargs['pk']
        if self.request.user.categoria != 'bibliotecario' and legajo != self.request.user.pk:
            raise NotFound()  # nadie ve ni edita la cuenta de otro, salvo un bibliotecario
        person = find_persona(legajo)
        if person is None:
            raise NotFound()
        return person

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError('El registro tiene historial de reservas o préstamos y no se puede eliminar.')
