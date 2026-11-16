from pathlib import Path
import tempfile
from unittest.mock import patch

from django.core import serializers
from django.test import TransactionTestCase, override_settings

from .bootstrap import ensure_primary_admin
from .models import Administrador, Bibliotecario, Usuario, asignar_roles
from .testing import make_user


class PrimaryAdminBootstrapTests(TransactionTestCase):
    def test_configured_password_creates_a_working_principal_admin(self):
        admin = ensure_primary_admin(password='principal-password')
        self.assertEqual((admin.pk, admin.categoria, admin.email, admin.is_active),
                         ('ADMIN-1', 'admin', 'admin@booktrack.com', True))
        self.assertTrue(admin.check_password('principal-password'))
        self.assertEqual(admin.roles_fijos, ['admin'])

    def test_repeated_startup_preserves_existing_credentials_profile_and_roles(self):
        original = make_user('ADMIN-1', 'admin', password='original-password', nombre='Nombre existente', email='original@example.test')
        asignar_roles(original, ['admin', 'bibliotecario'])
        original_hash = original.password
        with patch('users.bootstrap.read_snapshot', side_effect=AssertionError('No debe leerse una copia')):
            for _ in range(2):
                admin = ensure_primary_admin(password='different-password', snapshot='unused', backup_password='unused')
                self.assertEqual((admin.nombre, admin.email, admin.password), ('Nombre existente', 'original@example.test', original_hash))
                self.assertEqual(set(admin.roles), {'admin', 'bibliotecario'})
        self.assertEqual(Administrador.objects.count(), 1)

    def test_saved_admin_is_recovered_from_encrypted_snapshot_with_its_password(self):
        from backups.snapshots import export_snapshot
        original = make_user('ADMIN-1', 'admin', password='saved-password', email='admin@booktrack.com')
        saved_hash = original.password
        reader = make_user('EXISTING-READER', nombre='Conservar')
        with tempfile.TemporaryDirectory() as directory:
            snapshot = Path(directory)/'snapshot.btbak'
            password = 'test-only-backup-password'
            with override_settings(MEDIA_ROOT=Path(directory)/'media'):
                export_snapshot(snapshot, password)
            Administrador.objects.filter(pk=original.pk).delete()
            Usuario.objects.filter(pk=reader.pk).update(nombre='Nombre actual')
            admin = ensure_primary_admin(snapshot=snapshot, backup_password=password)
            self.assertEqual((admin.pk, admin.password, admin.email), ('ADMIN-1', saved_hash, 'admin@booktrack.com'))
            self.assertTrue(admin.check_password('saved-password'))
            self.assertEqual(Usuario.objects.get(pk=reader.pk).nombre, 'Nombre actual')

    def test_missing_configuration_does_not_create_an_account_with_an_unknown_password(self):
        self.assertIsNone(ensure_primary_admin())
        self.assertFalse(Administrador.objects.exists())

    def test_an_existing_non_admin_identity_is_never_promoted_implicitly(self):
        person = make_user('ADMIN-1', 'bibliotecario')
        with self.assertRaisesMessage(RuntimeError, 'otra cuenta'):
            ensure_primary_admin(password='new-password')
        self.assertFalse(Administrador.objects.exists())
        self.assertEqual(Bibliotecario.objects.get(pk=person.pk).password, person.password)

    def test_snapshot_without_principal_admin_does_not_restore_other_accounts(self):
        other = make_user('OTHER-ADMIN', 'admin')
        contents = serializers.serialize('json', [other]).encode()
        with tempfile.NamedTemporaryFile() as snapshot:
            with patch('users.bootstrap.read_snapshot', return_value=({}, {'database.json': contents})):
                self.assertIsNone(ensure_primary_admin(snapshot=snapshot.name, backup_password='backup-password'))
        self.assertFalse(Administrador.objects.filter(pk='ADMIN-1').exists())
