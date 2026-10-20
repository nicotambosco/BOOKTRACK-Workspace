from pathlib import Path
from decouple import config
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from backups.snapshots import export_snapshot
from ._password import add_password_arguments, read_password


class Command(BaseCommand):
    help = 'Crea una copia cifrada de todos los datos de Django y los archivos de media.'

    def add_arguments(self, parser):
        parser.add_argument('--output', default=config('BOOKTRACK_DATA_SNAPSHOT', default=str(settings.BASE_DIR.parent/'data/booktrack.btbak')))
        parser.add_argument('--database', default='default')
        add_password_arguments(parser)

    def handle(self, *args, **options):
        try:
            password = read_password(options, confirm=True)
            export_snapshot(options['output'], password, options['database'])
        except OSError as exc:
            raise CommandError(f'No se pudo escribir la copia: {exc}') from exc
        self.stdout.write(self.style.SUCCESS(f'Copia cifrada creada: {Path(options["output"]).absolute()}'))
