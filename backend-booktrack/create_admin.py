#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from users.models import User
from decouple import config


def create_user(username, password, **defaults):
    if not password and not User.objects.filter(username=username).exists():
        raise RuntimeError('Configurá ADMIN_PASSWORD y STUDENT_PASSWORD para crear las cuentas de demostración.')
    user, created = User.objects.get_or_create(username=username, defaults=defaults)
    if created:
        user.set_password(password)
        user.save()
        print(f"Usuario {username} creado")


create_user(
    '12473',
    config('ADMIN_PASSWORD', default=''),
    legajo='12473',
    email='admin@booktrack.local',
    nombre_apellido='Administrador',
    categoria='bibliotecario',
    is_staff=True,
    is_superuser=True,
)
create_user(
    '13885',
    config('STUDENT_PASSWORD', default=''),
    legajo='13885',
    email='alumno@booktrack.local',
    nombre_apellido='Alumno',
    categoria='usuario',
)
