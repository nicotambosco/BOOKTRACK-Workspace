import json
from pathlib import Path

from django.db import migrations


FIXTURE = Path(__file__).resolve().parents[1] / 'seed_full_catalog.json'


def seed_full_catalog(apps, schema_editor):
    Book = apps.get_model('books', 'Book')

    for item in json.loads(FIXTURE.read_text(encoding='utf-8')):
        Book.objects.update_or_create(pk=item['pk'], defaults=item['fields'])


class Migration(migrations.Migration):
    dependencies = [
        ('books', '0006_seed_panel_catalog'),
    ]

    operations = [
        migrations.RunPython(seed_full_catalog, migrations.RunPython.noop),
    ]
