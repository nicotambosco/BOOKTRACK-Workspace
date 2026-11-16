from django.core.exceptions import ValidationError as ModelValidationError
from django.db.models.deletion import ProtectedError
from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import IsLibrarian
from .models import Bibliotecario, Usuario, MODELO_POR_CATEGORIA, find_persona
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer, token_persona
from .role_permissions import es_admin_fijo, rango_maximo


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


class ActiveRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rol = request.data.get('rol')
        if not isinstance(rol, str) or rol not in request.user.roles:
            raise ValidationError('La cuenta no tiene ese rol activo.')
        persona = MODELO_POR_CATEGORIA[rol].objects.get(pk=request.user.pk, is_active=True)
        return Response({'token': token_persona(persona), 'user': UserSerializer(persona).data})


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
        personas = [*Bibliotecario.objects.filter(is_active=True).order_by('pk'), *Usuario.objects.filter(is_active=True).order_by('pk')]
        unicas = {}
        for persona in personas:
            unicas.setdefault(persona.pk, persona)
        return list(unicas.values())


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        legajo = self.kwargs['pk']
        if legajo == self.request.user.pk:
            return self.request.user
        if self.request.user.categoria != 'bibliotecario' and legajo != self.request.user.pk:
            raise NotFound()  # nadie ve ni edita la cuenta de otro, salvo un bibliotecario
        person = find_persona(legajo)
        if person is None:
            raise NotFound()
        return person

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError('No podés eliminar tu propia cuenta.')
        if not es_admin_fijo(self.request.user) and instance.nivel >= rango_maximo(self.request.user):
            raise PermissionDenied('No podés eliminar cuentas de rango igual o superior.')
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError('El registro tiene historial de reservas o préstamos y no se puede eliminar.')
        except ModelValidationError as exc:
            raise ValidationError(exc.messages) from exc
