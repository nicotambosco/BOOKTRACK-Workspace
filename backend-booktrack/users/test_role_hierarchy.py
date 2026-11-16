from django.test import TestCase
from rest_framework.test import APIClient
from .models import Administrador, Bibliotecario, Usuario, asignar_roles
from .testing import make_user
from .test_api import jwt_payload


class RoleHierarchyTests(TestCase):
    def client_for(self, legajo, roles, view=None):
        person = make_user(legajo, roles[0])
        asignar_roles(person, roles)
        client = APIClient()
        login = client.post('/api/users/login/', {'legajoOEmail': legajo, 'contrasena': 'clave-segura'}, format='json')
        self.assertEqual(login.status_code, 200, login.data)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["token"]}')
        if view and login.data['user']['categoria'] != view:
            response = client.post('/api/users/active-role/', {'rol': view}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        return client

    def test_usuario_no_puede_asignarse_roles_ni_quitarse_el_actual(self):
        client = self.client_for('U', ['usuario'])
        for roles in (['usuario', 'bibliotecario'], ['usuario', 'admin'], ['bibliotecario']):
            response = client.patch('/api/roles/U/', {'roles': roles}, format='json')
            self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(client.patch('/api/roles/U/', {'roles': []}, format='json').status_code, 403)
        self.assertEqual(Usuario.objects.get(pk='U').roles, ['usuario'])

    def test_vista_bibliotecario_no_admite_gestion_de_roles_ni_siquiera_propios(self):
        client = self.client_for('B', ['bibliotecario', 'usuario'])
        for roles in (['usuario'], ['bibliotecario'], ['bibliotecario', 'usuario', 'admin']):
            response = client.patch('/api/roles/B/', {'roles': roles}, format='json')
            self.assertEqual(response.status_code, 403, response.data)
        self.assertTrue(Usuario.objects.get(pk='B').is_active)
        self.assertTrue(Bibliotecario.objects.get(pk='B').is_active)

    def test_admin_debe_abrir_la_vista_admin_antes_de_editar_sus_roles(self):
        client = self.client_for('A', ['admin', 'bibliotecario', 'usuario'], view='bibliotecario')
        response = client.patch('/api/roles/A/', {'roles': ['admin', 'usuario']}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertTrue(Bibliotecario.objects.get(pk='A').is_active)
        vista = client.post('/api/users/active-role/', {'rol': 'admin'}, format='json')
        self.assertEqual(vista.status_code, 200, vista.data)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {vista.data["token"]}')
        response = client.patch('/api/roles/A/', {'roles': ['admin', 'usuario']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['categoria'], 'admin')
        self.assertEqual(jwt_payload(response.data['token'])['categoria'], 'admin')
        self.assertFalse(Bibliotecario.objects.get(pk='A').is_active)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        self.assertEqual(client.get('/api/roles/').status_code, 200)
        response = client.patch('/api/roles/A/', {'roles': ['usuario']}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertTrue(Administrador.objects.get(pk='A').is_active)

    def test_vista_usuario_no_puede_editar_roles_aunque_tenga_admin(self):
        client = self.client_for('A', ['admin', 'bibliotecario', 'usuario'], view='usuario')
        response = client.patch('/api/roles/A/', {'roles': ['admin', 'usuario']}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertTrue(Bibliotecario.objects.get(pk='A').is_active)

    def test_admin_normal_no_otorga_ni_revoca_admin_a_otros(self):
        client = self.client_for('A', ['admin'])
        person = make_user('B', 'bibliotecario')
        for body in ({'roles': ['bibliotecario', 'admin']}, {'nivel': 2}):
            response = client.patch('/api/roles/B/', body, format='json')
            self.assertEqual(response.status_code, 403, response.data)
        asignar_roles(person, ['bibliotecario', 'admin'])
        response = client.patch('/api/roles/B/', {'roles': ['bibliotecario']}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        response = client.patch('/api/roles/B/', {'roles': ['admin', 'usuario']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_solo_el_fijo_puede_agregarse_roles_y_asignar_o_quitar_admin(self):
        client = self.client_for('ADMIN-1', ['admin'])
        make_user('B', 'bibliotecario')
        response = client.patch('/api/roles/ADMIN-1/', {'roles': ['admin', 'bibliotecario', 'usuario']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        for roles in (['bibliotecario', 'admin'], ['bibliotecario']):
            response = client.patch('/api/roles/B/', {'roles': roles}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        response = client.patch('/api/roles/ADMIN-1/', {'roles': ['admin']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        self.assertEqual(client.patch('/api/roles/ADMIN-1/', {'roles': ['bibliotecario']}, format='json').status_code, 400)

    def test_no_se_puede_eludir_la_jerarquia_con_desactivacion_o_eliminacion(self):
        client = self.client_for('A', ['admin', 'bibliotecario'], view='admin')
        response = client.patch('/api/librarians/A/', {'activo': False}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(Administrador.objects.get(pk='A').is_active)
        lib = self.client_for('LIB', ['bibliotecario'])
        make_user('OTRO-ADMIN', 'admin')
        make_user('OTRO-LIB', 'bibliotecario')
        self.assertEqual(lib.delete('/api/users/OTRO-ADMIN/').status_code, 403)
        self.assertEqual(lib.delete('/api/users/OTRO-LIB/').status_code, 403)
