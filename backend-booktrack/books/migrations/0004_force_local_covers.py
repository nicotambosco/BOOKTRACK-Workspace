from importlib import import_module

from django.db import migrations

BOOKS = import_module('books.migrations.0003_seed_example_catalog').BOOKS


def force_covers(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    for book in BOOKS:
        isbn = book[5]
        Book.objects.filter(nro_codigo=f'ISBN-{isbn}').update(imagen=f'assets/covers/{isbn}.jpg')


class Migration(migrations.Migration):
    dependencies = [('books', '0003_seed_example_catalog')]

    operations = [migrations.RunPython(force_covers, migrations.RunPython.noop)]
