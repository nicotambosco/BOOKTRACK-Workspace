"""Exercise an upgrade from the old schema on an isolated file, not the user's DB."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from django.conf import settings
from django.test import SimpleTestCase


class LegacyMigrationTests(SimpleTestCase):
    def test_requests_dates_and_stock_survive_the_upgrade(self):
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
old = [('loans', '0005_alter_loan_fecha_inicio'), ('books', '0008_normalize_book_categories')]
executor.migrate(old)
apps = executor.loader.project_state(old).apps
User = apps.get_model('users', 'User')
Book = apps.get_model('books', 'Book')
Loan = apps.get_model('loans', 'Loan')
student = User.objects.create(username='legacy-student')
book = Book.objects.create(pk=20000, titulo='Legacy', categoria='sistemas', disponibles=3, nro_inventario='LEGACY-TEST-20000')
today = timezone.localdate()
pending = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='pendiente', fecha_inicio=today+timedelta(days=2), fecha_fin=today+timedelta(days=9), plazo_de_solicitud='original')
unknown_date = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='pendiente', fecha_inicio=today+timedelta(days=3), fecha_fin=None)
denied = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal', estado='denegado', fecha_inicio=today)
overdue = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal',
    estado='aprobado', fecha_inicio=today-timedelta(days=9), fecha_fin=today-timedelta(days=2))
returned = Loan.objects.create(estudiante=student, libro=book, tipo_prestamo='normal', estado='devuelto', fecha_inicio=today)
call_command('migrate', verbosity=0)
from books.models import Book as NewBook
from loans.models import Loan as NewLoan, Reservation
assert NewLoan.objects.count() == 2
assert Reservation.objects.count() == 3
r = Reservation.objects.get(codigo_reserva=f'LEGACY-{pending.pk}')
assert r.estado == 'activa'
assert r.fecha_devolucion_prevista == today+timedelta(days=9)
assert r.datos_legacy['id'] == pending.pk
assert r.datos_legacy['fecha_fin'] == str(today+timedelta(days=9))
assert r.datos_legacy['plazo_de_solicitud'] == 'original'
assert Reservation.objects.get(codigo_reserva=f'LEGACY-{denied.pk}').estado == 'cancelada'
assert Reservation.objects.get(codigo_reserva=f'LEGACY-{unknown_date.pk}').fecha_devolucion_prevista is None
assert NewLoan.objects.get(pk=overdue.pk).estado == 'vencido'
assert NewLoan.objects.get(pk=overdue.pk).fecha_vencimiento == today-timedelta(days=2)
assert NewLoan.objects.get(pk=returned.pk).fecha_devolucion is None
assert NewBook.objects.get(pk=book.pk).disponibles == 3
# Reapplying is harmless; rollback refuses before changing schema or data.
call_command('migrate', verbosity=0)
try:
    call_command('migrate', 'loans', '0005', verbosity=0)
except IrreversibleError:
    pass
else:
    raise AssertionError('Rollback should require a backup')
assert Reservation.objects.count() == 3
assert NewLoan.objects.get(pk=overdue.pk).fecha_vencimiento == today-timedelta(days=2)
print('Legacy upgrade verified')
'''
        with tempfile.TemporaryDirectory(prefix='booktrack-migration-') as temp:
            env = dict(os.environ, DB_ENGINE='sqlite3', DB_NAME=str(Path(temp)/'legacy.sqlite3'),
                       DJANGO_SETTINGS_MODULE='booktrack.settings')
            result = subprocess.run([sys.executable, '-c', script], cwd=settings.BASE_DIR,
                                    env=env, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('Legacy upgrade verified', result.stdout)
