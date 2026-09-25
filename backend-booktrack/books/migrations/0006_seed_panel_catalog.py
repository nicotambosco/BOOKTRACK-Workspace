import base64
import json
from pathlib import Path

from django.db import migrations


BOOKS_DIR = Path(__file__).resolve().parents[1]


def records():
    return json.loads((BOOKS_DIR / 'seed_panel_catalog.json').read_text(encoding='utf-8'))


def seed_panel_catalog(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Category = apps.get_model('categories', 'Category')

    for record in records():
        cover = record.pop('cover')
        image = base64.b64encode((BOOKS_DIR / 'seed_covers' / cover).read_bytes()).decode()
        Category.objects.get_or_create(nombre=record['categoria'])
        Book.objects.update_or_create(
            nro_codigo=record.pop('nro_codigo'),
            defaults={**record, 'imagen': f'data:image/jpeg;base64,{image}'},
        )


def remove_panel_catalog(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Book.objects.filter(nro_codigo__in=[record['nro_codigo'] for record in records()]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('books', '0005_book_imagen_text'),
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_panel_catalog, remove_panel_catalog),
    ]
