from django.db import migrations, models
from django.db.models import F


def copy_pickup_date(apps, schema_editor):
    Reserva = apps.get_model('loans', 'Reserva')
    Reserva.objects.using(schema_editor.connection.alias).update(fecha_retiro=F('fecha_vencimiento'))


class Migration(migrations.Migration):
    dependencies = [('loans', '0014_remove_fecha_devolucion_prevista')]
    operations = [
        migrations.AddField('reserva', 'fecha_retiro', models.DateField(db_column='fechaRetiro', null=True)),
        migrations.RunPython(copy_pickup_date, migrations.RunPython.noop),
        migrations.AlterField('reserva', 'fecha_retiro', models.DateField(db_column='fechaRetiro')),
    ]
