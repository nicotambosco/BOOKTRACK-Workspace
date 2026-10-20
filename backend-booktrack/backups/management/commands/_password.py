import getpass
from pathlib import Path
from decouple import config
from django.core.management.base import CommandError


def add_password_arguments(parser):
    parser.add_argument('--password-file', help='Archivo local con la clave; nunca se incluye en Git.')
    parser.add_argument('--no-input', action='store_true', help='Requiere clave configurada, sin preguntar.')


def read_password(options, confirm=False):
    if options['password_file']:
        password = Path(options['password_file']).read_text(encoding='utf-8').rstrip('\r\n')
    else:
        password = config('BOOKTRACK_BACKUP_PASSWORD', default='')
        if not password:
            if options['no_input']:
                raise CommandError('Configurá BOOKTRACK_BACKUP_PASSWORD en el .env local, fuera de Git.')
            password = getpass.getpass('Clave para la copia cifrada: ')
            if confirm and getpass.getpass('Repetí la clave: ') != password:
                raise CommandError('Las claves no coinciden.')
    if len(password) < 16:
        raise CommandError('La clave de la copia debe tener al menos 16 caracteres.')
    return password
