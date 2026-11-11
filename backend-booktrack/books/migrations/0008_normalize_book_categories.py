import unicodedata

from django.db import migrations


def canonical(text):
    # 'básicas' / 'BASICAS' / 'Basicas' -> 'Basicas'
    return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode().strip().capitalize()


def normalize_categories(apps, schema_editor):
    Book = apps.get_model('books', 'Book')

    for book in Book.objects.all():
        name = canonical(book.categoria)
        if book.categoria != name:
            Book.objects.filter(pk=book.pk).update(categoria=name)


class Migration(migrations.Migration):
    dependencies = [
        ('books', '0007_seed_full_catalog'),
    ]

    operations = [
        migrations.RunPython(normalize_categories, migrations.RunPython.noop),
    ]
