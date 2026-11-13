from django.test import TestCase
from rest_framework.test import APIClient

from .testing import make_user


class ProfileImageTests(TestCase):
    def test_user_cannot_replace_profile_image_but_can_update_email(self):
        original_image = 'data:image/png;base64,b3JpZ2luYWw='
        user = make_user('PROFILE-1', imagen=original_image)
        client = APIClient()
        client.force_authenticate(user)
        image = 'data:image/png;base64,iVBORw0KGgo='

        for index, url in enumerate(['/api/users/me/', f'/api/users/{user.pk}/']):
            with self.subTest(url=url):
                email = f'actualizado{index}@example.test'
                response = client.patch(url, {'imagen': image, 'email': email}, format='json')

                self.assertEqual(response.status_code, 200, response.data)
                user.refresh_from_db()
                self.assertEqual(user.imagen, original_image)
                self.assertEqual(response.data['imagen'], original_image)
                self.assertEqual(user.email, email)

    def test_librarian_profile_accepts_data_uri_image(self):
        librarian = make_user('LIB-PROFILE-1', 'bibliotecario')
        client = APIClient()
        client.force_authenticate(librarian)
        images = ['data:image/png;base64,iVBORw0KGgo=', 'data:image/png;base64,b3RyYQ==']

        for url, image in zip(['/api/users/me/', f'/api/users/{librarian.pk}/'], images):
            with self.subTest(url=url):
                response = client.patch(url, {'imagen': image}, format='json')

                self.assertEqual(response.status_code, 200, response.data)
                librarian.refresh_from_db()
                self.assertEqual(librarian.imagen, image)
                self.assertEqual(response.data['imagen'], image)


class NivelPrivilegiosTests(TestCase):
    def test_nivel_define_la_categoria_y_el_login_la_devuelve(self):
        for rol, nivel in [('usuario', 0), ('bibliotecario', 1), ('admin', 2)]:
            with self.subTest(rol=rol):
                person = make_user(f'NIVEL-{nivel}', rol, password='clave-segura')
                self.assertEqual((person.nivel, person.categoria), (nivel, rol))
                data = APIClient().post('/api/users/login/', {'legajoOEmail': person.pk, 'contrasena': 'clave-segura'}, format='json').data
                self.assertEqual((data['user']['nivel'], data['user']['categoria']), (nivel, rol))

    def test_token_de_admin_autentica_y_la_base_rechaza_niveles_invalidos(self):
        from django.db import IntegrityError, transaction
        from .models import Administrador, Bibliotecario, Usuario
        make_user('NIVEL-ADM', 'admin', password='clave-segura')
        token = APIClient().post('/api/users/login/', {'legajoOEmail': 'NIVEL-ADM', 'contrasena': 'clave-segura'}, format='json').data['token']
        client = APIClient(); client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(client.get('/api/users/me/').data['categoria'], 'admin')
        for model, nivel in [(Usuario, 1), (Bibliotecario, 0), (Bibliotecario, 2), (Administrador, 1)]:
            with self.assertRaises(IntegrityError), transaction.atomic():
                model.objects.create(id=f'BAD-{model.__name__}-{nivel}', nivel=nivel)


class LibrarianManagementTests(TestCase):
    def setUp(self):
        self.admin = APIClient(); self.admin.force_authenticate(make_user('ADM-L', 'admin'))
        self.lib = make_user('LIB-L', 'bibliotecario', nombre='Mariana', apellido='López')

    def test_solo_el_admin_accede(self):
        for rol in ['usuario', 'bibliotecario']:
            c = APIClient(); c.force_authenticate(make_user(f'X-{rol}', rol))
            self.assertEqual(c.get('/api/librarians/').status_code, 403)
        self.assertEqual(APIClient().get('/api/librarians/').status_code, 401)

    def test_lista_crea_edita_y_desactiva(self):
        data = self.admin.get('/api/librarians/').data
        self.assertEqual([b['legajo'] for b in data], ['LIB-L'])  # ni admin ni usuarios
        self.assertEqual(data[0]['nombreApellido'], 'Mariana López')
        r = self.admin.post('/api/librarians/', {'legajo': 'LIB-N', 'nombreApellido': 'Juan Paz', 'email': 'j@x.com', 'contrasena': 'abcdef'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        dup = self.admin.post('/api/librarians/', {'legajo': 'ADM-L', 'nombreApellido': 'X', 'contrasena': 'abcdef'}, format='json')
        self.assertEqual(dup.status_code, 400)
        r = self.admin.patch('/api/librarians/LIB-N/', {'activo': False, 'email': 'nuevo@x.com'}, format='json')
        self.assertEqual((r.data['activo'], r.data['email']), (False, 'nuevo@x.com'))
        login = APIClient().post('/api/users/login/', {'legajoOEmail': 'LIB-N', 'contrasena': 'abcdef'}, format='json')
        self.assertEqual(login.status_code, 400)
        self.assertEqual(self.admin.patch('/api/librarians/ADM-L/', {'activo': False}, format='json').status_code, 404)
        self.assertEqual(self.admin.get('/api/librarians/LIB-L/activity/').data, [])
