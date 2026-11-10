"""Reglas que viven en la base de datos (CHECK, UNIQUE, PROTECT) y el comando de vencimientos."""
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import DataError, IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from books.models import Book
from users.models import User
from .models import Loan, Reservation


class DatabaseRulesTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.student = User.objects.create_user(username='s', password='x', legajo='s')
        self.book = Book.objects.create(titulo='L', categoria='Basicas')
        self.loan = Loan.objects.create(estudiante=self.student, libro=self.book, fecha_vencimiento=self.today)

    def reservation(self, **over):
        data = dict(estudiante=self.student, libro=self.book, fecha_vencimiento=self.today, **over)
        return Reservation.objects.create(**data)

    def test_loan_state_is_restricted_by_a_check_constraint(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Loan.objects.filter(pk=self.loan.pk).update(estado='aprobado')

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

    def test_priority_cannot_be_negative(self):
        with self.assertRaises((IntegrityError, DataError)), transaction.atomic():
            self.reservation(prioridad=-1)


class UpdateStatesCommandTests(TestCase):
    def test_command_expires_reservations_and_loans_past_their_deadline(self):
        today = timezone.localdate()
        student = User.objects.create_user(username='s', password='x', legajo='s')
        book = Book.objects.create(titulo='L', categoria='Basicas')
        late = Reservation.objects.create(estudiante=student, libro=book, fecha_vencimiento=today - timedelta(days=1))
        on_time = Reservation.objects.create(estudiante=student, libro=book, fecha_vencimiento=today)
        overdue = Loan.objects.create(estudiante=student, libro=book, fecha_vencimiento=today - timedelta(days=1), extension_pendiente=True)
        current = Loan.objects.create(estudiante=student, libro=book, fecha_vencimiento=today)
        historical = Loan.objects.create(estudiante=student, libro=book, fecha_vencimiento=None)
        out = StringIO()

        call_command('actualizar_estados', stdout=out)

        for obj in (late, on_time, overdue, current, historical):
            obj.refresh_from_db()
        self.assertEqual((late.estado, on_time.estado), ('vencida', 'activa'))
        self.assertEqual((overdue.estado, current.estado, historical.estado), ('vencido', 'vigente', 'vigente'))
        self.assertFalse(overdue.extension_pendiente)
        self.assertIn('Reservas vencidas: 1; préstamos vencidos: 1', out.getvalue())
