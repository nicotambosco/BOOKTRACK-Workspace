from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from books.testing import make_book
from loans.models import AccionAdministrativa, Prestamo, Reserva
from .models import Administrador, Bibliotecario, Usuario
from .testing import make_user


class MultiRoleTests(TestCase):
    def setUp(self):
        self.admin = make_user('MULTI', 'admin', nombre='Mariana', email='multi@example.test')
        self.client = APIClient()
        self.setter = APIClient(); self.setter.force_authenticate(make_user('ADMIN-1', 'admin'))
        self.login()

    def login(self):
        self.client.credentials()
        response = self.client.post('/api/users/login/', {'legajoOEmail': 'MULTI', 'contrasena': 'clave-segura'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        return response.data

    def roles(self, roles):
        response = self.setter.patch('/api/roles/MULTI/', {'roles': roles}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.login()
        if 'admin' in roles:
            self.switch('admin')
        return response

    def switch(self, rol):
        response = self.client.post('/api/users/active-role/', {'rol': rol}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['categoria'], rol)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["token"]}')
        return response.data

    def test_cuenta_con_roles_asignados_alterna_ambas_vistas_sin_nuevo_login(self):
        self.roles(['admin', 'bibliotecario'])
        self.assertTrue(Administrador.objects.get(pk='MULTI').is_active)
        self.assertTrue(Bibliotecario.objects.get(pk='MULTI').is_active)
        listado = self.client.get('/api/roles/').data
        self.assertEqual(len(listado), 2)
        self.assertEqual(set(next(p for p in listado if p['id'] == 'MULTI')['roles']), {'admin', 'bibliotecario'})
        self.assertEqual([p['id'] for p in self.client.get('/api/librarians/').data], ['MULTI'])
        self.switch('bibliotecario')
        self.assertEqual(self.client.get('/api/users/').status_code, 200)
        self.assertEqual(self.client.get('/api/roles/').status_code, 403)
        self.switch('admin')
        self.assertEqual(self.client.get('/api/roles/').status_code, 200)

    def test_prestamos_devoluciones_y_ejemplares_guardan_el_bibliotecario_correcto(self):
        self.roles(['admin', 'bibliotecario'])
        self.switch('bibliotecario')
        alumno = make_user('LECTOR')
        book = make_book('Prueba de roles')
        reserva = Reserva.objects.create(usuario=alumno, libro=book, fecha_retiro=timezone.localdate(),
                                        fecha_vencimiento=timezone.localdate() + timedelta(days=7))
        response = self.client.patch(f'/api/reservations/{reserva.pk}/retirar/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        loan = Prestamo.objects.get(usuario=alumno)
        self.assertEqual(loan.bibliotecario_id, 'MULTI')
        response = self.client.patch(f'/api/loans/{loan.pk}/devolver/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(f'/api/books/{book.pk}/ejemplares/', {}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(set(AccionAdministrativa.objects.filter(bibliotecario_id='MULTI').values_list('tipo_accion', flat=True)),
                         {'retiro_reserva', 'devolucion', 'alta_ejemplar'})
        self.switch('admin')
        ficha = self.client.get('/api/librarians/').data[0]
        self.assertEqual((ficha['prestamosGestionados'], ficha['devoluciones']), (1, 1))
        self.assertEqual(len(self.client.get('/api/librarians/MULTI/activity/').data), 3)

    def test_no_permite_elegir_una_vista_sin_el_rol_asignado(self):
        for rol in ['bibliotecario', 'usuario', 'inventado', ['admin']]:
            response = self.client.post('/api/users/active-role/', {'rol': rol}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.client.post('/api/books/', {}, format='json').status_code, 403)
        self.assertEqual(APIClient().post('/api/users/active-role/', {'rol': 'admin'}, format='json').status_code, 401)

    def test_quitar_un_rol_invalida_tokens_anteriores_y_conserva_sus_filas(self):
        self.roles(['admin', 'bibliotecario'])
        viejo = APIClient()
        viejo.credentials(HTTP_AUTHORIZATION=self.client._credentials['HTTP_AUTHORIZATION'])
        moderador = APIClient(); moderador.force_authenticate(make_user('MOD-ROLES', 'admin'))
        response = moderador.patch('/api/roles/MULTI/', {'roles': ['admin']}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.login()
        self.assertEqual(viejo.get('/api/roles/').status_code, 401)
        self.assertTrue(Administrador.objects.get(pk='MULTI').is_active)
        self.assertFalse(Bibliotecario.objects.get(pk='MULTI').is_active)
        self.assertEqual(self.client.post('/api/users/active-role/', {'rol': 'bibliotecario'}, format='json').status_code, 400)
        self.roles(['admin', 'bibliotecario'])
        self.assertEqual(Bibliotecario.objects.filter(pk='MULTI').count(), 1)

    def test_perfil_y_credenciales_se_comparten_entre_los_tres_roles(self):
        self.roles(['usuario', 'bibliotecario', 'admin'])
        self.switch('bibliotecario')
        response = self.client.patch('/api/users/me/', {'nombreApellido': 'Mariana López', 'email': 'nuevo@example.test'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.switch('usuario')
        response = self.client.patch('/api/users/me/', {'email': 'final@example.test'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        for modelo in (Usuario, Bibliotecario, Administrador):
            persona = modelo.objects.get(pk='MULTI')
            self.assertEqual((persona.nombre_apellido, persona.email), ('Mariana López', 'final@example.test'))
            self.assertTrue(persona.check_password('clave-segura'))
        response = APIClient().post('/api/users/login/', {'legajoOEmail': 'final@example.test', 'contrasena': 'clave-segura'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(set(response.data['user']['roles']), {'usuario', 'bibliotecario', 'admin'})

    def test_otro_admin_desactiva_bibliotecario_sin_quitar_el_admin(self):
        self.roles(['admin', 'bibliotecario'])
        moderador = APIClient(); moderador.force_authenticate(make_user('MOD-ESTADO', 'admin'))
        response = moderador.patch('/api/librarians/MULTI/', {'activo': False}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['roles'], ['admin'])
        self.login()
        self.assertEqual(self.client.get('/api/roles/').status_code, 200)
        self.assertEqual(self.client.get('/api/librarians/').data, [])
        self.assertFalse(Bibliotecario.objects.get(pk='MULTI').is_active)

    def test_rechaza_roles_vacios_duplicados_e_invalidos(self):
        for roles in [[], ['admin', 'admin'], ['admin', 'otro']]:
            response = self.client.patch('/api/roles/MULTI/', {'roles': roles}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.client.patch('/api/roles/MULTI/', {'roles': ['admin'], 'nivel': 2}, format='json').status_code, 400)
        self.assertEqual(Administrador.objects.get(pk='MULTI').roles, ['admin'])

    def test_usuario_con_rol_bibliotecario_aparece_una_vez_en_listado(self):
        self.roles(['admin', 'bibliotecario', 'usuario'])
        self.switch('usuario')
        book = make_book('Lectura propia')
        response = self.client.post('/api/reservations/', {'libroId': book.pk, 'fechaRetiro': str(timezone.localdate()),
                                    'fechaVencimiento': str(timezone.localdate() + timedelta(days=7))}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.get('/api/reservations/').data[0]['estudianteId'], 'MULTI')
        self.switch('bibliotecario')
        self.assertEqual([p['id'] for p in self.client.get('/api/users/').data], ['MULTI'])
