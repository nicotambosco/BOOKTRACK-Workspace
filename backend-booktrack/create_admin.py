#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from users.models import Administrador, Bibliotecario, Usuario, find_persona
from decouple import config


def create_person(model, legajo, password, **fields):
    """Crea la cuenta (el legajo es la clave) solo si todavía no existe; no restablece las existentes."""
    if find_persona(legajo):
        return
    if not password:
        raise RuntimeError('Configurá ADMIN_PASSWORD y STUDENT_PASSWORD para crear las cuentas de demostración.')
    person = model(id=legajo, **fields)
    person.set_password(password)
    person.save()
    print(f"Usuario {legajo} creado")


create_person(Bibliotecario, '12473', config('ADMIN_PASSWORD', default=''),
              nombre='Administrador', email='admin@booktrack.local')
if config('SUPERADMIN_PASSWORD', default=''):  # opcional: sin la variable no se crea el admin
    create_person(Administrador, 'ADMIN-1', config('SUPERADMIN_PASSWORD'),
                  nombre='Admin', email='superadmin@booktrack.local')
create_person(Usuario, '13885', config('STUDENT_PASSWORD', default=''),
              nombre='Alumno', email='alumno@booktrack.local')
