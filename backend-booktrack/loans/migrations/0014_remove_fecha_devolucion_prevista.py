from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('loans', '0013_remove_codigo_reserva')]
    operations = [migrations.RemoveField(model_name='reserva', name='fecha_devolucion_prevista')]
