import unicodedata

from django.db import migrations


def canonical(text):
    # 'básicas' / 'BASICAS' / 'Basicas' -> 'Basicas'
    return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode().strip().capitalize()


def normalize_categories(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Category = apps.get_model('categories', 'Category')

    seen = set()
    keep = []
    for cat in Category.objects.order_by('id'):
        name = canonical(cat.nombre)
        if name in seen:
            cat.delete()  # primero borrar repetidas: renombrar antes chocaría con el unique
        else:
            seen.add(name)
            keep.append((cat.pk, cat.nombre, name))
    for pk, old, name in keep:
        if old != name:
            Category.objects.filter(pk=pk).update(nombre=name)

    for book in Book.objects.all():
        name = canonical(book.categoria)
        if name not in seen:
            seen.add(name)
            Category.objects.create(nombre=name)
        if book.categoria != name:
            Book.objects.filter(pk=book.pk).update(categoria=name)


class Migration(migrations.Migration):
    dependencies = [
        ('books', '0007_seed_full_catalog'),
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(normalize_categories, migrations.RunPython.noop),
    ]
