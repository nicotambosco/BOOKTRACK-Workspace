from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserSerializer(serializers.ModelSerializer):
    nombreApellido = serializers.CharField(source='nombre_apellido')

    class Meta:
        model = User
        fields = ['id', 'nombreApellido', 'email', 'legajo', 'codigo', 'categoria', 'imagen']


class RegisterSerializer(serializers.ModelSerializer):
    nombreApellido = serializers.CharField(source='nombre_apellido')
    contrasena = serializers.CharField(source='password', write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['nombreApellido', 'email', 'legajo', 'contrasena', 'codigo', 'categoria']

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Por defecto, nuevos usuarios son "usuario"
        validated_data.setdefault('categoria', 'usuario')
        user = User(**validated_data)
        user.username = validated_data.get('legajo') or validated_data.get('email')
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    legajoOEmail = serializers.CharField()
    contrasena = serializers.CharField(write_only=True)

    def validate(self, data):
        legajo_o_email = data['legajoOEmail']
        password = data['contrasena']

        # intenta por username (legajo) primero, luego por email
        user = authenticate(username=legajo_o_email, password=password)
        if not user:
            try:
                u = User.objects.get(email=legajo_o_email)
                user = authenticate(username=u.username, password=password)
            except User.DoesNotExist:
                pass

        if not user:
            raise serializers.ValidationError('Credenciales incorrectas.')

        refresh = RefreshToken.for_user(user)
        data['token'] = str(refresh.access_token)
        data['user'] = user
        return data
