"""Stock de un libro = cantidad de sus ejemplares disponibles."""
from django.db import transaction
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from .models import Ejemplar, Libro


def available_count(libro):
    return libro.ejemplares.filter(estado='disponible').count()


def add_copies(libro, amount):
    taken = set(Ejemplar.objects.filter(id__startswith=f'{libro.isbn}-').values_list('id', flat=True))
    number = 0
    created = []
    for _ in range(amount):
        number += 1
        while f'{libro.isbn}-{number:02d}' in taken:
            number += 1
        created.append(Ejemplar.objects.create(libro=libro, id=f'{libro.isbn}-{number:02d}'[:50]))
    return created


@transaction.atomic
def rename_copy(copy, code):
    from loans.models import Prestamo, AccionAdministrativa
    Libro.objects.select_for_update().get(pk=copy.libro_id)
    copy = Ejemplar.objects.select_for_update().get(pk=copy.pk)
    if code == copy.pk:
        return copy
    try:
        with transaction.atomic():
            renamed = Ejemplar.objects.create(id=code, libro_id=copy.libro_id, estado=copy.estado, observaciones=copy.observaciones)
    except IntegrityError:
        raise ValidationError({'nuevoCodigo': 'Ya existe un ejemplar con ese código.'})
    Prestamo.objects.filter(ejemplar=copy).update(ejemplar=renamed)
    AccionAdministrativa.objects.filter(ejemplar=copy).update(ejemplar=renamed)
    copy.delete()
    return renamed


@transaction.atomic
def set_available(libro, target):
    """Sube o baja los ejemplares disponibles. Los que sobran se dan de baja, no se borran (conservan su historial)."""
    libro = Libro.objects.select_for_update().get(pk=libro.pk)
    free = list(libro.ejemplares.select_for_update().filter(estado='disponible').order_by('-pk'))
    if target > len(free):
        add_copies(libro, target - len(free))
    for copy in free[:len(free) - target] if target < len(free) else []:
        copy.estado = 'baja'
        copy.save(update_fields=['estado'])
