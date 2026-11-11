import re
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def isbn_for(book, taken):
    code = re.sub(r'^ISBN[-\s]*', '', (book.nro_codigo or '').strip(), flags=re.I)
    if not code or code in taken or len(code) > 32:
        code = f'SIN-ISBN-{book.pk:06d}'
    taken.add(code)
    return code


def copy_books(apps, schema_editor):
    """Cada libro conserva su catálogo y genera sus ejemplares (disponibles + los que hoy están prestados)."""
    Book = apps.get_model('books', 'Book')
    Libro = apps.get_model('books', 'Libro')
    Ejemplar = apps.get_model('books', 'Ejemplar')
    Loan = apps.get_model('loans', 'Loan')
    alias = schema_editor.connection.alias
    taken, codes = set(), set()
    for book in Book.objects.using(alias).order_by('pk'):
        isbn = isbn_for(book, taken)
        year = int(book.fecha_publicacion) if (book.fecha_publicacion or '').isdigit() and len(book.fecha_publicacion) == 4 else None
        libro = Libro.objects.using(alias).create(
            isbn=isbn, titulo=book.titulo, autor=book.autor, categoria=book.categoria, anio_publicacion=year,
            resumen=book.descripcion, palabras_clave=', '.join(x for x in [book.tipo, book.editorial] if x)[:255],
            estado=book.estado, imagen=book.imagen, anio_cursada=book.anio)
        loans = Loan.objects.using(alias).filter(libro=book)
        borrowed = loans.filter(estado__in=['vigente', 'vencido']).count()
        states = ['disponible'] * book.disponibles + ['prestado'] * borrowed
        if not states and loans.exists():
            states = ['baja']  # los préstamos históricos necesitan un ejemplar al que apuntar
        base = book.nro_inventario or isbn
        for number, state in enumerate(states, start=1):
            code = base if number == 1 and book.nro_inventario else f'{base}-{number:02d}'
            while code in codes:
                code += 'x'
            codes.add(code)
            Ejemplar.objects.using(alias).create(codigo=code[:50], estado=state, libro=libro)


def refuse_rollback(apps, schema_editor):
    raise IrreversibleError('El rediseño de libros y ejemplares requiere restaurar un respaldo para volver atrás.')


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0009_book_estado'),
        ('loans', '0006_reservations_and_loan_lifecycle'),
        ('users', '0003_usuario_bibliotecario'),
    ]

    operations = [
        migrations.CreateModel(
            name='Libro',
            fields=[
                ('isbn', models.CharField(db_column='ISBN', max_length=32, primary_key=True, serialize=False)),
                ('titulo', models.CharField(max_length=255)),
                ('autor', models.CharField(blank=True, max_length=255)),
                ('categoria', models.CharField(max_length=100)),
                ('anio_publicacion', models.PositiveSmallIntegerField(blank=True, db_column='anioPublicacion', null=True)),
                ('resumen', models.TextField(blank=True)),
                ('palabras_clave', models.CharField(blank=True, db_column='palabrasClave', max_length=255)),
                ('estado', models.CharField(choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')], default='activo', max_length=10)),
                ('imagen', models.TextField(blank=True)),
                ('anio_cursada', models.PositiveSmallIntegerField(db_column='anioCursada', default=0)),
            ],
            options={'db_table': 'Libro'},
        ),
        migrations.CreateModel(
            name='Ejemplar',
            fields=[
                ('id', models.AutoField(db_column='idEjemplar', primary_key=True, serialize=False)),
                ('codigo', models.CharField(max_length=50, unique=True)),
                ('estado', models.CharField(choices=[('disponible', 'Disponible'), ('prestado', 'Prestado'), ('baja', 'Baja')], default='disponible', max_length=12)),
                ('ubicacion', models.CharField(blank=True, max_length=100)),
                ('observaciones', models.TextField(blank=True)),
                ('fecha_alta', models.DateField(db_column='fechaAlta', default=django.utils.timezone.localdate)),
                ('libro', models.ForeignKey(db_column='ISBN', on_delete=django.db.models.deletion.PROTECT, related_name='ejemplares', to='books.libro')),
            ],
            options={'db_table': 'Ejemplar'},
        ),
        migrations.AddConstraint(
            model_name='ejemplar',
            constraint=models.CheckConstraint(condition=models.Q(('estado__in', ['disponible', 'prestado', 'baja'])), name='ejemplar_valid_state'),
        ),
        migrations.CreateModel(
            name='Favorito',
            fields=[
                ('pk', models.CompositePrimaryKey('usuario_id', 'libro_id', blank=True, editable=False, primary_key=True, serialize=False)),
                ('usuario', models.ForeignKey(db_column='idUsuario', on_delete=django.db.models.deletion.CASCADE, related_name='favoritos', to='users.usuario')),
                ('libro', models.ForeignKey(db_column='ISBN', on_delete=django.db.models.deletion.CASCADE, related_name='favoritos', to='books.libro')),
            ],
            options={'db_table': 'Favorito'},
        ),
        migrations.RunPython(copy_books, refuse_rollback),
    ]
