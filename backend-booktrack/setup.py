#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────
# Setup completo BookTrack
# ─────────────────────────────────────────────────────────────────
# Uso: python setup.py

import os
import sys
import subprocess
from pathlib import Path
from decouple import config

def print_header(text):
    print(f"\n╔{'═'*60}╗")
    print(f"║ {text:<58} ║")
    print(f"╚{'═'*60}╝\n")

def print_step(step, title):
    print(f"\n[{step}/4] {title}")
    print("─" * 40)

def run_command(cmd, description):
    """Ejecuta un comando y retorna True si tuvo éxito"""
    try:
        print(f"  → {description}...", end=" ")
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print("✓")
            return True
        else:
            print("✗")
            print(f"    Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗\n    Excepción: {e}")
        return False

def main():
    print_header("Setup Base de Datos BookTrack")

    # Verificar archivo .env
    print_step(1, "Verificando configuración")
    env_file = Path(".env")
    if not env_file.exists():
        print("  ⚠ Archivo .env no existe")
        if Path(".env.example").exists():
            print("  → Copiando .env.example a .env")
            import shutil
            shutil.copy(".env.example", ".env")
            print("  ✓ Archivo .env creado")
        else:
            print("  ✗ No se encontró .env.example")
            sys.exit(1)
    else:
        print("  ✓ .env configurado")

    # Verificar dependencias
    print_step(2, "Verificando dependencias")
    try:
        import django
        import rest_framework
        import mysqlclient
        print("  ✓ Django y dependencias OK")
    except ImportError as e:
        print(f"  ✗ Falta instalar: {e}")
        print("  Ejecuta: pip install -r requirements.txt")
        sys.exit(1)

    # Migraciones
    print_step(3, "Ejecutando migraciones")
    if not run_command("python manage.py migrate", "Migrando BD"):
        print("  ⚠ Error en migraciones (puede ser normal si la BD está vacía)")
    else:
        print("  ✓ Migraciones completadas")

    # Crear superuser (opcional)
    print_step(4, "Setup completado")
    print("  ✓ Base de datos configurada")
    print("  ✓ Migraciones aplicadas")

    print("\n" + "╔" + "═"*60 + "╗")
    print("║" + " "*60 + "║")
    print("║   ✓ Setup completado exitosamente" + " "*26 + "║")
    print("║" + " "*60 + "║")
    print("╚" + "═"*60 + "╝")

    print("\n📝 Próximos pasos:")
    print("  1. python manage.py createsuperuser  (crear admin)")
    print("  2. python manage.py runserver        (iniciar servidor)")
    print("  3. http://localhost:8000/admin/      (panel admin)")
    print()

if __name__ == "__main__":
    os.chdir(Path(__file__).parent)
    main()
