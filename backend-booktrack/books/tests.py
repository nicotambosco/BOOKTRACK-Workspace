from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from categories.models import Category
from comments.models import Comment
from loans.models import Loan
from users.models import User
from .models import Book


def book_payload(**over):
    return {'titulo': 'Cálculo', 'autor': 'Stewart', 'editorial': 'Cengage', 'fechaPublicacion': '2015',
            'descripcion': '', 'nroCodigo': 'C-1', 'nroInventario': 'INV-1', 'categoria': 'Basicas',
            'anio': 1, 'disponibles': 3, 'tipo': 'libro base', **over}


class BookApiTests(TestCase):
    def setUp(self):
        Book.objects.all().delete()  # las migraciones cargan el catálogo inicial; cada test parte de una tabla vacía
        self.student = User.objects.create_user(username='s', password='x', legajo='s')
        self.librarian = User.objects.create_user(username='l', password='x', legajo='l', categoria='bibliotecario')
        self.c_student = APIClient(); self.c_student.force_authenticate(self.student)
        self.c_lib = APIClient(); self.c_lib.force_authenticate(self.librarian)

    def test_catalog_is_public_and_ordered_by_year_then_title(self):
        Book.objects.create(titulo='B', categoria='Basicas', anio=2)
        Book.objects.create(titulo='Z', categoria='Basicas', anio=1)
        Book.objects.create(titulo='A', categoria='Basicas', anio=2)
        response = APIClient().get('/api/books/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([b['titulo'] for b in response.data], ['Z', 'A', 'B'])

    def test_search_by_title_and_filter_by_category(self):
        Book.objects.create(titulo='Álgebra Lineal', categoria='Basicas')
        Book.objects.create(titulo='Redes de Datos', categoria='Sistemas')
        client = APIClient()
        self.assertEqual([b['titulo'] for b in client.get('/api/books/?q=redes').data], ['Redes de Datos'])
        self.assertEqual([b['titulo'] for b in client.get('/api/books/?categoria=Basicas').data], ['Álgebra Lineal'])
        self.assertEqual(client.get('/api/books/?q=zzz').data, [])

    def test_response_uses_camel_case_names(self):
        book = Book.objects.create(titulo='T', categoria='Basicas', fecha_publicacion='2001', nro_codigo='N', nro_inventario='I')
        data = APIClient().get(f'/api/books/{book.pk}/').data
        self.assertEqual((data['fechaPublicacion'], data['nroCodigo'], data['nroInventario']), ('2001', 'N', 'I'))
        self.assertEqual(data['estado'], 'activo')

    def test_only_librarians_can_write(self):
        self.assertEqual(APIClient().post('/api/books/', book_payload(), format='json').status_code, 401)
        self.assertEqual(self.c_student.post('/api/books/', book_payload(), format='json').status_code, 403)
        response = self.c_lib.post('/api/books/', book_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Book.objects.get(pk=response.data['id']).disponibles, 3)

    def test_blank_inventory_number_is_stored_as_null_so_it_can_repeat(self):
        for title in ('Uno', 'Dos'):
            response = self.c_lib.post('/api/books/', book_payload(titulo=title, nroInventario=''), format='json')
            self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Book.objects.filter(nro_inventario__isnull=True).count(), 2)

    def test_inventory_number_must_be_unique(self):
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(), format='json').status_code, 201)
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(titulo='Otro'), format='json').status_code, 400)

    def test_required_fields_and_invalid_choices(self):
        self.assertEqual(self.c_lib.post('/api/books/', {'autor': 'x'}, format='json').status_code, 400)
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(estado='roto'), format='json').status_code, 400)
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(tipo='otro'), format='json').status_code, 400)

    def test_update_and_deactivate(self):
        book = Book.objects.create(titulo='T', categoria='Basicas', disponibles=1)
        response = self.c_lib.put(f'/api/books/{book.pk}/', book_payload(nroInventario='X', estado='inactivo', disponibles=7), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        book.refresh_from_db()
        self.assertEqual((book.estado, book.disponibles), ('inactivo', 7))
        self.assertEqual(self.c_student.put(f'/api/books/{book.pk}/', book_payload(), format='json').status_code, 403)

    def test_negative_stock_is_rejected(self):
        self.assertEqual(self.c_lib.post('/api/books/', book_payload(disponibles=-1), format='json').status_code, 400)

    def test_book_with_history_cannot_be_deleted_but_a_clean_one_can(self):
        used = Book.objects.create(titulo='Usado', categoria='Basicas')
        Loan.objects.create(estudiante=self.student, libro=used, fecha_inicio=timezone.localdate())
        clean = Book.objects.create(titulo='Limpio', categoria='Basicas')
        self.assertEqual(self.c_lib.delete(f'/api/books/{used.pk}/').status_code, 400)
        self.assertTrue(Book.objects.filter(pk=used.pk).exists())
        self.assertEqual(self.c_lib.delete(f'/api/books/{clean.pk}/').status_code, 204)
        self.assertEqual(self.c_student.delete(f'/api/books/{used.pk}/').status_code, 403)


class CoverUploadTests(TestCase):
    url = '/api/books/upload-image/'

    def setUp(self):
        self.librarian = User.objects.create_user(username='l', password='x', legajo='l', categoria='bibliotecario')
        self.student = User.objects.create_user(username='s', password='x', legajo='s')
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


class CategoryApiTests(TestCase):
    def setUp(self):
        Category.objects.all().delete()  # las migraciones cargan las categorías iniciales
        self.librarian = User.objects.create_user(username='l', password='x', legajo='l', categoria='bibliotecario')
        self.student = User.objects.create_user(username='s', password='x', legajo='s')
        self.c_lib = APIClient(); self.c_lib.force_authenticate(self.librarian)
        self.c_student = APIClient(); self.c_student.force_authenticate(self.student)

    def test_public_list_is_sorted_by_name(self):
        Category.objects.create(nombre='Sistemas'); Category.objects.create(nombre='Basicas')
        response = APIClient().get('/api/categories/')
        self.assertEqual([c['nombre'] for c in response.data], ['Basicas', 'Sistemas'])

    def test_only_librarians_create_and_rename(self):
        self.assertEqual(self.c_student.post('/api/categories/', {'nombre': 'X'}, format='json').status_code, 403)
        self.assertEqual(APIClient().post('/api/categories/', {'nombre': 'X'}, format='json').status_code, 401)
        created = self.c_lib.post('/api/categories/', {'nombre': 'Civil'}, format='json')
        self.assertEqual(created.status_code, 201)
        renamed = self.c_lib.patch(f"/api/categories/{created.data['id']}/", {'nombre': 'Civiles'}, format='json')
        self.assertEqual((renamed.status_code, renamed.data['nombre']), (200, 'Civiles'))

    def test_names_are_unique(self):
        Category.objects.create(nombre='Quimica')
        self.assertEqual(self.c_lib.post('/api/categories/', {'nombre': 'Quimica'}, format='json').status_code, 400)


class CommentApiTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='s', password='x', legajo='s')

    def test_authenticated_user_can_comment_and_is_recorded(self):
        client = APIClient(); client.force_authenticate(self.student)
        response = client.post('/api/comments/', {'seccion': 'Catálogo', 'comentario': 'Falta un libro'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        comment = Comment.objects.get()
        self.assertEqual((comment.user, comment.seccion), (self.student, 'Catálogo'))
        self.assertNotIn('user', response.data)

    def test_anonymous_cannot_comment_and_fields_are_required(self):
        self.assertEqual(APIClient().post('/api/comments/', {'seccion': 'a', 'comentario': 'b'}, format='json').status_code, 401)
        client = APIClient(); client.force_authenticate(self.student)
        self.assertEqual(client.post('/api/comments/', {'seccion': 'a'}, format='json').status_code, 400)
        self.assertEqual(Comment.objects.count(), 0)

    def test_comments_cannot_be_listed_through_the_api(self):
        client = APIClient(); client.force_authenticate(self.student)
        self.assertEqual(client.get('/api/comments/').status_code, 405)

    def test_deleting_the_author_keeps_the_comment(self):
        Comment.objects.create(user=self.student, seccion='a', comentario='b')
        self.student.delete()
        self.assertIsNone(Comment.objects.get().user)


class InventoryNumberUpdateTests(TestCase):
    def test_a_book_can_keep_its_own_inventory_number_on_update(self):
        librarian = User.objects.create_user(username='l', password='x', legajo='l', categoria='bibliotecario')
        client = APIClient(); client.force_authenticate(librarian)
        book = Book.objects.create(titulo='T', categoria='Basicas', nro_inventario='INV-9')
        response = client.put(f'/api/books/{book.pk}/', book_payload(nroInventario='INV-9', titulo='Nuevo'), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        other = Book.objects.create(titulo='O', categoria='Basicas', nro_inventario='INV-10')
        response = client.put(f'/api/books/{other.pk}/', book_payload(nroInventario='INV-9'), format='json')
        self.assertEqual(response.status_code, 400)
