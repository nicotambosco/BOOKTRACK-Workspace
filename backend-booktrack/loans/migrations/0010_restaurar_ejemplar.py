from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('loans', '0009_preparar_codigo_ejemplar'), ('books', '0015_ejemplar_codigo_como_id')]
    operations = [
        migrations.RenameField('prestamo', 'ejemplar_temporal', 'ejemplar'),
        migrations.RenameField('accionadministrativa', 'ejemplar_temporal', 'ejemplar'),
        migrations.AlterField('prestamo', 'ejemplar', models.ForeignKey(to='books.ejemplar', on_delete=django.db.models.deletion.PROTECT, related_name='prestamos', db_column='idEjemplar')),
        migrations.AlterField('accionadministrativa', 'ejemplar', models.ForeignKey(to='books.ejemplar', on_delete=django.db.models.deletion.SET_NULL, null=True, blank=True, related_name='acciones', db_column='idEjemplar')),
    ]
