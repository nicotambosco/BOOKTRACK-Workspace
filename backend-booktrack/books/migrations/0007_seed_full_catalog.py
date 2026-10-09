import json
from pathlib import Path

from django.db import migrations


FIXTURE = Path(__file__).resolve().parents[1] / 'seed_full_catalog.json'


def seed_full_catalog(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Category = apps.get_model('categories', 'Category')

    for item in json.loads(FIXTURE.read_text(encoding='utf-8')):
        if item['model'] == 'categories.category':
            Category.objects.get_or_create(nombre=item['fields']['nombre'])
        else:
            # ponytail: pk fijo = mismos ids en todas las bases; pisa libros propios con ese id
            Book.objects.update_or_create(pk=item['pk'], defaults=item['fields'])


class Migration(migrations.Migration):
    dependencies = [
        ('books', '0006_seed_panel_catalog'),
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_full_catalog, migrations.RunPython.noop),
    ]
