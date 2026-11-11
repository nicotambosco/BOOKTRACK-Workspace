from importlib import import_module
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def copy_history(apps, schema_editor):
    """Pasa préstamos y reservas a las tablas nuevas conservando sus ids, fechas y vínculos."""
    isbn_for = import_module('books.migrations.0010_libro_ejemplar_favorito').isbn_for
    Book, Ejemplar = apps.get_model('books', 'Book'), apps.get_model('books', 'Ejemplar')
    Usuario, Bibliotecario = apps.get_model('users', 'Usuario'), apps.get_model('users', 'Bibliotecario')
    Loan, Reservation = apps.get_model('loans', 'Loan'), apps.get_model('loans', 'Reservation')
    Prestamo, Reserva = apps.get_model('loans', 'Prestamo'), apps.get_model('loans', 'Reserva')
    alias = schema_editor.connection.alias

    taken = set()
    isbn_of = {book.pk: isbn_for(book, taken) for book in Book.objects.using(alias).order_by('pk')}
    usuarios = {u.cuenta_id: u.pk for u in Usuario.objects.using(alias)}
    bibliotecarios = {b.cuenta_id: b.pk for b in Bibliotecario.objects.using(alias)}
    librarian_of_loan = {r.prestamo_id: bibliotecarios.get(r.bibliotecario_id)
                         for r in Reservation.objects.using(alias).exclude(prestamo=None)}

    def usuario_id(account_id):
        if account_id not in usuarios:  # un bibliotecario que pidió prestado necesita su perfil de usuario
            librarian = Bibliotecario.objects.using(alias).get(cuenta_id=account_id)
            usuarios[account_id] = Usuario.objects.using(alias).create(
                cuenta_id=account_id, nombre=librarian.nombre, apellido=librarian.apellido, email=librarian.email).pk
        return usuarios[account_id]

    lent = {}  # isbn -> ejemplares prestados todavía sin préstamo asignado
    for ej in Ejemplar.objects.using(alias).filter(estado='prestado').order_by('pk'):
        lent.setdefault(ej.libro_id, []).append(ej.pk)

    def any_copy(isbn):
        return Ejemplar.objects.using(alias).filter(libro_id=isbn).order_by('pk').first().pk

    for loan in Loan.objects.using(alias).order_by('pk'):
        isbn = isbn_of[loan.libro_id]
        open_loan = loan.estado in ('vigente', 'vencido')
        ejemplar = lent[isbn].pop(0) if open_loan and lent.get(isbn) else any_copy(isbn)
        Prestamo.objects.using(alias).create(
            id=loan.pk, fecha_prestamo=loan.fecha_inicio, fecha_vencimiento=loan.fecha_vencimiento,
            fecha_devolucion=loan.fecha_devolucion, estado=loan.estado, usuario_id=usuario_id(loan.estudiante_id),
            ejemplar_id=ejemplar, bibliotecario_id=librarian_of_loan.get(loan.pk),
            extension_pendiente=loan.extension_pendiente, extension_estado=loan.extension_estado)

    for r in Reservation.objects.using(alias).order_by('pk'):
        Reserva.objects.using(alias).create(
            id=r.pk, codigo_reserva=r.codigo_reserva, prioridad=r.prioridad, fecha_reserva=r.fecha_reserva,
            fecha_vencimiento=r.fecha_vencimiento, estado=r.estado, usuario_id=usuario_id(r.estudiante_id),
            libro_id=isbn_of[r.libro_id], bibliotecario_id=bibliotecarios.get(r.bibliotecario_id),
            fecha_devolucion_prevista=r.fecha_devolucion_prevista, prestamo_id=r.prestamo_id)


