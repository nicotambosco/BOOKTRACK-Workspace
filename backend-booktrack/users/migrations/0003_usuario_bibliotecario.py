import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def copy_accounts_to_profiles(apps, schema_editor):
    User = apps.get_model('users', 'User')
    Usuario = apps.get_model('users', 'Usuario')
    Bibliotecario = apps.get_model('users', 'Bibliotecario')
    alias = schema_editor.connection.alias
    for account in User.objects.using(alias).order_by('pk'):
        nombre, _, apellido = (account.nombre_apellido or '').strip().partition(' ')
        data = dict(cuenta=account, nombre=nombre, apellido=apellido.strip(), email=account.email)
        if account.categoria == 'bibliotecario':
            Bibliotecario.objects.using(alias).create(**data)
        else:
            Usuario.objects.using(alias).create(**data)


def refuse_rollback(apps, schema_editor):
    raise IrreversibleError('Separar usuarios y bibliotecarios requiere restaurar un respaldo para volver atrás.')


class Migration(migrations.Migration):

    dependencies = [('users', '0002_alter_user_imagen')]

    operations = [
        migrations.CreateModel(
            name='Usuario',
            fields=[
                ('nombre', models.CharField(blank=True, max_length=100)),
                ('apellido', models.CharField(blank=True, max_length=100)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('id', models.AutoField(db_column='idUsuario', primary_key=True, serialize=False)),
                ('email_alternativo', models.EmailField(blank=True, db_column='emailAlternativo', max_length=254)),
                ('telefono', models.CharField(blank=True, max_length=30)),
                ('tipo_usuario', models.CharField(choices=[('alumno', 'Alumno'), ('docente', 'Docente')], db_column='tipoUsuario', default='alumno', max_length=20)),
                ('cuenta', models.OneToOneField(db_column='idCuenta', on_delete=django.db.models.deletion.CASCADE, related_name='usuario', to='users.user')),
            ],
            options={'db_table': 'Usuario'},
        ),
        migrations.CreateModel(
            name='Bibliotecario',
            fields=[
                ('nombre', models.CharField(blank=True, max_length=100)),
                ('apellido', models.CharField(blank=True, max_length=100)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('id', models.AutoField(db_column='idBibliotecario', primary_key=True, serialize=False)),
                ('cuenta', models.OneToOneField(db_column='idCuenta', on_delete=django.db.models.deletion.CASCADE, related_name='bibliotecario', to='users.user')),
            ],
            options={'db_table': 'Bibliotecario'},
        ),
        migrations.RunPython(copy_accounts_to_profiles, refuse_rollback),
        migrations.RemoveField(model_name='user', name='categoria'),
        migrations.RemoveField(model_name='user', name='nombre_apellido'),
    ]
