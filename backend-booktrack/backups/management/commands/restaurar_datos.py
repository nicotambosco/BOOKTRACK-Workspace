from pathlib import Path
from decouple import config
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from backups.snapshots import read_snapshot, restore_snapshot
from ._password import add_password_arguments, read_password


class Command(BaseCommand):
    help = 'Restaura una copia cifrada. Requiere --replace para reemplazar los datos y media.'

    def add_arguments(self, parser):
        parser.add_argument('--input', default=config('BOOKTRACK_DATA_SNAPSHOT', default=str(settings.BASE_DIR.parent/'data/booktrack.btbak')))
        parser.add_argument('--database', default='default')
        parser.add_argument('--replace', action='store_true', help='Confirma reemplazar los datos de la base y media configurados.')
        parser.add_argument('--check-only', action='store_true', help='Verifica clave e integridad sin cambiar datos.')
        add_password_arguments(parser)

    def handle(self, *args, **options):
        try:
            password = read_password(options)
            if options['check_only']:
                metadata, _ = read_snapshot(options['input'], password)
                self.stdout.write(f'Copia válida. Fecha: {metadata["created_at"]}. No se cambiaron datos.')
                return
            recovery = restore_snapshot(options['input'], password, replace=options['replace'], database=options['database'])
        except OSError as exc:
            raise CommandError(f'No se pudo leer o restaurar la copia: {exc}') from exc
        self.stdout.write(self.style.SUCCESS(f'Datos y media restaurados. Copia previa conservada en: {recovery}'))
