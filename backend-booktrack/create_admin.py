#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from django.conf import settings
from users.models import Bibliotecario, Usuario, find_persona
from users.bootstrap import ensure_primary_admin
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


def main():
    admin = ensure_primary_admin(
        password=config('SUPERADMIN_PASSWORD', default=''),
        snapshot=config('BOOKTRACK_DATA_SNAPSHOT', default=str(settings.BASE_DIR.parent/'data/booktrack.btbak')),
        backup_password=config('BOOKTRACK_BACKUP_PASSWORD', default=''),
    )
    if admin is None:
        print('ADMIN-1 no está configurado: definí SUPERADMIN_PASSWORD o la clave de una copia que incluya esa cuenta.')
    create_person(Bibliotecario, '12473', config('ADMIN_PASSWORD', default=''),
                  nombre='Administrador', email='admin@booktrack.local')
    create_person(Usuario, '13885', config('STUDENT_PASSWORD', default=''),
                  nombre='Alumno', email='alumno@booktrack.local')


if __name__ == '__main__':
    main()
