from django.test import TestCase
from rest_framework.test import APIClient

from books.models import Book
from users.models import User
from .models import Loan


class LoanFlowTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student-test', password='test-pass', legajo='STUDENT-1')
        self.librarian = User.objects.create_user(
            username='librarian-test', password='test-pass', legajo='LIBRARIAN-1', categoria='bibliotecario'
        )
        self.book = Book.objects.create(titulo='Libro de prueba', categoria='sistemas', disponibles=1)
        self.student_client = APIClient()
        self.student_client.force_authenticate(self.student)
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.librarian)

    def test_loan_flow_preserves_dates_filters_pending_and_updates_stock(self):
        response = self.student_client.post('/api/loans/', {
            'libroId': self.book.id,
            'tipoPrestamo': 'normal',
            'fechaInicio': '2026-09-25',
            'fechaFin': '2026-10-02',
            'plazoDeSolicitud': '2026-09-25 a 2026-10-02',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['fechaInicio'], '2026-09-25')
        self.assertEqual(response.data['fechaFin'], '2026-10-02')
        loan_id = response.data['id']
        Loan.objects.create(
            estudiante=self.student, libro=self.book, tipo_prestamo='normal', estado='denegado'
        )

        pending = self.admin_client.get('/api/loans/?estado=pendiente')
        self.assertEqual([loan['id'] for loan in pending.data], [loan_id])

        self.assertEqual(self.admin_client.patch(f'/api/loans/{loan_id}/aprobar/').status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 0)

        self.admin_client.patch(f'/api/loans/{loan_id}/aprobar/')
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 0)

        self.assertEqual(self.admin_client.patch(f'/api/loans/{loan_id}/devolver/').status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual(self.book.disponibles, 1)

    def test_cannot_approve_when_no_copies_are_available(self):
        self.book.disponibles = 0
        self.book.save(update_fields=['disponibles'])
        loan = Loan.objects.create(estudiante=self.student, libro=self.book, tipo_prestamo='normal')

        response = self.admin_client.patch(f'/api/loans/{loan.id}/aprobar/')

        self.assertEqual(response.status_code, 400)
        loan.refresh_from_db()
        self.assertEqual(loan.estado, 'pendiente')
