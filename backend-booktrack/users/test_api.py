import base64
import json

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from books.testing import make_book
from loans.models import Prestamo
from .models import Bibliotecario, Usuario, find_persona
from .testing import make_user


def jwt_payload(token):
    part = token.split('.')[1]
    return json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))


class RegisterTests(TestCase):
    url = '/api/users/register/'

    def payload(self, **over):
        return {'nombreApellido': 'Ana Gómez', 'email': 'ana@utn.edu', 'legajo': '20001', 'contrasena': 'secreto1', **over}

    def test_public_registration_creates_a_regular_user_with_hashed_password(self):
        response = APIClient().post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('contrasena', response.data)
        user = Usuario.objects.get(pk='20001')
        self.assertEqual((user.legajo, user.categoria, user.nombre_apellido), ('20001', 'usuario', 'Ana Gómez'))
        self.assertEqual((user.nombre, user.apellido), ('Ana', 'Gómez'))
        self.assertFalse(Bibliotecario.objects.filter(pk='20001').exists())
        self.assertNotEqual(user.password, 'secreto1')
        self.assertTrue(user.check_password('secreto1'))

    def test_registration_cannot_choose_the_role(self):
        APIClient().post(self.url, self.payload(categoria='bibliotecario'), format='json')
        self.assertEqual(find_persona('20001').categoria, 'usuario')

    def test_short_password_and_duplicate_legajo_are_rejected(self):
        self.assertEqual(APIClient().post(self.url, self.payload(contrasena='abc'), format='json').status_code, 400)
        self.assertEqual(APIClient().post(self.url, self.payload(), format='json').status_code, 201)
        self.assertEqual(APIClient().post(self.url, self.payload(email='otro@utn.edu'), format='json').status_code, 400)

    def test_required_fields(self):
        response = APIClient().post(self.url, {'legajo': '1'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('nombreApellido', response.data)


class LegajoTests(TestCase):
    def test_the_legajo_is_unique_across_users_and_librarians(self):
        make_user('555', 'bibliotecario')
        response = APIClient().post('/api/users/register/', {'nombreApellido': 'Ana Gómez', 'legajo': '555', 'contrasena': 'secreto1'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('legajo', response.data)
        self.assertEqual(Usuario.objects.count(), 0)

    def test_each_role_lives_in_its_own_table_and_logs_in_with_the_legajo(self):
        make_user('L-1', 'bibliotecario', nombre='Franco', apellido='Perez')
        make_user('U-1', nombre='Pedro', apellido='Rodriguez')
        self.assertEqual((Bibliotecario.objects.count(), Usuario.objects.count()), (1, 1))
        for legajo, rol in [('L-1', 'bibliotecario'), ('U-1', 'usuario')]:
            response = APIClient().post('/api/users/login/', {'legajoOEmail': legajo, 'contrasena': 'clave-segura'}, format='json')
            self.assertEqual((response.status_code, response.data['user']['categoria'], response.data['user']['id']), (200, rol, legajo))
            self.assertEqual(jwt_payload(response.data['token'])['user_id'], legajo)

    def test_a_token_only_works_for_the_table_of_its_role(self):
        make_user('777', nombre='Solo usuario')
        token = APIClient().post('/api/users/login/', {'legajoOEmail': '777', 'contrasena': 'clave-segura'}, format='json').data['token']
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(client.get('/api/users/me/').data['categoria'], 'usuario')
        Usuario.objects.filter(pk='777').delete()
        self.assertEqual(client.get('/api/users/me/').status_code, 401)  # ya no existe esa persona


class LoginTests(TestCase):
    url = '/api/users/login/'

    def setUp(self):
        self.user = make_user('13885', email='alumno@utn.edu', nombre='Pedro')
        self.librarian = make_user('12473', 'bibliotecario')

    def login(self, who, password='clave-segura'):
        return APIClient().post(self.url, {'legajoOEmail': who, 'contrasena': password}, format='json')

    def test_login_with_legajo_returns_token_and_profile(self):
        response = self.login('13885')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['legajo'], '13885')
        self.assertEqual(response.data['user']['nombreApellido'], 'Pedro')
        self.assertNotIn('password', response.data['user'])

    def test_login_with_email(self):
        self.assertEqual(self.login('alumno@utn.edu').status_code, 200)

    def test_token_carries_the_role_and_works_on_protected_routes(self):
        token = self.login('12473').data['token']
        self.assertEqual(jwt_payload(token)['categoria'], 'bibliotecario')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(client.get('/api/users/').status_code, 200)

    def test_wrong_password_only_flags_the_password(self):
        response = self.login('13885', 'incorrecta')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['campos'], ['contrasena'])

    def test_unknown_user_flags_both_fields(self):
        response = self.login('nadie')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['campos'], ['legajoOEmail', 'contrasena'])

    def test_inactive_user_cannot_log_in(self):
        Usuario.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertEqual(self.login('13885').status_code, 400)

    def test_invalid_or_missing_token_is_unauthorized(self):
        self.assertEqual(APIClient().get('/api/users/me/').status_code, 401)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer basura')
        self.assertEqual(client.get('/api/users/me/').status_code, 401)


class UserAccessTests(TestCase):
    def setUp(self):
        self.student = make_user('s1')
        self.other = make_user('s2')
        self.librarian = make_user('l1', 'bibliotecario')
        self.c_student = APIClient(); self.c_student.force_authenticate(self.student)
        self.c_lib = APIClient(); self.c_lib.force_authenticate(self.librarian)

    def test_me_returns_and_updates_only_the_own_profile(self):
        self.assertEqual(self.c_student.get('/api/users/me/').data['id'], self.student.pk)
        response = self.c_student.patch('/api/users/me/', {'nombreApellido': 'Nuevo Nombre'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.nombre_apellido, 'Nuevo Nombre')

    def test_user_list_is_librarian_only(self):
        self.assertEqual(APIClient().get('/api/users/').status_code, 401)
        self.assertEqual(self.c_student.get('/api/users/').status_code, 403)
        response = self.c_lib.get('/api/users/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

    def test_a_user_cannot_read_or_edit_someone_else(self):
        self.assertEqual(self.c_student.get(f'/api/users/{self.other.pk}/').status_code, 404)
        self.assertEqual(self.c_student.patch(f'/api/users/{self.other.pk}/', {'nombreApellido': 'x'}, format='json').status_code, 404)
        self.assertEqual(self.c_lib.get(f'/api/users/{self.other.pk}/').status_code, 200)

    def test_role_cannot_be_changed_through_the_api_even_by_a_librarian(self):
        self.c_student.patch('/api/users/me/', {'categoria': 'bibliotecario'}, format='json')
        self.c_lib.patch(f'/api/users/{self.other.pk}/', {'categoria': 'bibliotecario'}, format='json')
        self.student.refresh_from_db(); self.other.refresh_from_db()
        self.assertEqual((self.student.categoria, self.other.categoria), ('usuario', 'usuario'))

    def test_user_with_history_cannot_be_deleted_but_a_clean_one_can(self):
        book = make_book('L')
        Prestamo.objects.create(usuario=self.other, ejemplar=book.ejemplares.get(), fecha_prestamo=timezone.localdate())
        response = self.c_lib.delete(f'/api/users/{self.other.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Usuario.objects.filter(pk=self.other.pk).exists())
        self.assertEqual(self.c_lib.delete(f'/api/users/{self.student.pk}/').status_code, 204)
        self.assertFalse(Usuario.objects.filter(pk=self.student.pk).exists())
