#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booktrack.settings')
django.setup()

from users.models import User

# Crear superusuario
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@booktrack.local', 'admin123456')
    print("✓ Superusuario 'admin' creado exitosamente")
    print("  Usuario: admin")
    print("  Contraseña: admin123456")
else:
    print("⚠ El usuario 'admin' ya existe")
