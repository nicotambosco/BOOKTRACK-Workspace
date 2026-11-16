from django.test import TestCase
from rest_framework.test import APIClient

from .models import Administrador, Bibliotecario, Usuario, asignar_roles
from .testing import make_user


class EmailUniquenessTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def register(self, legajo, email):
        return self.client.post('/api/users/register/', {
            'legajo': legajo, 'nombreApellido': 'Nueva Cuenta',
            'email': email, 'contrasena': 'clave-registro',
        }, format='json')

    def test_registration_rejects_emails_owned_by_any_role_even_when_inactive(self):
        for role in ('usuario', 'bibliotecario', 'admin'):
            for active in (True, False):
                legajo = f'OWNER-{role}-{active}'
                email = f'{legajo}@example.test'
                make_user(legajo, role, email=email, is_active=active)
                response = self.register(f'NEW-{legajo}', f'  {email.upper()}  ')
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn('email', response.data)
                self.assertFalse(Usuario.objects.filter(pk=f'NEW-{legajo}').exists())

    def test_registration_normalizes_email_and_blank_emails_remain_optional(self):
        response = self.register('NEW-EMAIL', '  Nuevo@Example.Test  ')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['email'], 'nuevo@example.test')
        for legajo in ('EMPTY-1', 'EMPTY-2'):
            self.assertEqual(self.register(legajo, '').status_code, 201)

    def test_profile_routes_reject_another_persons_email_without_changing_data(self):
        user = make_user('READER', email='reader@example.test')
        make_user('OWNER', 'admin', email='owner@example.test')
        self.client.force_authenticate(user)
        for url in ('/api/users/me/', '/api/users/READER/'):
            response = self.client.patch(url, {'email': 'OWNER@example.test'}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
            user.refresh_from_db()
            self.assertEqual(user.email, 'reader@example.test')

    def test_librarian_creation_and_editing_reject_emails_from_other_accounts(self):
        admin = make_user('EMAIL-ADMIN', 'admin', email='admin@example.test')
        librarian = make_user('LIB', 'bibliotecario', email='lib@example.test')
        make_user('READER', email='reader@example.test')
        self.client.force_authenticate(admin)
        created = self.client.post('/api/librarians/', {
            'legajo': 'NEW-LIB', 'nombreApellido': 'Nuevo Bibliotecario',
            'email': 'READER@example.test', 'contrasena': 'clave-registro',
        }, format='json')
        self.assertEqual(created.status_code, 400, created.data)
        self.assertFalse(Bibliotecario.objects.filter(pk='NEW-LIB').exists())
        for url in ('/api/librarians/LIB/', '/api/users/me/'):
            response = self.client.patch(url, {'email': 'reader@example.test'}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        librarian.refresh_from_db()
        self.assertEqual(librarian.email, 'lib@example.test')

    def test_same_identity_can_keep_and_change_its_email_across_multiple_roles(self):
        person = make_user('MULTI-EMAIL', 'admin', email='multi@example.test')
        asignar_roles(person, ['usuario', 'bibliotecario', 'admin'])
        self.client.force_authenticate(person)
        for url in ('/api/librarians/MULTI-EMAIL/', '/api/users/me/'):
            for email in ('MULTI@example.test', 'changed@example.test'):
                response = self.client.patch(url, {'email': email}, format='json')
                self.assertEqual(response.status_code, 200, response.data)
                for model in (Usuario, Bibliotecario, Administrador):
                    self.assertEqual(model.objects.get(pk=person.pk).email, email.lower())

    def test_email_login_is_case_insensitive_and_deduplicates_roles(self):
        person = make_user('LOGIN-MULTI', 'bibliotecario', email='Mixed@Example.Test')
        asignar_roles(person, ['usuario', 'bibliotecario', 'admin'])
        response = self.client.post('/api/users/login/', {
            'legajoOEmail': 'MIXED@EXAMPLE.TEST', 'contrasena': 'clave-segura',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['user']['id'], response.data['user']['categoria']), ('LOGIN-MULTI', 'bibliotecario'))

    def test_legacy_duplicate_emails_require_legajo_until_corrected(self):
        make_user('A-EMAIL', 'usuario', email='duplicate@example.test', password='clave-usuario')
        make_user('Z-EMAIL', 'bibliotecario', email='Duplicate@Example.Test', password='clave-bibliotecario')
        for password in ('clave-usuario', 'clave-bibliotecario'):
            response = self.client.post('/api/users/login/', {
                'legajoOEmail': 'duplicate@example.test', 'contrasena': password,
            }, format='json')
            self.assertEqual(response.status_code, 400, response.data)
            self.assertIn('legajo', str(response.data))
        for legajo, password in (('A-EMAIL', 'clave-usuario'), ('Z-EMAIL', 'clave-bibliotecario')):
            response = self.client.post('/api/users/login/', {
                'legajoOEmail': legajo, 'contrasena': password,
            }, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        user = Usuario.objects.get(pk='A-EMAIL')
        self.client.force_authenticate(user)
        self.assertEqual(self.client.patch('/api/users/me/', {'email': 'fixed@example.test'}, format='json').status_code, 200)
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/users/login/', {
            'legajoOEmail': 'duplicate@example.test', 'contrasena': 'clave-bibliotecario',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['id'], 'Z-EMAIL')
