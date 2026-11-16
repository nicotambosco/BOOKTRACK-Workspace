from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Administrador, Bibliotecario, asignar_roles
from .testing import make_user
from .test_api import jwt_payload


class PrimaryAdminTests(TestCase):
    def setUp(self):
        self.principal = make_user('ADMIN-1', 'admin', email='principal@example.test')
        self.otro = make_user('OTRO-ADMIN', 'admin')
        self.admin = APIClient()
        self.admin.force_authenticate(self.principal)

    def test_ningun_administrador_puede_quitar_el_rol_principal_por_ningun_contrato(self):
        for actor in (self.otro, self.principal):
            self.admin.force_authenticate(actor)
            for body in ({'roles': ['bibliotecario']}, {'nivel': 1},
                         {'roles': ['usuario'], 'rolesFijos': []}):
                response = self.admin.patch('/api/roles/ADMIN-1/', body, format='json')
                self.assertEqual(response.status_code, 400, response.data)
                self.assertTrue(Administrador.objects.get(pk='ADMIN-1').is_active)
        self.assertFalse(Bibliotecario.objects.filter(pk='ADMIN-1').exists())

    def test_el_admin_principal_tampoco_puede_eliminarse_o_desactivarse(self):
        with self.assertRaises(ValidationError):
            asignar_roles(self.principal, ['usuario'])
        with self.assertRaises(ValidationError):
            self.principal.delete()
        self.principal.is_active = False
        with self.assertRaises(ValidationError):
            self.principal.save()
        client = APIClient()
        client.force_authenticate(make_user('LIB-DELETE', 'bibliotecario'))
        response = client.delete('/api/users/ADMIN-1/')
        self.assertEqual(response.status_code, 403, response.data)
        self.assertTrue(Administrador.objects.get(pk='ADMIN-1').is_active)

    def test_expone_el_rol_fijo_y_permite_administrar_los_roles_adicionales(self):
        data = self.admin.get('/api/roles/').data
        self.assertEqual(next(p for p in data if p['id'] == 'ADMIN-1')['rolesFijos'], ['admin'])
        self.assertEqual(next(p for p in data if p['id'] == 'OTRO-ADMIN')['rolesFijos'], [])
        for roles in (['admin', 'bibliotecario'], ['admin']):
            response = self.admin.patch('/api/roles/ADMIN-1/', {'roles': roles}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(set(response.data['roles']), set(roles))
            self.assertEqual(response.data['rolesFijos'], ['admin'])
        delegado = make_user('DELEGADO', 'bibliotecario')
        asignar_roles(delegado, ['admin', 'bibliotecario'])
        response = self.admin.patch('/api/roles/DELEGADO/', {'roles': ['bibliotecario']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(Administrador.objects.get(pk='DELEGADO').is_active)

    def test_el_bibliotecario_con_admin_inicia_como_bibliotecario_y_puede_cambiar_a_admin(self):
        make_user('LIB-INICIO', 'bibliotecario', email='lib@example.test')
        response = self.admin.patch('/api/roles/LIB-INICIO/', {'roles': ['bibliotecario', 'admin']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        for identificador in ('LIB-INICIO', 'lib@example.test'):
            session = APIClient().post('/api/users/login/', {'legajoOEmail': identificador, 'contrasena': 'clave-segura'}, format='json')
            self.assertEqual(session.status_code, 200, session.data)
            self.assertEqual(session.data['user']['categoria'], 'bibliotecario')
            self.assertEqual(jwt_payload(session.data['token'])['categoria'], 'bibliotecario')
            self.assertEqual(set(session.data['user']['roles']), {'bibliotecario', 'admin'})
            client = APIClient()
            client.credentials(HTTP_AUTHORIZATION=f'Bearer {session.data["token"]}')
            self.assertEqual(client.get('/api/loans/').status_code, 200)
            switch = client.post('/api/users/active-role/', {'rol': 'admin'}, format='json')
            self.assertEqual(switch.status_code, 200, switch.data)
            client.credentials(HTTP_AUTHORIZATION=f'Bearer {switch.data["token"]}')
            self.assertEqual(client.get('/api/roles/').status_code, 200)
            nuevo_login = client.post('/api/users/login/', {'legajoOEmail': identificador, 'contrasena': 'clave-segura'}, format='json')
            self.assertEqual(nuevo_login.data['user']['categoria'], 'bibliotecario')

    def test_el_principal_con_ambos_roles_tambien_inicia_en_bibliotecario(self):
        self.admin.patch('/api/roles/ADMIN-1/', {'roles': ['admin', 'bibliotecario']}, format='json')
        response = APIClient().post('/api/users/login/', {'legajoOEmail': 'ADMIN-1', 'contrasena': 'clave-segura'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['categoria'], 'bibliotecario')
        self.assertEqual(response.data['user']['rolesFijos'], ['admin'])

    def test_franco_no_es_fijo_pero_no_puede_quitarse_admin_ni_asignarse_roles(self):
        franco = make_user('12473', 'bibliotecario', nombre='Franco', apellido='Perez')
        asignar_roles(franco, ['bibliotecario', 'admin'])
        client = APIClient()
        login = client.post('/api/users/login/', {'legajoOEmail': '12473', 'contrasena': 'clave-segura'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["token"]}')
        vista_admin = client.post('/api/users/active-role/', {'rol': 'admin'}, format='json')
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {vista_admin.data["token"]}')
        for body in ({'roles': ['bibliotecario']}, {'nivel': 1}, {'roles': ['admin', 'bibliotecario', 'usuario']}):
            response = client.patch('/api/roles/12473/', body, format='json')
            self.assertEqual(response.status_code, 403, response.data)
        response = self.admin.patch('/api/roles/12473/', {'roles': ['bibliotecario']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['rolesFijos'], [])
        self.assertFalse(Administrador.objects.get(pk='12473').is_active)
        self.assertTrue(Administrador.objects.get(pk='ADMIN-1').is_active)
