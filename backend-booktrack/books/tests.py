from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from loans.models import Prestamo
from users.testing import make_user
from .models import Ejemplar, Libro
from .testing import make_book, stock


def book_payload(**over):
    return {'isbn': '9780000000001', 'titulo': 'Cálculo', 'autor': 'Stewart', 'categoria': 'Basicas',
            'anioPublicacion': 2015, 'resumen': '', 'palabrasClave': 'cálculo, análisis', 'anioCursada': 1,
            'disponibles': 3, **over}


class BookApiTests(TestCase):
    def setUp(self):
        Ejemplar.objects.all().delete()
        Libro.objects.all().delete()  # las migraciones cargan el catálogo inicial; cada test parte de una tabla vacía
        self.student = make_user('s')
        self.librarian = make_user('l', 'bibliotecario')
        self.c_student = APIClient(); self.c_student.force_authenticate(self.student)
        self.c_lib = APIClient(); self.c_lib.force_authenticate(self.librarian)

    def test_catalog_is_public_and_ordered_by_course_year_then_title(self):
        make_book('B', anio_cursada=2); make_book('Z', anio_cursada=1); make_book('A', anio_cursada=2)
        response = APIClient().get('/api/books/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([b['titulo'] for b in response.data], ['Z', 'A', 'B'])

    def test_search_by_title_and_filter_by_category(self):
        make_book('Álgebra Lineal', categoria='Basicas')
        make_book('Redes de Datos', categoria='Sistemas')
        client = APIClient()
        self.assertEqual([b['titulo'] for b in client.get('/api/books/?q=redes').data], ['Redes de Datos'])
        self.assertEqual([b['titulo'] for b in client.get('/api/books/?categoria=Basicas').data], ['Álgebra Lineal'])
        self.assertEqual(client.get('/api/books/?q=zzz').data, [])

    def test_response_follows_the_libro_table_and_counts_copies(self):
        book = make_book('T', disponibles=2, isbn='9781111111111', anio_publicacion=2001, palabras_clave='k', resumen='r')
        data = APIClient().get(f'/api/books/{book.pk}/').data
        self.assertEqual((data['id'], data['isbn'], data['anioPublicacion'], data['palabrasClave'], data['resumen']),
                         ('9781111111111', '9781111111111', 2001, 'k', 'r'))
        self.assertEqual((data['estado'], data['disponibles'], len(data['ejemplares'])), ('activo', 2, 2))
        self.assertEqual(data['ejemplares'][0]['isbn'], '9781111111111')

    def test_only_librarians_can_write_and_creating_generates_the_copies(self):
        self.assertEqual(APIClient().post('/api/books/', book_payload(), format='json').status_code, 401)
        self.assertEqual(self.c_student.post('/api/books/', book_payload(), format='json').status_code, 403)
        response = self.c_lib.post('/api/books/', book_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data['id'], response.data['disponibles']), ('9780000000001', 3))
        book = Libro.objects.get(pk='9780000000001')
        self.assertEqual(sorted(book.ejemplares.values_list('id', flat=True)),
                         ['9780000000001-01', '9780000000001-02', '9780000000001-03'])

    def test_isbn_is_required_and_unique(self):
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(), format='json').status_code, 201)
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(titulo='Otro'), format='json').status_code, 400)
        self.assertEqual(self.c_lib.post('/api/books/', {'titulo': 'Sin ISBN', 'categoria': 'x'}, format='json').status_code, 400)

    def test_required_fields_and_invalid_choices(self):
        self.assertEqual(self.c_lib.post('/api/books/', {'autor': 'x'}, format='json').status_code, 400)
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(estado='roto'), format='json').status_code, 400)

    def test_update_deactivate_and_adjust_stock_without_deleting_copies(self):
        book = make_book('T', disponibles=1)
        response = self.c_lib.put(f'/api/books/{book.pk}/', book_payload(estado='inactivo', disponibles=7), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        book.refresh_from_db()
        self.assertEqual((book.estado, stock(book)), ('inactivo', 7))
        self.assertEqual(book.pk, book.isbn)  # el ISBN de la URL no se pisa con el del cuerpo
        self.c_lib.patch(f'/api/books/{book.pk}/', {'disponibles': 2}, format='json')
        self.assertEqual((stock(book), book.ejemplares.count(), book.ejemplares.filter(estado='baja').count()), (2, 7, 5))
        self.assertEqual(self.c_student.put(f'/api/books/{book.pk}/', book_payload(), format='json').status_code, 403)

    def test_lowering_stock_never_touches_lent_copies(self):
        book = make_book('T', disponibles=2)
        lent = book.ejemplares.first()
        Ejemplar.objects.filter(pk=lent.pk).update(estado='prestado')
        self.c_lib.patch(f'/api/books/{book.pk}/', {'disponibles': 0}, format='json')
        lent.refresh_from_db()
        self.assertEqual((lent.estado, stock(book)), ('prestado', 0))

    def test_negative_stock_is_rejected(self):
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(disponibles=-1), format='json').status_code, 400)

    def test_book_with_history_cannot_be_deleted_but_a_clean_one_can(self):
        used = make_book('Usado')
        Prestamo.objects.create(usuario=self.student, ejemplar=used.ejemplares.get(), fecha_prestamo=timezone.localdate())
        clean = make_book('Limpio', disponibles=2)
        self.assertEqual(self.c_lib.delete(f'/api/books/{used.pk}/').status_code, 400)
        self.assertTrue(Libro.objects.filter(pk=used.pk).exists())
        self.assertEqual(used.ejemplares.count(), 1)
        self.assertEqual(self.c_lib.delete(f'/api/books/{clean.pk}/').status_code, 204)
        self.assertFalse(Ejemplar.objects.filter(libro_id=clean.pk).exists())
        self.assertEqual(self.c_student.delete(f'/api/books/{used.pk}/').status_code, 403)


