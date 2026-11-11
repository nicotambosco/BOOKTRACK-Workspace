from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0010_libro_ejemplar_favorito'),
        ('loans', '0008_delete_legacy_loans'),
    ]

    operations = [migrations.DeleteModel(name='Book')]
