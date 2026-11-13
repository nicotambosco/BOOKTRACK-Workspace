"""El admin asigna roles (nivel 0 usuario, 1 bibliotecario, 2 admin). Ver docs/ADMIN_BIBLIOTECARIOS.md."""
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import IsAdmin
from .models import Administrador, Bibliotecario, MODELO_POR_NIVEL, Usuario, cambiar_nivel, find_persona


def representar(p):
    return {'id': p.pk, 'legajo': p.pk, 'nombreApellido': p.nombre_apellido, 'email': p.email, 'nivel': p.nivel, 'categoria': p.categoria}


class PeopleView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response([representar(p) for m in (Administrador, Bibliotecario, Usuario) for p in m.objects.filter(is_active=True).order_by('pk')])


class NivelSerializer(serializers.Serializer):
    nivel = serializers.ChoiceField(choices=sorted(MODELO_POR_NIVEL))


class PersonRoleView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        s = NivelSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if pk == request.user.pk:
            raise ValidationError('No podés cambiar tu propio rol.')
        persona = find_persona(pk, solo_activas=True)
        if persona is None:
            raise NotFound()
        return Response(representar(cambiar_nivel(persona, s.validated_data['nivel'])))
