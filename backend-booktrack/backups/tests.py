from datetime import timedelta
import hashlib
import io
import json
from pathlib import Path
import tempfile
import zipfile
from unittest.mock import patch

from django.contrib.auth.models import Group, Permission
from django.contrib.sessions.models import Session
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from books.models import Book
from categories.models import Category
from comments.models import Comment
from loans.models import Loan, Reservation
from users.models import User
from .snapshots import decrypt, encrypt, export_snapshot, read_snapshot, restore_snapshot

PASSWORD = 'test-only-backup-key-at-least-32-chars'


class SnapshotTests(TransactionTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='booktrack-snapshot-test-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.media = self.root/'media'
        self.media.mkdir()
        (self.media/'foto.jpg').write_bytes(b'uploaded-image-test')
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.output = self.root/'booktrack.btbak'
        Book.objects.all().delete()  # Independent of catalog seed migrations and test ordering.
        self.user = User.objects.create_user(username='private-backup-user', password='original-user-password',
                                             email='private-test@example.test', categoria='bibliotecario', imagen='data:image/png;base64,cHJpdmF0ZQ==')
        self.group = Group.objects.create(name='Backup group')
        permission = Permission.objects.first()
        self.group.permissions.add(permission)
        self.user.groups.add(self.group)
        self.user.user_permissions.add(permission)
        self.book = Book.objects.create(titulo='Título privado 📚', categoria='Prueba', estado='inactivo', disponibles=0)
        self.loan = Loan.objects.create(estudiante=self.user, libro=self.book,
            fecha_vencimiento=timezone.localdate()+timedelta(days=7))
        self.reservation = Reservation.objects.create(estudiante=self.user, libro=self.book, estado='finalizada',
            fecha_vencimiento=timezone.localdate(), fecha_devolucion_prevista=self.loan.fecha_vencimiento, prestamo=self.loan)
        Category.objects.create(nombre='Prueba de copia')
        Comment.objects.create(user=self.user, seccion='Test', comentario='Texto privado')
        Session.objects.create(session_key='backup-test-session', session_data='test-session-data',
                               expire_date=timezone.now()+timedelta(days=1))

    def export(self):
        return export_snapshot(self.output, PASSWORD)

    def rewrite_archive(self, *, metadata=None, files=None):
        current_meta, current_files = read_snapshot(self.output, PASSWORD)
        metadata = metadata or current_meta
        files = files or current_files
        metadata['files'] = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, data in files.items():
                archive.writestr(name, data)
            archive.writestr('metadata.json', json.dumps(metadata))
        self.output.write_bytes(encrypt(buffer.getvalue(), PASSWORD))

    def test_copy_includes_all_models_relations_files_and_hides_plaintext(self):
        metadata = self.export()
        data = self.output.read_bytes()
        self.assertNotIn(b'private-backup-user', data)
        self.assertNotIn(b'private-test@example.test', data)
        self.assertNotIn(b'uploaded-image-test', data)
        self.assertEqual(metadata['counts']['users.user'], 1)
        self.assertEqual(metadata['counts']['users.user_groups'], 1)
        self.assertEqual(metadata['counts']['users.user_user_permissions'], 1)
        _, files = read_snapshot(self.output, PASSWORD)
        labels = {entry['model'] for entry in json.loads(files['database.json'])}
        self.assertTrue({'users.user', 'books.book', 'loans.loan', 'loans.reservation', 'comments.comment',
                         'sessions.session', 'auth.group', 'auth.permission', 'contenttypes.contenttype'} <= labels)
        self.assertEqual(files['media/foto.jpg'], b'uploaded-image-test')

    def test_complete_restore_preserves_ids_passwords_links_and_replaces_media(self):
        self.export()
        Book.objects.filter(pk=self.book.pk).update(titulo='Changed')
        extra = Book.objects.create(titulo='Not in snapshot', categoria='Prueba')
        (self.media/'foto.jpg').write_bytes(b'changed')
        (self.media/'extra.jpg').write_bytes(b'not-in-snapshot')
        recovery = restore_snapshot(self.output, PASSWORD, replace=True)
        self.assertTrue(recovery.exists())
        self.assertFalse(Book.objects.filter(pk=extra.pk).exists())
        self.assertEqual(Book.objects.get(pk=self.book.pk).titulo, 'Título privado 📚')
        restored = User.objects.get(pk=self.user.pk)
        self.assertTrue(restored.check_password('original-user-password'))
        self.assertEqual(restored.imagen, 'data:image/png;base64,cHJpdmF0ZQ==')
        self.assertEqual(restored.groups.get().pk, self.group.pk)
        self.assertEqual(restored.user_permissions.count(), 1)
        self.assertEqual(Reservation.objects.get(pk=self.reservation.pk).prestamo_id, self.loan.pk)
        self.assertEqual(Session.objects.get().session_data, 'test-session-data')
        self.assertEqual((self.media/'foto.jpg').read_bytes(), b'uploaded-image-test')
        self.assertFalse((self.media/'extra.jpg').exists())
        previous, _ = read_snapshot(recovery, PASSWORD)
        self.assertEqual(previous['counts']['books.book'], 2)

    def test_wrong_key_and_tampering_never_modify_destination(self):
        self.export()
        with self.assertRaises(CommandError):
            restore_snapshot(self.output, 'wrong-password-at-least-16-chars', replace=True)
        data = bytearray(self.output.read_bytes())
        data[-1] ^= 1
        self.output.write_bytes(data)
        with self.assertRaises(CommandError):
            restore_snapshot(self.output, PASSWORD, replace=True)
        self.assertEqual(User.objects.get().email, 'private-test@example.test')
        self.assertFalse((self.root/'recovery').exists())

    def test_restore_requires_explicit_replace(self):
        self.export()
        with self.assertRaisesMessage(CommandError, '--replace'):
            restore_snapshot(self.output, PASSWORD)
        self.assertTrue(Book.objects.filter(pk=self.book.pk).exists())

    def test_schema_mismatch_is_rejected_before_changes(self):
        self.export()
        metadata, files = read_snapshot(self.output, PASSWORD)
        metadata['migrations'] = []
        self.rewrite_archive(metadata=metadata, files=files)
        with self.assertRaisesMessage(CommandError, 'migraciones'):
            restore_snapshot(self.output, PASSWORD, replace=True)
        self.assertEqual(Loan.objects.count(), 1)
        self.assertFalse((self.root/'recovery').exists())

    def test_invalid_fixture_rolls_back_database_and_preserves_media(self):
        self.export()
        metadata, files = read_snapshot(self.output, PASSWORD)
        fixture = json.loads(files['database.json'])
        next(item for item in fixture if item['model']=='books.book')['fields']['not_a_real_field'] = 'invalid'
        files['database.json'] = json.dumps(fixture).encode()
        self.rewrite_archive(metadata=metadata, files=files)
        with self.assertRaises(Exception):
            restore_snapshot(self.output, PASSWORD, replace=True)
        self.assertEqual(Book.objects.get(pk=self.book.pk).titulo, 'Título privado 📚')
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual((self.media/'foto.jpg').read_bytes(), b'uploaded-image-test')
        self.assertEqual(len(list((self.root/'recovery').glob('*.btbak'))), 1)

    def test_media_failure_rolls_back_database_and_keeps_original_files(self):
        self.export()
        Book.objects.filter(pk=self.book.pk).update(titulo='Current data')
        import os
        original_replace = os.replace
        def fail_media(source, target):
            if Path(source).name == 'new-media':
                raise OSError('Simulated disk failure')
            return original_replace(source, target)
        with patch('backups.snapshots.os.replace', side_effect=fail_media):
            with self.assertRaises(OSError):
                restore_snapshot(self.output, PASSWORD, replace=True)
        self.assertEqual(Book.objects.get(pk=self.book.pk).titulo, 'Current data')
        self.assertEqual((self.media/'foto.jpg').read_bytes(), b'uploaded-image-test')

    def test_archive_paths_and_media_symlinks_are_rejected(self):
        self.export()
        metadata, files = read_snapshot(self.output, PASSWORD)
        files['media/../outside'] = b'bad'
        self.rewrite_archive(metadata=metadata, files=files)
        with self.assertRaises(CommandError):
            read_snapshot(self.output, PASSWORD)
        (self.media/'outside-link').symlink_to(self.root/'booktrack.btbak')
        with self.assertRaises(CommandError):
            self.export()

    def test_commands_support_verification_without_restoring(self):
        key = self.root/'secret-key.txt'
        key.write_text(PASSWORD)
        call_command('exportar_datos', output=str(self.output), password_file=str(key), no_input=True, stdout=io.StringIO())
        output = io.StringIO()
        call_command('restaurar_datos', input=str(self.output), password_file=str(key), no_input=True,
                     check_only=True, stdout=output)
        self.assertIn('No se cambiaron datos', output.getvalue())
        self.assertEqual(User.objects.count(), 1)

    def test_missing_key_refuses_export_without_prompt_or_partial_file(self):
        with patch('backups.management.commands._password.config', return_value=''):
            with self.assertRaisesMessage(CommandError, 'BOOKTRACK_BACKUP_PASSWORD'):
                call_command('exportar_datos', output=str(self.output), no_input=True)
        self.assertFalse(self.output.exists())
