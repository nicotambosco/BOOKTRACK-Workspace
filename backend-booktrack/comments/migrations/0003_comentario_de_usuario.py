import django.db.models.deletion
from django.db import migrations, models


def align_collation(apps, schema_editor):
    """MySQL solo relaciona columnas de texto con la misma collation, y `comments` es más vieja que `Usuario`."""
    connection = schema_editor.connection
    if connection.vendor != 'mysql':
        return
    with connection.cursor() as cursor:
        cursor.execute("SELECT table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Usuario'")
        collation = cursor.fetchone()[0]
        schema_editor.execute(f"ALTER TABLE comments CONVERT TO CHARACTER SET {collation.split('_')[0]} COLLATE {collation}")


def copy_author(apps, schema_editor):
    Comment, Usuario = apps.get_model('comments', 'Comment'), apps.get_model('users', 'Usuario')
    alias = schema_editor.connection.alias
    by_account = {u.cuenta_id: u.pk for u in Usuario.objects.using(alias)}
    for comment in Comment.objects.using(alias).exclude(user=None):
        comment.usuario_id = by_account.get(comment.user_id)  # un bibliotecario ya no figura como autor
        comment.save(update_fields=['usuario'])


class Migration(migrations.Migration):

    dependencies = [('comments', '0002_initial'), ('users', '0004_legajo_como_clave')]

    operations = [
        migrations.RunPython(align_collation, migrations.RunPython.noop, atomic=False),
        migrations.AddField(model_name='comment', name='usuario', field=models.ForeignKey(
            blank=True, db_column='idUsuario', null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.usuario')),
        migrations.RunPython(copy_author, migrations.RunPython.noop),
        migrations.RemoveField(model_name='comment', name='user'),
    ]
