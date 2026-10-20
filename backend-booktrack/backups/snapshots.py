"""Encrypted, portable copies of all managed Django data and MEDIA_ROOT files."""
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import tempfile
import uuid
import zipfile

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connections, transaction
from django.db.migrations.recorder import MigrationRecorder

MAGIC = b'BOOKTRACK-SNAPSHOT\x00\x01'
MAX_ENCRYPTED_SIZE = 90 * 1024 * 1024
MAX_EXPANDED_SIZE = 512 * 1024 * 1024


def _key(password, salt):
    if len(password) < 16:
        raise CommandError('La clave de la copia debe tener al menos 16 caracteres.')
    return Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(password.encode('utf-8'))


def encrypt(plaintext, password):
    salt, nonce = os.urandom(16), os.urandom(12)
    header = MAGIC + salt
    result = header + nonce + AESGCM(_key(password, salt)).encrypt(nonce, plaintext, header)
    if len(result) > MAX_ENCRYPTED_SIZE:
        raise CommandError('La copia supera 90 MiB. Usá almacenamiento de respaldos externo a Git.')
    return result


def decrypt(data, password):
    if len(data) > MAX_ENCRYPTED_SIZE or not data.startswith(MAGIC):
        raise CommandError('El archivo no es una copia cifrada de BookTrack válida.')
    start = len(MAGIC)
    if len(data) < start + 16 + 12 + 16:
        raise CommandError('La copia está incompleta.')
    salt, nonce = data[start:start+16], data[start+16:start+28]
    try:
        return AESGCM(_key(password, salt)).decrypt(nonce, data[start+28:], MAGIC+salt)
    except InvalidTag as exc:
        raise CommandError('La clave no corresponde o la copia fue modificada. No se cambió la base.') from exc


def _models():
    return [model for model in apps.get_models(include_auto_created=True)
            if model._meta.managed and not model._meta.proxy and not model._meta.swapped]


def _counts(database):
    return {model._meta.label_lower: model._base_manager.using(database).count() for model in _models()}


def _migrations(database):
    return sorted([list(item) for item in MigrationRecorder(connections[database]).applied_migrations()])


def _check_engine(database):
    connection = connections[database]
    if connection.vendor not in ['sqlite', 'mysql']:
        raise CommandError('Las copias admiten las bases MySQL y SQLite de BookTrack.')
    if connection.vendor == 'mysql':
        tables = set(connection.introspection.django_table_names(only_existing=True))
        with connection.cursor() as cursor:
            cursor.execute('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')
            if any(name in tables and engine != 'InnoDB' for name, engine in cursor.fetchall()):
                raise CommandError('Las tablas de BookTrack deben usar InnoDB para copiar y restaurar transaccionalmente.')


@contextmanager
def _consistent_read(database):
    connection = connections[database]
    if connection.in_atomic_block:
        raise CommandError('La copia debe ejecutarse fuera de otra transacción.')
    if connection.vendor == 'mysql':
        with connection.cursor() as cursor:
            cursor.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    with transaction.atomic(using=database):
        yield


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def export_snapshot(output, password, database='default'):
    output = Path(output).absolute()
    media = Path(settings.MEDIA_ROOT).absolute()
    if media.is_symlink() or output.is_symlink() or media in output.parents:
        raise CommandError('No se admiten enlaces simbólicos ni guardar la copia dentro de media.')
    _check_engine(database)
    buffer = io.StringIO()
    with _consistent_read(database):
        migrations = _migrations(database)
        counts = _counts(database)
        call_command('dumpdata', database=database, use_base_manager=True,
                     stdout=buffer, verbosity=0)
    fixture = buffer.getvalue().encode('utf-8')
    files = {'database.json': _sha(fixture)}
    total = len(fixture)
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('database.json', fixture)
        if media.exists():
            for path in sorted(media.rglob('*')):
                if path.is_symlink():
                    raise CommandError('Hay un enlace simbólico en media; no se incluye contenido externo.')
                if not path.is_file():
                    continue
                total += path.stat().st_size
                if total > MAX_EXPANDED_SIZE:
                    raise CommandError('Los datos superan el límite de 512 MiB sin comprimir.')
                content = path.read_bytes()
                name = 'media/' + path.relative_to(media).as_posix()
                files[name] = _sha(content)
                archive.writestr(name, content)
        metadata = {'format': 1, 'created_at': datetime.now(timezone.utc).isoformat(),
                    'migrations': migrations, 'counts': counts, 'files': files}
        archive.writestr('metadata.json', json.dumps(metadata, ensure_ascii=False))
    if total > MAX_EXPANDED_SIZE:
        raise CommandError('Los datos superan el límite de 512 MiB sin comprimir.')
    encrypted = encrypt(archive_buffer.getvalue(), password)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=output.parent, prefix='.booktrack-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(encrypted)
        os.replace(temporary, output)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    return metadata


