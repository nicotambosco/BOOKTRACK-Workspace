"""Fábrica de libros para los tests: el stock son ejemplares disponibles."""
from itertools import count
from . import services
from .models import Libro

_isbn = count(1)


def make_book(titulo='Libro', disponibles=1, isbn=None, **fields):
    fields.setdefault('categoria', 'Basicas')
    libro = Libro.objects.create(isbn=isbn or f'TEST-{next(_isbn):06d}', titulo=titulo, **fields)
    services.add_copies(libro, disponibles)
    return libro


stock = services.available_count
set_stock = services.set_available
