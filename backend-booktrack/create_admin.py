#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from users.models import User


def create_user(username, password, **defaults):
    user, created = User.objects.get_or_create(username=username, defaults=defaults)
    if created:
        user.set_password(password)
        user.save()
        print(f"Usuario {username} creado")


create_user(
    '12473',
    os.environ.get('ADMIN_PASSWORD', 'Campana1'),
    legajo='12473',
    email='tambosconicolas123@gmail.com',
    nombre_apellido='Administrador',
    categoria='bibliotecario',
    is_staff=True,
    is_superuser=True,
)
create_user(
    '13885',
    os.environ.get('STUDENT_PASSWORD', 'utnfrd'),
    legajo='13885',
    email='alumno@booktrack.local',
    nombre_apellido='Alumno',
    categoria='usuario',
)
