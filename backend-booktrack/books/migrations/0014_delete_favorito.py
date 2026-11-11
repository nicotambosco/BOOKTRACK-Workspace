from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('books', '0013_favorito_por_legajo')]

    operations = [migrations.DeleteModel(name='Favorito')]
