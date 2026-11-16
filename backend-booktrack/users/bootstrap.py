"""Inicializa el administrador principal sin restablecer cuentas existentes."""
import json
from pathlib import Path

from django.core import serializers
from django.db import transaction

from backups.snapshots import read_snapshot
from .models import ADMIN_PRINCIPAL_LEGAJO, Administrador, find_persona


@transaction.atomic
def ensure_primary_admin(*, password='', snapshot=None, backup_password=''):
    existing = Administrador.objects.filter(pk=ADMIN_PRINCIPAL_LEGAJO).first()
    if existing is not None:
        return existing
    if find_persona(ADMIN_PRINCIPAL_LEGAJO) is not None:
        raise RuntimeError('El legajo ADMIN-1 pertenece a otra cuenta. Revisá sus roles antes de crear el administrador.')

    if password:
        admin = Administrador(id=ADMIN_PRINCIPAL_LEGAJO, nombre='Administrador', email='admin@booktrack.com')
        admin.set_password(password)
    elif snapshot and backup_password and Path(snapshot).is_file():
        _, files = read_snapshot(snapshot, backup_password)
        record = next((item for item in json.loads(files['database.json'])
                       if item['model'] == 'users.administrador' and item['pk'] == ADMIN_PRINCIPAL_LEGAJO), None)
        if record is None:
            return None
        admin = next(serializers.deserialize('json', json.dumps([record]))).object
        if not admin.is_active:
            raise RuntimeError('La copia tiene el administrador principal inactivo. Revisá la copia antes de recuperarlo.')
    else:
        return None

    admin.full_clean()
    admin.save(force_insert=True)
    return admin
