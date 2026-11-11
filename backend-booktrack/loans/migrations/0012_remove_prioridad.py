from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('loans', '0011_remove_extension')]
    operations = [
        migrations.AlterModelOptions(name='reserva', options={'ordering': ['fecha_reserva', 'id']}),
        migrations.RemoveIndex(model_name='reserva', name='reserva_queue_idx'),
        migrations.RemoveField(model_name='reserva', name='prioridad'),
        migrations.AddIndex(model_name='reserva', index=models.Index(fields=['libro', 'estado', 'fecha_reserva', 'id'], name='reserva_queue_idx')),
    ]
