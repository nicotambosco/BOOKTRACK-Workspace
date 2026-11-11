"""Exercise an upgrade from the old schema on an isolated file, not the user's DB."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from django.conf import settings
from django.test import SimpleTestCase


class LegacyMigrationTests(SimpleTestCase):
    def test_users_books_loans_and_reservations_survive_the_upgrade(self):
        script = r'''
import django
django.setup()
from datetime import timedelta
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.exceptions import IrreversibleError
from django.utils import timezone

executor = MigrationExecutor(connection)
old = [('loans', '0005_alter_loan_fecha_inicio'), ('books', '0008_normalize_book_categories'), ('users', '0002_alter_user_imagen')]
executor.migrate(old)
apps = executor.loader.project_state(old).apps
User = apps.get_model('users', 'User')
Book = apps.get_model('books', 'Book')
Loan = apps.get_model('loans', 'Loan')
student = User.objects.create(username='legacy-student', nombre_apellido='Ana Gómez Pérez', email='ana@utn.test', categoria='usuario')
librarian = User.objects.create(username='legacy-librarian', nombre_apellido='Franco Perez', categoria='bibliotecario')
book = Book.objects.create(pk=20000, titulo='Legacy', categoria='sistemas', disponibles=3, nro_inventario='LEGACY-TEST-20000',
                           nro_codigo='ISBN-9780000020000', tipo='libro base', editorial='Pearson', descripcion='un resumen', anio=2)
plain = Book.objects.create(pk=20001, titulo='Sin codigo', categoria='sistemas', disponibles=1)
unused = Book.objects.create(pk=20002, titulo='Sin stock', categoria='sistemas', disponibles=0)
today = timezone.localdate()
pending = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='pendiente', fecha_inicio=today+timedelta(days=2), fecha_fin=today+timedelta(days=9), plazo_de_solicitud='original')
unknown_date = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='pendiente', fecha_inicio=today+timedelta(days=3), fecha_fin=None)
denied = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal', estado='denegado', fecha_inicio=today)
overdue = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='aprobado', fecha_inicio=today-timedelta(days=9), fecha_fin=today-timedelta(days=2))
returned = Loan.objects.create(estudiante=student, libro=plain, tipo_prestamo='normal', estado='devuelto', fecha_inicio=today)
borrowed_by_librarian = Loan.objects.create(estudiante=librarian, libro=unused, tipo_prestamo='normal', estado='devuelto', fecha_inicio=today)
call_command('migrate', verbosity=0)

from books.models import Ejemplar, Libro
from loans.models import Prestamo, Reserva
from users.models import Bibliotecario, Usuario

# Personas: cada cuenta queda en la tabla de su rol, con el nombre dividido.
ana = Usuario.objects.get(pk='legacy-student')  # sin legajo, la clave es el nombre de usuario
assert (ana.nombre, ana.apellido, ana.email, ana.categoria) == ('Ana', 'Gómez Pérez', 'ana@utn.test', 'usuario')
assert Bibliotecario.objects.get(pk='legacy-librarian').categoria == 'bibliotecario'
# un bibliotecario no figura como usuario: el préstamo que había pedido como tal se elimina
assert not Usuario.objects.filter(pk='legacy-librarian').exists()
assert not Prestamo.objects.filter(pk=borrowed_by_librarian.pk).exists()

# Libros: el código ISBN-... pasa a ser la clave; sin código se genera una provisoria.
libro = Libro.objects.get(pk='9780000020000')
assert (libro.resumen, libro.anio_cursada, libro.palabras_clave) == ('un resumen', 2, 'libro base, Pearson')
assert Libro.objects.get(pk='SIN-ISBN-020001').titulo == 'Sin codigo'
# Ejemplares: disponibles + los que siguen prestados (el préstamo vencido).
assert libro.ejemplares.count() == 4
assert libro.ejemplares.filter(estado='disponible').count() == 3
assert libro.ejemplares.filter(estado='prestado').count() == 1
assert libro.ejemplares.filter(codigo='LEGACY-TEST-20000').exists()
# el libro que solo tuvo préstamos históricos recibe un ejemplar de baja al que apuntarlos
assert list(Libro.objects.get(pk='SIN-ISBN-020002').ejemplares.values_list('estado', flat=True)) == ['baja']

# Préstamos y reservas: ids, estados y fechas se conservan.
assert Prestamo.objects.count() == 2
assert Reserva.objects.count() == 3
r = Reserva.objects.get(codigo_reserva=f'LEGACY-{pending.pk}')
assert r.estado == 'activa'
assert r.fecha_devolucion_prevista == today+timedelta(days=9)
assert r.libro_id == '9780000020000' and r.usuario_id == ana.pk
assert Reserva.objects.get(codigo_reserva=f'LEGACY-{denied.pk}').estado == 'cancelada'
assert Reserva.objects.get(codigo_reserva=f'LEGACY-{unknown_date.pk}').fecha_devolucion_prevista is None
late = Prestamo.objects.get(pk=overdue.pk)
assert (late.estado, late.fecha_vencimiento, late.fecha_prestamo) == ('vencido', today-timedelta(days=2), today-timedelta(days=9))
assert late.ejemplar.estado == 'prestado' and late.ejemplar.libro_id == '9780000020000'
assert Prestamo.objects.get(pk=returned.pk).fecha_devolucion is None
assert Ejemplar.objects.filter(estado='disponible').count() >= 3

# Reaplicar no cambia nada; volver atrás exige restaurar un respaldo y no toca los datos nuevos.
call_command('migrate', verbosity=0)
try:
    call_command('migrate', 'users', '0004', verbosity=0)
except IrreversibleError:
    pass
else:
    raise AssertionError('Rollback should require a backup')
assert Prestamo.objects.count() == 2 and Libro.objects.filter(pk='9780000020000').exists()
print('Legacy upgrade verified')
'''
        with tempfile.TemporaryDirectory(prefix='booktrack-migration-') as temp:
            env = dict(os.environ, DB_ENGINE='sqlite3', DB_NAME=str(Path(temp)/'legacy.sqlite3'),
                       DJANGO_SETTINGS_MODULE='booktrack.settings')
            result = subprocess.run([sys.executable, '-c', script], cwd=settings.BASE_DIR,
                                    env=env, capture_output=True, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('Legacy upgrade verified', result.stdout)
