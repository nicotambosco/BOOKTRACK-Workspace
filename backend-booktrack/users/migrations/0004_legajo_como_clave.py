"""Usuario y Bibliotecario pasan a ser las tablas de login: guardan la contraseña y su clave primaria es el legajo.

Franco (y cualquier cuenta que sea bibliotecario) deja de figurar como Usuario; los préstamos, reservas y avisos
que tenía como usuario se eliminan porque el diagrama no permite que un bibliotecario sea usuario.
"""
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError
from django.db.models import Q


def copy_credentials(apps, schema_editor):
    Usuario, Bibliotecario = apps.get_model('users', 'Usuario'), apps.get_model('users', 'Bibliotecario')
    Prestamo, Reserva = apps.get_model('loans', 'Prestamo'), apps.get_model('loans', 'Reserva')
    Notificacion, Ejemplar = apps.get_model('loans', 'Notificacion'), apps.get_model('books', 'Ejemplar')
    alias = schema_editor.connection.alias

    for user in Usuario.objects.using(alias).filter(cuenta__in=Bibliotecario.objects.using(alias).values('cuenta')):
        loans = Prestamo.objects.using(alias).filter(usuario=user)
        Ejemplar.objects.using(alias).filter(prestamos__in=loans.filter(estado__in=['vigente', 'vencido'])).update(estado='disponible')
        Reserva.objects.using(alias).filter(Q(usuario=user) | Q(prestamo__in=loans)).delete()
        Notificacion.objects.using(alias).filter(usuario=user).delete()
        loans.delete()
        user.delete()

    for model in (Usuario, Bibliotecario):
        for person in model.objects.using(alias).select_related('cuenta'):
            account = person.cuenta
            person.password, person.last_login, person.is_active, person.imagen = account.password, account.last_login, account.is_active, account.imagen
            if model is Usuario:
                person.codigo = account.codigo
            person.save()


def use_legajo_as_key(apps, schema_editor):
    Usuario, Bibliotecario = apps.get_model('users', 'Usuario'), apps.get_model('users', 'Bibliotecario')
    Prestamo, Reserva = apps.get_model('loans', 'Prestamo'), apps.get_model('loans', 'Reserva')
    Notificacion, Accion = apps.get_model('loans', 'Notificacion'), apps.get_model('loans', 'AccionAdministrativa')
    alias = schema_editor.connection.alias
    references = {Usuario: [(Prestamo, 'usuario_id'), (Reserva, 'usuario_id'), (Notificacion, 'usuario_id')],
                  Bibliotecario: [(Prestamo, 'bibliotecario_id'), (Reserva, 'bibliotecario_id'), (Accion, 'bibliotecario_id')]}
    chosen = {}
    for model in (Usuario, Bibliotecario):
        for person in model.objects.using(alias).select_related('cuenta'):
            legajo = (person.cuenta.legajo or person.cuenta.username).strip()
            if legajo in chosen.values():
                raise RuntimeError(f'El legajo {legajo!r} está repetido entre usuarios y bibliotecarios; corregilo antes de migrar.')
            chosen[(model, person.pk)] = legajo
    with schema_editor.connection.constraint_checks_disabled():
        for phase in ('temporal', 'final'):  # dos pasos para que un legajo nuevo no choque con un id viejo
            for (model, old), legajo in chosen.items():
                source = old if phase == 'temporal' else f'~{old}'
                target = f'~{old}' if phase == 'temporal' else legajo
                for ref_model, field in references[model]:
                    ref_model.objects.using(alias).filter(**{field: source}).update(**{field: target})
                model.objects.using(alias).filter(pk=source).update(id=target)


def refuse_rollback(apps, schema_editor):
    raise IrreversibleError('Usar el legajo como clave requiere restaurar un respaldo para volver atrás.')


def persona_fields():
    return [
        ('password', models.CharField(default='', max_length=128, verbose_name='password')),
        ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
        ('is_active', models.BooleanField(default=True)),
        ('imagen', models.TextField(blank=True, default='')),
    ]


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_usuario_bibliotecario'),
        ('loans', '0008_delete_legacy_loans'),
        ('books', '0012_stash_favorites'),
    ]

    operations = [
        *[migrations.AddField(model_name=model, name=name, field=field, preserve_default=name == 'is_active' or name == 'last_login')
          for model in ('usuario', 'bibliotecario') for name, field in persona_fields()],
        migrations.AddField(model_name='usuario', name='codigo', field=models.CharField(blank=True, default='', max_length=50),
                            preserve_default=False),
        migrations.RunPython(copy_credentials, refuse_rollback),
        migrations.AlterField(model_name='usuario', name='id',
                              field=models.CharField(db_column='idUsuario', max_length=50, primary_key=True, serialize=False)),
        migrations.AlterField(model_name='bibliotecario', name='id',
                              field=models.CharField(db_column='idBibliotecario', max_length=50, primary_key=True, serialize=False)),
        migrations.RunPython(use_legajo_as_key, refuse_rollback),
    ]
