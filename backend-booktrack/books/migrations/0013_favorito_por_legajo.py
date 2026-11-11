import django.db.models.deletion
from django.db import migrations, models


def restore(apps, schema_editor):
    Favorito, Tmp = apps.get_model('books', 'Favorito'), apps.get_model('books', 'FavoritoTemporal')
    Usuario = apps.get_model('users', 'Usuario')
    alias = schema_editor.connection.alias
    valid = set(Usuario.objects.using(alias).values_list('pk', flat=True))
    for fav in Tmp.objects.using(alias).all():
        if fav.legajo in valid:  # los favoritos de quien dejó de ser usuario se descartan
            Favorito.objects.using(alias).get_or_create(usuario_id=fav.legajo, libro_id=fav.isbn)


class Migration(migrations.Migration):

    dependencies = [('books', '0012_stash_favorites'), ('users', '0004_legajo_como_clave')]

    operations = [
        migrations.CreateModel(
            name='Favorito',
            fields=[
                ('pk', models.CompositePrimaryKey('usuario_id', 'libro_id', blank=True, editable=False, primary_key=True, serialize=False)),
                ('usuario', models.ForeignKey(db_column='idUsuario', on_delete=django.db.models.deletion.CASCADE, related_name='favoritos', to='users.usuario')),
                ('libro', models.ForeignKey(db_column='ISBN', on_delete=django.db.models.deletion.CASCADE, related_name='favoritos', to='books.libro')),
            ],
            options={'db_table': 'Favorito'},
        ),
        migrations.RunPython(restore, migrations.RunPython.noop),
        migrations.DeleteModel(name='FavoritoTemporal'),
    ]
