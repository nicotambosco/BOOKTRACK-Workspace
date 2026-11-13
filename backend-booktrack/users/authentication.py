from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from .models import MODELO_POR_CATEGORIA, Usuario


class PersonaJWTAuthentication(JWTAuthentication):
    """El token lleva el legajo (`user_id`) y el rol (`categoria`): con el rol se sabe en qué tabla buscar."""

    def get_user(self, validated_token):
        model = MODELO_POR_CATEGORIA.get(validated_token.get('categoria'), Usuario)
        try:
            user = model.objects.get(pk=validated_token[api_settings.USER_ID_CLAIM])
        except (KeyError, model.DoesNotExist):
            raise AuthenticationFailed('Usuario no encontrado.', code='user_not_found')
        if not user.is_active:
            raise AuthenticationFailed('Usuario inactivo.', code='user_inactive')
        return user