def refuse_rollback(apps, schema_editor):
    raise IrreversibleError('El rediseño de préstamos y reservas requiere restaurar un respaldo para volver atrás.')


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0010_libro_ejemplar_favorito'),
        ('users', '0003_usuario_bibliotecario'),
        ('loans', '0006_reservations_and_loan_lifecycle'),
    ]

    operations = [
        migrations.CreateModel(
            name='Prestamo',
            fields=[
                ('id', models.AutoField(db_column='idPrestamo', primary_key=True, serialize=False)),
                ('fecha_prestamo', models.DateField(db_column='fechaPrestamo', default=django.utils.timezone.localdate)),
                ('fecha_vencimiento', models.DateField(blank=True, db_column='fechaVencimiento', null=True)),
                ('fecha_devolucion', models.DateField(blank=True, db_column='fechaDevolucion', null=True)),
                ('estado', models.CharField(choices=[('vigente', 'Vigente'), ('vencido', 'Vencido'), ('devuelto', 'Devuelto')], default='vigente', max_length=10)),
                ('extension_pendiente', models.BooleanField(db_column='extensionPendiente', default=False)),
                ('extension_estado', models.CharField(blank=True, choices=[('', 'Sin resolver'), ('aprobada', 'Aprobada'), ('denegada', 'Denegada')], db_column='extensionEstado', max_length=10)),
                ('usuario', models.ForeignKey(db_column='idUsuario', on_delete=django.db.models.deletion.PROTECT, related_name='prestamos', to='users.usuario')),
                ('ejemplar', models.ForeignKey(db_column='idEjemplar', on_delete=django.db.models.deletion.PROTECT, related_name='prestamos', to='books.ejemplar')),
                ('bibliotecario', models.ForeignKey(blank=True, db_column='idBibliotecario', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='prestamos', to='users.bibliotecario')),
            ],
            options={'db_table': 'Prestamo'},
        ),
        migrations.AddConstraint(
            model_name='prestamo',
            constraint=models.CheckConstraint(condition=models.Q(('estado__in', ['vigente', 'vencido', 'devuelto'])), name='prestamo_valid_state'),
        ),
        migrations.CreateModel(
            name='Reserva',
            fields=[
                ('id', models.AutoField(db_column='idReserva', primary_key=True, serialize=False)),
                ('codigo_reserva', models.CharField(db_column='codigoReserva', default=uuid.uuid4, editable=False, max_length=40, unique=True)),
                ('prioridad', models.PositiveSmallIntegerField(default=0)),
                ('fecha_reserva', models.DateField(db_column='fechaReserva', default=django.utils.timezone.localdate)),
                ('fecha_vencimiento', models.DateField(db_column='fechaVencimiento')),
                ('estado', models.CharField(choices=[('activa', 'Activa'), ('cancelada', 'Cancelada'), ('vencida', 'Vencida'), ('finalizada', 'Finalizada')], default='activa', max_length=10)),
                ('fecha_devolucion_prevista', models.DateField(blank=True, db_column='fechaDevolucionPrevista', null=True)),
                ('usuario', models.ForeignKey(db_column='idUsuario', on_delete=django.db.models.deletion.PROTECT, related_name='reservas', to='users.usuario')),
                ('libro', models.ForeignKey(db_column='ISBN', on_delete=django.db.models.deletion.PROTECT, related_name='reservas', to='books.libro')),
                ('bibliotecario', models.ForeignKey(blank=True, db_column='idBibliotecario', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reservas', to='users.bibliotecario')),
                ('prestamo', models.OneToOneField(blank=True, db_column='idPrestamo', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reserva', to='loans.prestamo')),
            ],
            options={'db_table': 'Reserva', 'ordering': ['-prioridad', 'fecha_reserva', 'id']},
        ),
        migrations.AddIndex(model_name='reserva', index=models.Index(fields=['libro', 'estado', 'prioridad'], name='reserva_queue_idx')),
        migrations.AddConstraint(
            model_name='reserva',
            constraint=models.CheckConstraint(condition=models.Q(('estado__in', ['activa', 'cancelada', 'vencida', 'finalizada'])), name='reserva_valid_state'),
        ),
        migrations.AddConstraint(
            model_name='reserva',
            constraint=models.CheckConstraint(condition=models.Q(models.Q(('estado', 'finalizada'), ('prestamo__isnull', False)), models.Q(models.Q(('estado', 'finalizada'), _negated=True), ('prestamo__isnull', True)), _connector='OR'), name='reserva_finalized_loan'),
        ),
        migrations.CreateModel(
            name='Notificacion',
            fields=[
                ('id', models.AutoField(db_column='idNotificacion', primary_key=True, serialize=False)),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('tipo', models.CharField(max_length=40)),
                ('mensaje', models.TextField()),
                ('usuario', models.ForeignKey(db_column='idUsuario', on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to='users.usuario')),
                ('reserva', models.ForeignKey(blank=True, db_column='idReserva', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notificaciones', to='loans.reserva')),
                ('prestamo', models.ForeignKey(blank=True, db_column='idPrestamo', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notificaciones', to='loans.prestamo')),
            ],
            options={'db_table': 'Notificacion', 'ordering': ['-fecha', '-id']},
        ),
        migrations.CreateModel(
            name='AccionAdministrativa',
            fields=[
                ('id', models.AutoField(db_column='idAccion', primary_key=True, serialize=False)),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('tipo_accion', models.CharField(db_column='tipoAccion', max_length=40)),
                ('descripcion', models.TextField(blank=True)),
                ('bibliotecario', models.ForeignKey(blank=True, db_column='idBibliotecario', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acciones', to='users.bibliotecario')),
                ('reserva', models.ForeignKey(blank=True, db_column='idReserva', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acciones', to='loans.reserva')),
                ('prestamo', models.ForeignKey(blank=True, db_column='idPrestamo', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acciones', to='loans.prestamo')),
                ('libro', models.ForeignKey(blank=True, db_column='ISBN', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acciones', to='books.libro')),
                ('ejemplar', models.ForeignKey(blank=True, db_column='idEjemplar', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acciones', to='books.ejemplar')),
            ],
            options={'db_table': 'AccionAdministrativa', 'ordering': ['-fecha', '-id']},
        ),
        migrations.RunPython(copy_history, refuse_rollback),
    ]
