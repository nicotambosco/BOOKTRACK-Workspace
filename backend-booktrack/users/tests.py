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


class RoleAssignmentTests(TestCase):
    def setUp(self):
        self.admin = make_user('ADM-R', 'admin')
        self.c = APIClient(); self.c.force_authenticate(self.admin)
        self.alumno = make_user('ALU-R', nombre='Ana', apellido='Gómez', email='ana@x.com', password='clave-segura')

    def activas(self, legajo):
        from .models import Administrador, Bibliotecario, Usuario
        return {m.__name__: m.objects.get(pk=legajo).is_active for m in (Usuario, Bibliotecario, Administrador) if m.objects.filter(pk=legajo).exists()}

    def nivel(self, legajo, nivel):
        return self.c.patch(f'/api/roles/{legajo}/', {'nivel': nivel}, format='json')

    def test_ida_y_vuelta_conserva_filas_y_datos(self):
        r = self.nivel('ALU-R', 1)
        self.assertEqual((r.status_code, r.data['categoria']), (200, 'bibliotecario'), r.data)
        self.assertEqual(self.activas('ALU-R'), {'Usuario': False, 'Bibliotecario': True})
        self.assertEqual(self.nivel('ALU-R', 2).data['categoria'], 'admin')
        self.assertEqual(self.activas('ALU-R'), {'Usuario': False, 'Bibliotecario': False, 'Administrador': True})
        self.nivel('ALU-R', 0)
        self.assertEqual(self.activas('ALU-R'), {'Usuario': True, 'Bibliotecario': False, 'Administrador': False})
        login = APIClient().post('/api/users/login/', {'legajoOEmail': 'ana@x.com', 'contrasena': 'clave-segura'}, format='json')
        self.assertEqual((login.status_code, login.data['user']['categoria']), (200, 'usuario'))

    def test_el_bibliotecario_promovido_aparece_una_sola_vez_y_el_viejo_token_cae(self):
        old = APIClient().post('/api/users/login/', {'legajoOEmail': 'ALU-R', 'contrasena': 'clave-segura'}, format='json').data['token']
        self.nivel('ALU-R', 1)
        old_client = APIClient(); old_client.credentials(HTTP_AUTHORIZATION=f'Bearer {old}')
        self.assertEqual(old_client.get('/api/users/me/').status_code, 401)
        self.assertEqual([b['legajo'] for b in self.c.get('/api/librarians/').data], ['ALU-R'])
        self.nivel('ALU-R', 2)
        self.assertEqual(self.c.get('/api/librarians/').data, [])  # la fila vieja no figura como bibliotecario inactivo
        lib = APIClient(); lib.force_authenticate(make_user('LIB-R', 'bibliotecario'))
        self.assertEqual([u['legajo'] for u in lib.get('/api/users/').data], ['LIB-R'])

    def test_reglas(self):
        self.assertEqual(self.nivel('ADM-R', 0).status_code, 400)       # no se cambia el propio rol
        self.assertEqual(self.nivel('ALU-R', 5).status_code, 400)
        self.assertEqual(self.nivel('NOPE', 1).status_code, 404)
        lib = APIClient(); lib.force_authenticate(make_user('LIB-R2', 'bibliotecario'))
        self.assertEqual(lib.patch('/api/roles/ALU-R/', {'nivel': 1}, format='json').status_code, 403)
        self.assertEqual(len(self.c.get('/api/roles/').data), 3)
