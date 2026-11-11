from django.db import migrations, models


def copy_references(apps, schema_editor):
    Ejemplar = apps.get_model('books', 'Ejemplar')
    alias = schema_editor.connection.alias
    codes = dict(Ejemplar.objects.using(alias).values_list('pk', 'codigo'))
    old_ids = {str(key): key for key in codes}
    if any(code in old_ids and old_ids[code] != key for key, code in codes.items()):
        raise ValueError('Los códigos se solapan con otros identificadores de ejemplares.')
    for name in ('Prestamo', 'AccionAdministrativa'):
        model = apps.get_model('loans', name)
        for obj in model.objects.using(alias).exclude(ejemplar_id=None).iterator():
            model.objects.using(alias).filter(pk=obj.pk).update(ejemplar_temporal=codes[obj.ejemplar_id])


class Migration(migrations.Migration):
    dependencies = [('loans', '0008_delete_legacy_loans'), ('books', '0014_delete_favorito')]
    operations = [
        migrations.AddField('prestamo', 'ejemplar_temporal', models.CharField(max_length=50, null=True)),
        migrations.AddField('accionadministrativa', 'ejemplar_temporal', models.CharField(max_length=50, null=True)),
        migrations.RunPython(copy_references),
        migrations.RemoveField('prestamo', 'ejemplar'),
        migrations.RemoveField('accionadministrativa', 'ejemplar'),
    ]
