from django.core.management.base import BaseCommand
from loans.services import refresh_states


class Command(BaseCommand):
    help = 'Marca reservas y préstamos vencidos según la fecha local de Argentina.'

    def handle(self, *args, **options):
        reservations, loans = refresh_states()
        self.stdout.write(f'Reservas vencidas: {reservations}; préstamos vencidos: {loans}')
