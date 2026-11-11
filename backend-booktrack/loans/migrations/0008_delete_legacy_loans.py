from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [('loans', '0007_prestamo_reserva_notificacion_accion')]

    operations = [
        migrations.DeleteModel(name='Reservation'),
        migrations.DeleteModel(name='Loan'),
    ]