def read_snapshot(source, password):
    source = Path(source)
    if source.stat().st_size > MAX_ENCRYPTED_SIZE:
        raise CommandError('La copia supera el tamaño admitido.')
    plaintext = decrypt(source.read_bytes(), password)
    try:
        with zipfile.ZipFile(io.BytesIO(plaintext)) as archive:
            members = archive.infolist()
            names = [item.filename for item in members]
            if len(set(names)) != len(names) or sum(item.file_size for item in members) > MAX_EXPANDED_SIZE:
                raise CommandError('La copia contiene entradas duplicadas o supera el límite de tamaño.')
            for item in members:
                name = PurePosixPath(item.filename)
                if (str(name) != item.filename or name.is_absolute() or '..' in name.parts or '\\' in item.filename or ':' in item.filename
                        or stat.S_ISLNK(item.external_attr >> 16)
                        or not (item.filename in ['metadata.json', 'database.json'] or item.filename.startswith('media/'))):
                    raise CommandError('La copia contiene una ruta no admitida.')
            if 'metadata.json' not in names or 'database.json' not in names:
                raise CommandError('La copia no contiene el manifiesto y la base de datos.')
            metadata = json.loads(archive.read('metadata.json'))
            if metadata.get('format') != 1 or set(metadata.get('files', {})) != set(names)-{'metadata.json'}:
                raise CommandError('El manifiesto de la copia no es válido.')
            files = {name: archive.read(name) for name in names if name != 'metadata.json'}
            if any(_sha(content) != metadata['files'][name] for name, content in files.items()):
                raise CommandError('Falló la verificación de integridad de la copia.')
            if not isinstance(json.loads(files['database.json']), list):
                raise CommandError('Los datos de la copia no son una fixture válida.')
            return metadata, files
    except (zipfile.BadZipFile, KeyError, TypeError, ValueError) as exc:
        raise CommandError('No se pudo validar el contenido de la copia.') from exc


def restore_snapshot(source, password, *, replace=False, database='default'):
    if not replace:
        raise CommandError('La restauración reemplaza los datos. Indicá --replace después de detener la aplicación.')
    connection = connections[database]
    if connection.in_atomic_block:
        raise CommandError('La restauración debe ejecutarse fuera de otra transacción.')
    _check_engine(database)
    metadata, files = read_snapshot(source, password)
    if metadata.get('migrations') != _migrations(database):
        raise CommandError('La copia usa otras migraciones. Usá el código correspondiente y ejecutá migrate primero.')
    if set(metadata.get('counts', {})) != set(_counts(database)):
        raise CommandError('Los modelos de la copia no coinciden con esta instalación.')
    media = Path(settings.MEDIA_ROOT).absolute()
    if media.is_symlink():
        raise CommandError('La carpeta media no puede ser un enlace simbólico.')
    recovery = Path(source).absolute().parent / 'recovery' / f'before-restore-{uuid.uuid4().hex}.btbak'
    export_snapshot(recovery, password, database)
    media.parent.mkdir(parents=True, exist_ok=True)
    tables = connection.introspection.django_table_names(only_existing=True)
    # DELETE is transactional on InnoDB; Django flush uses TRUNCATE on MySQL and cannot be rolled back.
    with tempfile.TemporaryDirectory(prefix='.booktrack-restore-', dir=media.parent) as temp:
        root = Path(temp)
        fixture = root/'database.json'
        fixture.write_bytes(files['database.json'])
        staged_media = root/'new-media'
        staged_media.mkdir()
        for name, data in files.items():
            if name.startswith('media/'):
                target = staged_media.joinpath(*PurePosixPath(name).parts[1:])
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
        old_media = root/'old-media'
        moved_old = moved_new = False
        try:
            with connection.constraint_checks_disabled():
                with transaction.atomic(using=database):
                    with connection.cursor() as cursor:
                        for table in tables:
                            cursor.execute(f'DELETE FROM {connection.ops.quote_name(table)}')
                    call_command('loaddata', str(fixture), database=database, verbosity=0)
                    connection.check_constraints(table_names=tables)
                    if _counts(database) != metadata['counts']:
                        raise CommandError('Los conteos restaurados no coinciden. Se revirtió la restauración.')
                    if media.exists():
                        os.replace(media, old_media)
                        moved_old = True
                    os.replace(staged_media, media)
                    moved_new = True
        except Exception:
            if moved_new:
                shutil.rmtree(media)
            if moved_old:
                os.replace(old_media, media)
            raise
    return recovery
