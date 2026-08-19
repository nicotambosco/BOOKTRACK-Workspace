#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from django.contrib.auth.models import Permission

# Mapeo de permisos a español
PERMISSION_TRANSLATIONS = {
    'add_logentry': 'Puede agregar entrada de registro',
    'change_logentry': 'Puede cambiar entrada de registro',
    'delete_logentry': 'Puede eliminar entrada de registro',
    'view_logentry': 'Puede ver entrada de registro',

    'add_group': 'Puede agregar grupo',
    'change_group': 'Puede cambiar grupo',
    'delete_group': 'Puede eliminar grupo',
    'view_group': 'Puede ver grupo',

    'add_permission': 'Puede agregar permiso',
    'change_permission': 'Puede cambiar permiso',
    'delete_permission': 'Puede eliminar permiso',
    'view_permission': 'Puede ver permiso',

    'add_user': 'Puede agregar usuario',
    'change_user': 'Puede cambiar usuario',
    'delete_user': 'Puede eliminar usuario',
    'view_user': 'Puede ver usuario',

    'add_book': 'Puede agregar libro',
    'change_book': 'Puede cambiar libro',
    'delete_book': 'Puede eliminar libro',
    'view_book': 'Puede ver libro',

    'add_category': 'Puede agregar categoría',
    'change_category': 'Puede cambiar categoría',
    'delete_category': 'Puede eliminar categoría',
    'view_category': 'Puede ver categoría',

    'add_comment': 'Puede agregar comentario',
    'change_comment': 'Puede cambiar comentario',
    'delete_comment': 'Puede eliminar comentario',
    'view_comment': 'Puede ver comentario',

    'add_loan': 'Puede agregar préstamo',
    'change_loan': 'Puede cambiar préstamo',
    'delete_loan': 'Puede eliminar préstamo',
    'view_loan': 'Puede ver préstamo',
}

# Actualizar permisos
updated = 0
for permission in Permission.objects.all():
    codename = permission.codename
    if codename in PERMISSION_TRANSLATIONS:
        permission.name = PERMISSION_TRANSLATIONS[codename]
        permission.save()
        updated += 1
        print(f"[OK] {permission.content_type.app_label}.{codename}: {permission.name}")

print(f"\n[OK] {updated} permisos actualizados a español")
