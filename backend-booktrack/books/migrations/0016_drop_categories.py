from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('books', '0015_ejemplar_codigo_como_id')]
    operations = [migrations.RunSQL('DROP TABLE IF EXISTS categories')]
