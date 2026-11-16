from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Administrador, Bibliotecario, Usuario, find_persona, sincronizar_persona


def token_persona(persona):
    refresh = RefreshToken.for_user(persona)
    refresh['categoria'] = persona.categoria
    refresh['roles'] = persona.roles
    return str(refresh.access_token)


def split_name(full_name):
    nombre, _, apellido = (full_name or '').strip().partition(' ')
    return nombre, apellido.strip()


class EmailUnicoMixin:
    def validate_email(self, value):
        value = value.strip().lower()
        if value:
            for model in (Usuario, Bibliotecario, Administrador):
                coincidencias = model.objects.filter(email__iexact=value)
                if self.instance is not None:
                    coincidencias = coincidencias.exclude(pk=self.instance.pk)
                if coincidencias.exists():
                    raise serializers.ValidationError('Ya existe otra cuenta con ese email.')
        return value


class UserSerializer(EmailUnicoMixin, serializers.Serializer):
    """Usuario o bibliotecario. `id` y `legajo` son la clave primaria: el legajo con el que inicia sesión."""
    id = serializers.CharField(read_only=True)
    legajo = serializers.CharField(source='pk', read_only=True)
    nombreApellido = serializers.CharField(source='nombre_apellido', required=False, allow_blank=True)
    nombre = serializers.CharField(required=False, allow_blank=True, max_length=100)
    apellido = serializers.CharField(required=False, allow_blank=True, max_length=100)
    email = serializers.EmailField(required=False, allow_blank=True)
    emailAlternativo = serializers.EmailField(source='email_alternativo', required=False, allow_blank=True)
    telefono = serializers.CharField(required=False, allow_blank=True, max_length=30)
    tipoUsuario = serializers.CharField(source='tipo_usuario', read_only=True)
    codigo = serializers.CharField(required=False, allow_blank=True, max_length=50)
    categoria = serializers.CharField(read_only=True)
    nivel = serializers.IntegerField(read_only=True)
    roles = serializers.ListField(child=serializers.CharField(), read_only=True)
    rolesFijos = serializers.ListField(source='roles_fijos', child=serializers.CharField(), read_only=True)
    imagen = serializers.CharField(required=False, allow_blank=True)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and getattr(request.user, 'categoria', None) == 'usuario':
            for name, field in fields.items():
                if name != 'email':
                    field.read_only = True
        return fields

    @transaction.atomic
    def update(self, person, validated_data):
        full_name = validated_data.pop('nombre_apellido', None)
        if full_name is not None:
            validated_data['nombre'], validated_data['apellido'] = split_name(full_name)
        for field, value in validated_data.items():
            if hasattr(person, field):  # el bibliotecario no tiene teléfono, email alternativo ni código
                setattr(person, field, value)
        person.save()
        sincronizar_persona(person)
        return person


class RegisterSerializer(EmailUnicoMixin, serializers.Serializer):
    legajo = serializers.CharField(max_length=50)
    nombreApellido = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    contrasena = serializers.CharField(write_only=True, min_length=6)
    codigo = serializers.CharField(required=False, allow_blank=True, max_length=50)
    tipoUsuario = serializers.ChoiceField(choices=Usuario.TIPO_CHOICES, required=False)

    def validate_legajo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Ingresá tu legajo.')
        if find_persona(value):
            raise serializers.ValidationError('Ya existe una cuenta con ese legajo.')
        return value

    @transaction.atomic
    def create(self, data):
        nombre, apellido = split_name(data['nombreApellido'])
        # El rol nunca viene del cliente: quien se registra es siempre un Usuario.
        user = Usuario(id=data['legajo'], nombre=nombre, apellido=apellido, email=data.get('email', ''),
                       codigo=data.get('codigo', ''), tipo_usuario=data.get('tipoUsuario', 'alumno'))
        user.set_password(data['contrasena'])
        user.save()
        return user

    def to_representation(self, user):
        return UserSerializer(user).data


class LoginSerializer(serializers.Serializer):
    legajoOEmail = serializers.CharField()
    contrasena = serializers.CharField(write_only=True)

    def validate(self, data):
        legajo_o_email = data['legajoOEmail'].strip()
        # Por legajo primero, luego por email. Bibliotecario es la vista inicial si tiene ese rol.
        existente = None
        for model in (Bibliotecario, Administrador, Usuario):
            existente = existente or model.objects.filter(pk=legajo_o_email, is_active=True).first()
        if existente is None:
            por_legajo = {}
            for model in (Bibliotecario, Administrador, Usuario):
                for persona in model.objects.filter(email__iexact=legajo_o_email, is_active=True):
                    por_legajo.setdefault(persona.pk, persona)
            if len(por_legajo) > 1:
                raise serializers.ValidationError({
                    'detail': 'El email está asociado a varias cuentas. Ingresá con tu legajo y actualizá tu email.',
                    'campos': ['legajoOEmail'],
                })
            existente = next(iter(por_legajo.values()), None)

        if not existente or not existente.check_password(data['contrasena']):
            raise serializers.ValidationError({
                'detail': 'Usuario no existente o contraseña incorrecta.',
                'campos': ['contrasena'] if existente else ['legajoOEmail', 'contrasena'],
            })

        data['token'] = token_persona(existente)
        data['user'] = existente
        return data
