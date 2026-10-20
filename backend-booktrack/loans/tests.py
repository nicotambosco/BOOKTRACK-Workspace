from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless

from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from books.models import Book
from users.models import User
from .models import Loan, Reservation
from . import services


class LifecycleTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.student = User.objects.create_user(username='student', password='test-pass', legajo='S1')
        self.other = User.objects.create_user(username='other', password='test-pass', legajo='S2')
        self.librarian = User.objects.create_user(username='librarian', password='test-pass', legajo='L1', categoria='bibliotecario')
        self.book = Book.objects.create(titulo='Libro 📚', categoria='sistemas', disponibles=1)
        self.client = APIClient()
        self.client.force_authenticate(self.student)
        self.other_client = APIClient()
        self.other_client.force_authenticate(self.other)
        self.admin = APIClient()
        self.admin.force_authenticate(self.librarian)

    def reserve(self, client=None, **overrides):
        return (client or self.client).post('/api/reservations/', {
            'libroId': self.book.pk,
            'fechaVencimiento': str(self.today + timedelta(days=2)),
            'fechaDevolucionPrevista': str(self.today + timedelta(days=9)),
            **overrides,
        }, format='json')

    def pickup(self):
        response = self.reserve()
        self.assertEqual(response.status_code, 201, response.data)
        response = self.admin.patch(f"/api/reservations/{response.data['id']}/retirar/")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data['prestamoId']

    def test_new_reservation_is_active_and_does_not_change_stock(self):
        response = self.reserve(prioridad=500, estado='finalizada', estudianteId=self.other.id)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['estado'], 'activa')
        self.assertEqual(response.data['prioridad'], 0)
        self.assertEqual(response.data['estudianteId'], self.student.pk)
        self.assertIsNone(response.data['prestamoId'])
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 1)
        self.assertEqual(Loan.objects.count(), 0)

    def test_reservations_allow_waiting_for_a_copy(self):
        self.book.disponibles = 0
        self.book.save()
        response = self.reserve()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.admin.patch(f"/api/reservations/{response.data['id']}/retirar/").status_code, 400)
        self.assertEqual(Loan.objects.count(), 0)

    def test_inactive_book_cannot_be_reserved_or_delivered(self):
        response = self.reserve()
        self.book.estado = 'inactivo'
        self.book.save()
        self.assertEqual(self.reserve(self.other_client).status_code, 400)
        self.assertEqual(self.admin.patch(f"/api/reservations/{response.data['id']}/retirar/").status_code, 400)

    def test_dates_and_book_references_are_validated(self):
        for overrides in [
            {'libroId': 987654},
            {'fechaVencimiento': str(self.today - timedelta(days=1))},
            {'fechaDevolucionPrevista': str(self.today)},
            {'fechaVencimiento': 'invalid'},
        ]:
            with self.subTest(overrides=overrides):
                self.assertEqual(self.reserve(**overrides).status_code, 400)

    def test_cannot_create_duplicate_active_reservations(self):
        self.assertEqual(self.reserve().status_code, 201)
        self.assertEqual(self.reserve().status_code, 400)

    def test_pickup_creates_one_loan_and_retry_is_idempotent(self):
        reservation_id = self.reserve().data['id']
        url = f'/api/reservations/{reservation_id}/retirar/'
        self.assertEqual(self.client.patch(url).status_code, 403)
        first = self.admin.patch(url)
        second = self.admin.patch(url)
        self.assertEqual(first.data['estado'], 'finalizada')
        self.assertEqual(first.data['prestamoId'], second.data['prestamoId'])
        self.assertEqual(Loan.objects.count(), 1)
        loan = Loan.objects.get()
        self.assertEqual(loan.estado, 'vigente')
        self.assertEqual(loan.fecha_inicio, self.today)
        self.assertEqual(loan.fecha_vencimiento, self.today + timedelta(days=9))
        self.assertIsNone(loan.fecha_devolucion)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 0)

    def test_actual_return_is_recorded_once_without_changing_deadline(self):
        loan_id = self.pickup()
        url = f'/api/loans/{loan_id}/devolver/'
        self.assertEqual(self.client.patch(url).status_code, 403)
        self.assertEqual(self.admin.patch(url).status_code, 200)
        self.assertEqual(self.admin.patch(url).status_code, 200)
        loan = Loan.objects.get(pk=loan_id)
        self.assertEqual(loan.estado, 'devuelto')
        self.assertEqual(loan.fecha_devolucion, self.today)
        self.assertEqual(loan.fecha_vencimiento, self.today + timedelta(days=9))
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 1)

    def test_cancel_is_owned_idempotent_and_releases_no_stock(self):
        reservation_id = self.reserve().data['id']
        url = f'/api/reservations/{reservation_id}/cancelar/'
        self.assertEqual(self.other_client.patch(url).status_code, 404)
        self.assertEqual(self.client.patch(url).data['estado'], 'cancelada')
        self.assertEqual(self.client.patch(url).data['estado'], 'cancelada')
        self.assertEqual(self.admin.patch(f'/api/reservations/{reservation_id}/retirar/').status_code, 400)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 1)

    def test_finalized_reservation_cannot_be_cancelled(self):
        self.pickup()
        reservation = Reservation.objects.get()
        self.assertEqual(self.admin.patch(f'/api/reservations/{reservation.id}/cancelar/').status_code, 400)

    def test_expiration_is_applied_before_state_filters(self):
        reservation_id = self.reserve().data['id']
        Reservation.objects.filter(pk=reservation_id).update(fecha_vencimiento=self.today-timedelta(days=1))
        self.assertEqual(self.client.get('/api/reservations/?estado=activa').data, [])
        response = self.client.get('/api/reservations/?estado=vencida')
        self.assertEqual(response.data[0]['id'], reservation_id)
        self.assertEqual(self.admin.patch(f'/api/reservations/{reservation_id}/retirar/').status_code, 400)
        self.assertEqual(self.client.patch(f'/api/reservations/{reservation_id}/cancelar/').status_code, 400)

    def test_deadline_is_inclusive_in_argentina_local_date(self):
        response = self.reserve(fechaVencimiento=str(self.today))
        self.assertEqual(self.admin.patch(f"/api/reservations/{response.data['id']}/retirar/").status_code, 200)
        loan = Loan.objects.get()
        loan.fecha_vencimiento = self.today
        loan.save()
        services.refresh_states()
        loan.refresh_from_db()
        self.assertEqual(loan.estado, 'vigente')

    def test_overdue_loan_can_be_returned_but_not_renewed(self):
        loan_id = self.pickup()
        Loan.objects.filter(pk=loan_id).update(fecha_vencimiento=self.today-timedelta(days=1))
        response = self.client.get('/api/loans/?estado=vencido')
        self.assertEqual(response.data[0]['id'], loan_id)
        self.assertEqual(self.client.patch(f'/api/loans/{loan_id}/solicitar-extension/').status_code, 400)
        self.assertEqual(self.admin.patch(f'/api/loans/{loan_id}/devolver/').status_code, 200)

    def test_renewal_requires_a_pending_request_and_only_changes_deadline(self):
        loan_id = self.pickup()
        approve = f'/api/loans/{loan_id}/aprobar-extension/'
        self.assertEqual(self.admin.patch(approve).status_code, 400)
        self.assertEqual(self.other_client.patch(f'/api/loans/{loan_id}/solicitar-extension/').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/loans/{loan_id}/solicitar-extension/').status_code, 200)
        self.assertEqual(self.client.patch(approve).status_code, 403)
        response = self.admin.patch(approve)
        self.assertEqual(response.data['estado'], 'vigente')
        self.assertEqual(response.data['fechaVencimiento'], str(self.today+timedelta(days=16)))
        self.assertEqual(response.data['fechaInicio'], str(self.today))
        self.assertIsNone(response.data['fechaDevolucion'])
        self.assertEqual(self.admin.patch(approve).status_code, 400)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 0)

    def test_denied_extension_does_not_change_deadline(self):
        loan_id = self.pickup()
        self.client.patch(f'/api/loans/{loan_id}/solicitar-extension/')
        response = self.admin.patch(f'/api/loans/{loan_id}/denegar-extension/')
        self.assertEqual(response.data['extensionEstado'], 'denegada')
        self.assertEqual(response.data['fechaVencimiento'], str(self.today+timedelta(days=9)))

    def test_priority_requires_librarian_and_controls_delivery_queue(self):
        first = self.reserve().data['id']
        second = self.reserve(self.other_client).data['id']
        url = f'/api/reservations/{second}/priorizar/'
        self.assertEqual(self.client.patch(url, {'prioridad': 9}, format='json').status_code, 403)
        for value in [-1, 32768, 'bad']:
            self.assertEqual(self.admin.patch(url, {'prioridad': value}, format='json').status_code, 400)
        self.assertEqual(self.admin.patch(url, {'prioridad': 9}, format='json').status_code, 200)
        self.assertEqual(self.admin.patch(f'/api/reservations/{first}/retirar/').status_code, 400)
        self.assertEqual(self.admin.patch(f'/api/reservations/{second}/retirar/').status_code, 200)
        self.assertEqual(Loan.objects.count(), 1)

    def test_fifo_and_multiple_copies(self):
        first = self.reserve().data['id']
        second = self.reserve(self.other_client).data['id']
        self.assertEqual(self.admin.patch(f'/api/reservations/{second}/retirar/').status_code, 400)
        self.book.disponibles = 2
        self.book.save()
        self.assertEqual(self.admin.patch(f'/api/reservations/{second}/retirar/').status_code, 200)
        self.assertEqual(self.admin.patch(f'/api/reservations/{first}/retirar/').status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 0)

    def test_lifecycle_cannot_be_bypassed_with_crud(self):
        loan_id = self.pickup()
        reservation = Reservation.objects.get()
        for client in [self.client, self.admin]:
            self.assertEqual(client.post('/api/loans/', {}, format='json').status_code, 405)
            self.assertEqual(client.patch(f'/api/loans/{loan_id}/', {'estado': 'devuelto'}).status_code, 405)
            self.assertEqual(client.delete(f'/api/loans/{loan_id}/').status_code, 405)
            self.assertEqual(client.patch(f'/api/reservations/{reservation.id}/', {'estado': 'activa'}).status_code, 405)
            self.assertEqual(client.delete(f'/api/reservations/{reservation.id}/').status_code, 405)

    def test_lists_and_exports_respect_ownership_and_dates(self):
        loan_id = self.pickup()
        self.admin.patch(f'/api/loans/{loan_id}/devolver/')
        self.assertEqual(self.other_client.get('/api/loans/').data, [])
        self.assertEqual(self.other_client.get('/api/reservations/').data, [])
        pdf = self.client.get('/api/loans/export/pdf/')
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b'%PDF'))
        excel = self.client.get('/api/loans/export/excel/')
        self.assertEqual(excel.status_code, 200)
        from io import BytesIO
        from openpyxl import load_workbook
        rows = list(load_workbook(BytesIO(excel.content)).active.values)
        self.assertEqual(rows[0][-2:], ('Fecha vencimiento', 'Fecha devolución'))
        self.assertEqual(rows[1][-1], str(self.today))

    def test_invalid_lifecycle_filters_are_rejected(self):
        self.assertEqual(self.client.get('/api/loans/?estado=porVencer').status_code, 400)
        self.assertEqual(self.client.get('/api/reservations/?estado=aprobada').status_code, 400)

    def test_book_writes_and_profiles_cannot_escalate_roles(self):
        self.assertEqual(self.client.patch(f'/api/books/{self.book.pk}/', {'estado': 'inactivo'}).status_code, 403)
        self.assertEqual(self.admin.patch(f'/api/books/{self.book.pk}/', {'estado': 'inactivo'}).status_code, 200)
        self.client.patch(f'/api/users/{self.student.pk}/', {'categoria': 'bibliotecario'})
        self.student.refresh_from_db()
        self.assertEqual(self.student.categoria, 'usuario')
        self.assertEqual(self.client.get(f'/api/users/{self.other.pk}/').status_code, 404)
        response = APIClient().post('/api/users/register/', {'nombreApellido': 'New User', 'email': 'new@example.test',
            'legajo': 'NEW', 'contrasena': 'password123', 'categoria': 'bibliotecario'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(User.objects.get(legajo='NEW').categoria, 'usuario')

    def test_history_is_protected_and_book_states_are_validated(self):
        self.pickup()
        self.assertEqual(self.admin.delete(f'/api/books/{self.book.pk}/').status_code, 400)
        self.assertEqual(self.admin.delete(f'/api/users/{self.student.pk}/').status_code, 400)
        self.assertEqual(self.admin.patch(f'/api/books/{self.book.pk}/', {'estado': 'unknown'}).status_code, 400)
        self.assertEqual(self.client.post('/api/categories/', {'nombre': 'tampered'}).status_code, 403)

    def test_anonymous_users_cannot_create_reservations(self):
        self.assertEqual(self.reserve(APIClient()).status_code, 401)


@skipUnless(connection.vendor == 'mysql', 'Requires MySQL row locks; SQLite is not a concurrency proof.')
class ConcurrentPickupTests(TransactionTestCase):
    def test_two_simultaneous_pickups_consume_one_copy_once(self):
        today = timezone.localdate()
        student = User.objects.create_user(username='concurrent-student')
        librarian = User.objects.create_user(username='concurrent-librarian', categoria='bibliotecario')
        book = Book.objects.create(titulo='Concurrent', categoria='sistemas', disponibles=1)
        reservation = Reservation.objects.create(estudiante=student, libro=book,
            fecha_vencimiento=today, fecha_devolucion_prevista=today+timedelta(days=7))
        barrier = Barrier(2)

        def deliver():
            close_old_connections()
            try:
                current = Reservation.objects.get(pk=reservation.pk)
                actor = User.objects.get(pk=librarian.pk)
                barrier.wait(timeout=10)
                return services.pick_up(current, actor).prestamo_id
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(deliver) for _ in range(2)]
            ids = [future.result(timeout=20) for future in futures]
        self.assertEqual(ids[0], ids[1])
        self.assertEqual(Loan.objects.count(), 1)
        book.refresh_from_db()
        self.assertEqual(book.disponibles, 0)
