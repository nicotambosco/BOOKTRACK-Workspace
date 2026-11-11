from django.db import migrations
from django.db.migrations.exceptions import IrreversibleError


def refuse_rollback(apps, schema_editor):
    raise IrreversibleError('Volver a una tabla de cuentas requiere restaurar un respaldo.')


class Migration(migrations.Migration):
    """Ya nada apunta a la tabla de cuentas: se quita el vínculo y se borra `users`."""

    dependencies = [
        ('users', '0004_legajo_como_clave'),
        ('books', '0013_favorito_por_legajo'),
    ]

    operations = [
        migrations.RemoveField(model_name='usuario', name='cuenta'),
        migrations.RemoveField(model_name='bibliotecario', name='cuenta'),
        # El admin de Django se quitó: su bitácora (si existe) apunta a `users` y estorba al borrarla.
        migrations.RunSQL('DROP TABLE IF EXISTS django_admin_log', migrations.RunSQL.noop),
        migrations.RunSQL('DROP TABLE IF EXISTS comments', migrations.RunSQL.noop),
        migrations.DeleteModel(name='User'),
        migrations.RunPython(migrations.RunPython.noop, refuse_rollback),  # al volver atrás, es lo primero que se ejecuta
    ]
