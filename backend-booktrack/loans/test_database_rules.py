"""Reglas que viven en la base de datos (CHECK, UNIQUE, PROTECT) y el comando de vencimientos."""
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import DataError, IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from books.models import Ejemplar, Favorito
from books.testing import make_book
from users.testing import make_user
from .models import Notificacion, Prestamo, Reserva


class DatabaseRulesTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.student = make_user('s')
        self.book = make_book('L')
        self.copy = self.book.ejemplares.get()
        self.loan = Prestamo.objects.create(usuario=self.student, ejemplar=self.copy, fecha_vencimiento=self.today)

    def reservation(self, **over):
        data = dict(usuario=self.student, libro=self.book, fecha_vencimiento=self.today, **over)
        return Reserva.objects.create(**data)

    def test_loan_state_is_restricted_by_a_check_constraint(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Prestamo.objects.filter(pk=self.loan.pk).update(estado='aprobado')

    def test_reservation_state_is_restricted_by_a_check_constraint(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reservation(estado='pendiente')

    def test_finalized_reservation_must_reference_a_loan_and_only_those_can(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reservation(estado='finalizada')
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reservation(estado='activa', prestamo=self.loan)
        self.assertEqual(self.reservation(estado='finalizada', prestamo=self.loan).estado, 'finalizada')

    def test_a_loan_originates_at_most_one_reservation(self):
        self.reservation(estado='finalizada', prestamo=self.loan)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reservation(estado='finalizada', prestamo=self.loan)

    def test_reservation_code_is_unique_and_generated(self):
        first = self.reservation()
        self.assertTrue(first.codigo_reserva)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reservation(codigo_reserva=first.codigo_reserva)

    def test_history_protects_users_and_books(self):
        with self.assertRaises(ProtectedError):
            self.student.delete()
        with self.assertRaises(ProtectedError):
            self.book.delete()

    def test_copy_state_is_restricted_and_its_code_is_unique(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Ejemplar.objects.filter(pk=self.copy.pk).update(estado='perdido')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Ejemplar.objects.create(libro=self.book, codigo=self.copy.codigo)

    def test_a_favorite_is_unique_per_user_and_book(self):
        Favorito.objects.create(usuario=self.student, libro=self.book)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Favorito.objects.create(usuario=self.student, libro=self.book)

    def test_isbn_is_the_book_primary_key(self):
        self.assertEqual(self.book.pk, self.book.isbn)
        self.assertEqual(self.copy.libro_id, self.book.isbn)

    def test_a_notification_links_to_its_loan(self):
        Notificacion.objects.create(usuario=self.student, tipo='t', mensaje='m', prestamo=self.loan)
        self.assertEqual(Notificacion.objects.count(), 1)
        self.assertEqual(self.loan.notificaciones.count(), 1)

    def test_priority_cannot_be_negative(self):
        with self.assertRaises((IntegrityError, DataError)), transaction.atomic():
            self.reservation(prioridad=-1)


class UpdateStatesCommandTests(TestCase):
    def test_command_expires_reservations_and_loans_past_their_deadline(self):
        today = timezone.localdate()
        student = make_user('s')
        book = make_book('L')
        copy = book.ejemplares.get()
        late = Reserva.objects.create(usuario=student, libro=book, fecha_vencimiento=today - timedelta(days=1))
        on_time = Reserva.objects.create(usuario=student, libro=book, fecha_vencimiento=today)
        overdue = Prestamo.objects.create(usuario=student, ejemplar=copy, fecha_vencimiento=today - timedelta(days=1), extension_pendiente=True)
        current = Prestamo.objects.create(usuario=student, ejemplar=copy, fecha_vencimiento=today)
        historical = Prestamo.objects.create(usuario=student, ejemplar=copy, fecha_vencimiento=None)
        out = StringIO()

        call_command('actualizar_estados', stdout=out)

        for obj in (late, on_time, overdue, current, historical):
            obj.refresh_from_db()
        self.assertEqual((late.estado, on_time.estado), ('vencida', 'activa'))
        self.assertEqual((overdue.estado, current.estado, historical.estado), ('vencido', 'vigente', 'vigente'))
        self.assertFalse(overdue.extension_pendiente)
        self.assertIn('Reservas vencidas: 1; préstamos vencidos: 1', out.getvalue())
