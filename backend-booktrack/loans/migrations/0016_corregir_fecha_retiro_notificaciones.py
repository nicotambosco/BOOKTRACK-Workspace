from django.db import migrations
from django.db.models import F, Value
from django.db.models.functions import Replace


def actualizar_mensajes(apps, schema_editor):
    Notificacion = apps.get_model('loans', 'Notificacion')
    Notificacion.objects.using(schema_editor.connection.alias).filter(
        tipo='reserva_creada', mensaje__contains='Retiralo hasta el '
    ).update(mensaje=Replace(F('mensaje'), Value('Retiralo hasta el '), Value('Retiralo el ')))


class Migration(migrations.Migration):
    dependencies = [('loans', '0015_reserva_fecha_retiro')]
    operations = [migrations.RunPython(actualizar_mensajes, migrations.RunPython.noop)]
