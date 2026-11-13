from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from loans.models import Prestamo, Reserva, AccionAdministrativa
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

    def test_update_deactivate_does_not_allow_overwriting_available_count(self):
        book = make_book('T', disponibles=1)
        response = self.c_lib.put(f'/api/books/{book.pk}/', book_payload(estado='inactivo', disponibles=7), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        book.refresh_from_db()
        self.assertEqual((book.estado, stock(book)), ('inactivo', 1))
        self.assertEqual(book.pk, book.isbn)  # el ISBN de la URL no se pisa con el del cuerpo
        self.c_lib.patch(f'/api/books/{book.pk}/', {'disponibles': 2}, format='json')
        self.assertEqual((stock(book), book.ejemplares.count(), book.ejemplares.filter(estado='baja').count()), (1, 1, 0))
        self.assertEqual(self.c_student.put(f'/api/books/{book.pk}/', book_payload(), format='json').status_code, 403)

    def test_lowering_stock_never_touches_lent_copies(self):
        book = make_book('T', disponibles=2)
        lent = book.ejemplares.first()
        Ejemplar.objects.filter(pk=lent.pk).update(estado='prestado')
        self.c_lib.patch(f'/api/books/{book.pk}/', {'disponibles': 0}, format='json')
        lent.refresh_from_db()
        self.assertEqual((lent.estado, stock(book)), ('prestado', 1))

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

    def test_copy_observations_are_saved_without_changing_stock_and_appear_in_catalog(self):
        copy = self.book.ejemplares.get()
        url = f'/api/copies/{copy.pk}/'
        self.assertEqual(self.c_student.patch(url, {'observaciones': 'Cambio'}).status_code, 403)
        response = self.c_lib.patch(url, {'observaciones': 'Tapa dañada. Páginas subrayadas.'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        copy.refresh_from_db()
        self.assertEqual(copy.estado, 'disponible')
        self.assertEqual(stock(self.book), 1)
        book = self.c_lib.get(f'/api/books/{self.book.pk}/').data
        self.assertEqual(book['ejemplares'][0]['observaciones'], 'Tapa dañada. Páginas subrayadas.')
        self.assertEqual(self.c_lib.patch(url, {'observaciones': ''}).data['observaciones'], '')

    def test_add_copy_generates_unique_codes_and_updates_count(self):
        url = f'/api/books/{self.book.pk}/ejemplares/'
        self.assertEqual(self.c_student.post(url).status_code, 403)
        first = self.c_lib.post(url)
        second = self.c_lib.post(url)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 201, second.data)
        self.assertNotEqual(first.data['id'], second.data['id'])
        self.assertEqual(stock(self.book), 3)
        self.assertEqual(AccionAdministrativa.objects.filter(tipo_accion='alta_ejemplar').count(), 2)

    def test_rename_lent_copy_preserves_history_notes_and_return(self):
        copy = self.book.ejemplares.get()
        copy.estado = 'prestado'
        copy.observaciones = 'Tapa dañada'
        copy.save()
        old = copy.pk
        loan = Prestamo.objects.create(usuario=self.student, ejemplar=copy)
        reservation = Reserva.objects.create(usuario=self.student, libro=self.book, fecha_retiro=timezone.localdate(),
            fecha_vencimiento=timezone.localdate(), estado='finalizada', prestamo=loan)
        log = AccionAdministrativa.objects.create(tipo_accion='retiro_reserva', ejemplar=copy, prestamo=loan, reserva=reservation)
        response = self.c_lib.patch(f'/api/copies/{old}/codigo/', {'nuevoCodigo': 'EJ-CUSTOM-001'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(Ejemplar.objects.filter(pk=old).exists())
        self.assertEqual(response.data['observaciones'], 'Tapa dañada')
        self.assertEqual(response.data['estado'], 'prestado')
        loan.refresh_from_db(); log.refresh_from_db(); reservation.refresh_from_db()
        self.assertEqual((loan.ejemplar_id, log.ejemplar_id), ('EJ-CUSTOM-001', 'EJ-CUSTOM-001'))
        self.assertEqual(reservation.prestamo_id, loan.pk)
        self.assertEqual(stock(self.book), 0)
        self.assertEqual(self.c_lib.patch(f'/api/loans/{loan.pk}/devolver/').status_code, 200)
        self.assertEqual(stock(self.book), 1)
        self.assertEqual(self.c_lib.get(f'/api/books/{self.book.pk}/').data['ejemplares'][0]['id'], 'EJ-CUSTOM-001')

    def test_rename_rejects_duplicates_invalid_codes_and_direct_pk_update(self):
        copy = self.book.ejemplares.get()
        other = make_book('Otro').ejemplares.get()
        initial_count = Ejemplar.objects.count()
        url = f'/api/copies/{copy.pk}/codigo/'
        self.assertEqual(self.c_student.patch(url, {'nuevoCodigo': 'NO'}).status_code, 403)
        for code in [other.pk, '', 'bad/code', 'x'*51]:
            response = self.c_lib.patch(url, {'nuevoCodigo': code}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
            self.assertTrue(Ejemplar.objects.filter(pk=copy.pk).exists())
        self.assertEqual(self.c_lib.patch(f'/api/copies/{copy.pk}/', {'id': 'DIRECT'}).status_code, 400)
        self.assertEqual(Ejemplar.objects.count(), initial_count)

    def test_deleting_clean_copy_preserves_book_and_logs_the_operation(self):
        copy = self.book.ejemplares.get()
        code = copy.pk
        self.assertEqual(self.c_student.delete(f'/api/copies/{code}/').status_code, 403)
        self.assertEqual(self.c_lib.delete(f'/api/copies/{code}/').status_code, 204)
        self.assertTrue(Libro.objects.filter(pk=self.book.pk).exists())
        self.assertEqual(stock(self.book), 0)
        action = AccionAdministrativa.objects.get(tipo_accion='eliminacion_ejemplar')
        self.assertEqual(action.bibliotecario_id, self.librarian.pk)
        self.assertEqual(action.libro_id, self.book.pk)
        self.assertIn(code, action.descripcion)

    def test_a_copy_with_loans_cannot_be_deleted(self):
        copy = self.book.ejemplares.get()
        Prestamo.objects.create(usuario=self.student, ejemplar=copy)
        response = self.c_lib.delete(f'/api/copies/{copy.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('tiene préstamos registrados', str(response.data))


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
