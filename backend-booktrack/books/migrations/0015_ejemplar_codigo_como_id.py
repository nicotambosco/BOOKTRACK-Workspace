from django.db import migrations, models


def copy_keys(apps, schema_editor):
    Ejemplar = apps.get_model('books', 'Ejemplar')
    alias = schema_editor.connection.alias
    for obj in Ejemplar.objects.using(alias).all().iterator():
        Ejemplar.objects.using(alias).filter(pk=obj.pk).update(id=obj.codigo)


class Migration(migrations.Migration):
    dependencies = [('books', '0014_delete_favorito'), ('loans', '0009_preparar_codigo_ejemplar')]
    operations = [
        migrations.AlterField('ejemplar', 'id', models.CharField(primary_key=True, serialize=False, max_length=50, db_column='idEjemplar')),
        migrations.RunPython(copy_keys),
        migrations.RemoveField('ejemplar', 'codigo'),
        migrations.RemoveField('ejemplar', 'ubicacion'),
        migrations.RemoveField('ejemplar', 'fecha_alta'),
    ]