class CopyApiTests(TestCase):
    def setUp(self):
        self.book = make_book('T', disponibles=1)
        self.librarian = make_user('l', 'bibliotecario')
        self.student = make_user('s')
        self.c_lib = APIClient(); self.c_lib.force_authenticate(self.librarian)
        self.c_student = APIClient(); self.c_student.force_authenticate(self.student)

    def test_copies_are_listed_by_book_and_written_only_by_librarians(self):
        other = make_book('Otro')
        listed = self.c_student.get(f'/api/copies/?isbn={self.book.pk}')
        self.assertEqual([c['isbn'] for c in listed.data], [self.book.pk])
        payload = {'id': 'EXTRA-1', 'isbn': self.book.pk, 'observaciones': 'Tapa dañada'}
        self.assertEqual(self.c_student.post('/api/copies/', payload, format='json').status_code, 403)
        created = self.c_lib.post('/api/copies/', payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual((stock(self.book), stock(other)), (2, 1))
        self.assertEqual(self.c_lib.post('/api/copies/', payload, format='json').status_code, 400)  # código repetido

    def test_a_copy_can_be_written_off_and_stock_follows(self):
        copy = self.book.ejemplares.get()
        response = self.c_lib.patch(f'/api/copies/{copy.pk}/', {'estado': 'baja'}, format='json')
        self.assertEqual((response.status_code, stock(self.book)), (200, 0))
        self.assertEqual(self.c_lib.patch(f'/api/copies/{copy.pk}/', {'estado': 'perdido'}, format='json').status_code, 400)

    def test_a_copy_with_loans_cannot_be_deleted(self):
        copy = self.book.ejemplares.get()
        Prestamo.objects.create(usuario=self.student, ejemplar=copy)
        self.assertEqual(self.c_lib.delete(f'/api/copies/{copy.pk}/').status_code, 400)


class CoverUploadTests(TestCase):
    url = '/api/books/upload-image/'

    def setUp(self):
        self.librarian = make_user('l', 'bibliotecario')
        self.student = make_user('s')
        self.client = APIClient(); self.client.force_authenticate(self.librarian)

    def upload(self, content=b'\x89PNG', name='c.png', ctype='image/png', client=None):
        return (client or self.client).post(self.url, {'file': SimpleUploadedFile(name, content, content_type=ctype)}, format='multipart')

    def test_valid_image_is_returned_as_data_uri(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['url'].startswith('data:image/png;base64,'))

    def test_wrong_type_missing_file_and_oversize_are_rejected(self):
        self.assertEqual(self.upload(ctype='text/plain', name='a.txt').status_code, 400)
        self.assertEqual(self.client.post(self.url, {}, format='multipart').status_code, 400)
        self.assertEqual(self.upload(content=b'0' * (1024 * 1024 + 1)).status_code, 400)

    def test_requires_librarian(self):
        student = APIClient(); student.force_authenticate(self.student)
        self.assertEqual(self.upload(client=student).status_code, 403)
        self.assertEqual(self.upload(client=APIClient()).status_code, 401)
