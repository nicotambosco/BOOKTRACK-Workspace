"""Los favoritos se guardan aparte mientras cambia la clave de Usuario (la clave compuesta no se puede alterar en el lugar)."""
from django.db import migrations, models


def stash(apps, schema_editor):
    Favorito, Tmp = apps.get_model('books', 'Favorito'), apps.get_model('books', 'FavoritoTemporal')
    alias = schema_editor.connection.alias
    for fav in Favorito.objects.using(alias).select_related('usuario__cuenta'):
        Tmp.objects.using(alias).create(legajo=fav.usuario.cuenta.legajo or fav.usuario.cuenta.username, isbn=fav.libro_id)


class Migration(migrations.Migration):

    dependencies = [('books', '0011_delete_book'), ('users', '0003_usuario_bibliotecario')]

    operations = [
        migrations.CreateModel(name='FavoritoTemporal', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('legajo', models.CharField(max_length=50)), ('isbn', models.CharField(max_length=32))]),
        migrations.RunPython(stash, migrations.RunPython.noop),
        migrations.DeleteModel(name='Favorito'),
    ]
