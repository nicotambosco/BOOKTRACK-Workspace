from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('loans', '0012_remove_prioridad')]
    operations = [migrations.RemoveField(model_name='reserva', name='codigo_reserva')]
