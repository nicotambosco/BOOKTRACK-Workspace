from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('loans', '0010_restaurar_ejemplar')]
    operations = [
        migrations.RemoveField('prestamo', 'extension_pendiente'),
        migrations.RemoveField('prestamo', 'extension_estado'),
    ]
