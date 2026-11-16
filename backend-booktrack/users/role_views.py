"""Asignación de varios roles a una misma identidad, conservando su historial."""
from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from loans.permissions import IsAdmin
from .models import (Administrador, Bibliotecario, CATEGORIA_POR_NIVEL, MODELO_POR_CATEGORIA,
                     MODELO_POR_NIVEL, Usuario, asignar_roles, find_persona)
from .serializers import token_persona
from .role_permissions import validar_cambio_roles


def representar(p):
    return {'id': p.pk, 'legajo': p.pk, 'nombreApellido': p.nombre_apellido, 'email': p.email,
            'nivel': p.nivel, 'categoria': p.categoria, 'roles': p.roles, 'rolesFijos': p.roles_fijos}


class PeopleView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        personas = {}
        for modelo in (Administrador, Bibliotecario, Usuario):
            for persona in modelo.objects.filter(is_active=True).order_by('pk'):
                personas.setdefault(persona.pk, persona)
        return Response([representar(p) for p in personas.values()])


class RolesSerializer(serializers.Serializer):
    roles = serializers.ListField(child=serializers.ChoiceField(choices=list(MODELO_POR_CATEGORIA)),
                                  allow_empty=False, required=False)
    # Se conserva el contrato anterior para clientes que todavía envían un solo nivel.
    nivel = serializers.ChoiceField(choices=sorted(MODELO_POR_NIVEL), required=False)

    def validate(self, data):
        if ('roles' in data) == ('nivel' in data):
            raise serializers.ValidationError('Enviá una lista de roles.')
        if 'nivel' in data:
            data['roles'] = [CATEGORIA_POR_NIVEL[data['nivel']]]
        if len(data['roles']) != len(set(data['roles'])):
            raise serializers.ValidationError('Los roles no pueden estar repetidos.')
        return data


class PersonRoleView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        serializer = RolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        roles = serializer.validated_data['roles']
        persona = find_persona(pk, solo_activas=True)
        if persona is None:
            raise NotFound()
        validar_cambio_roles(request.user, persona, roles)
        try:
            actualizada = asignar_roles(persona, roles)
        except ModelValidationError as exc:
            raise ValidationError(exc.messages) from exc
        resultado = representar(actualizada)
        if actualizada.pk == request.user.pk:
            activa = MODELO_POR_CATEGORIA[request.user.categoria].objects.filter(pk=actualizada.pk, is_active=True).first() or actualizada
            resultado = representar(activa)
            resultado['token'] = token_persona(activa)
        return Response(resultado)
