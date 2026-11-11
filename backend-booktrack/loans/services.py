"""All lifecycle and stock changes are performed atomically here.

El stock de un libro son sus ejemplares disponibles: retirar una reserva presta un ejemplar y devolver lo libera.
Cada cambio relevante deja una Notificacion para el usuario y/o una AccionAdministrativa del bibliotecario.
"""
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from books.models import Ejemplar, Libro
from users.models import Bibliotecario
from .models import AccionAdministrativa, Notificacion, Prestamo, Reserva


def _notify(usuario, tipo, mensaje, reserva=None, prestamo=None):
    return Notificacion(usuario=usuario, tipo=tipo, mensaje=mensaje, reserva=reserva, prestamo=prestamo)


def _librarian(actor):
    return actor if isinstance(actor, Bibliotecario) else None


def _log(actor, tipo, descripcion, **refs):
    """Solo los bibliotecarios dejan registro administrativo."""
    librarian = _librarian(actor)
    if librarian is not None:
        AccionAdministrativa.objects.create(bibliotecario=librarian, tipo_accion=tipo, descripcion=descripcion, **refs)


def _previous_business_day(day):
    day -= timedelta(days=1)
    while day.weekday() >= 5:  # sábado y domingo no cuentan
        day -= timedelta(days=1)
    return day


def refresh_states():
    today = timezone.localdate()
    late_reservations = list(Reserva.objects.filter(estado='activa', fecha_retiro__lt=today).select_related('libro', 'usuario'))
    changed = Reserva.objects.filter(pk__in=[r.pk for r in late_reservations], estado='activa').update(estado='vencida')
    if changed == len(late_reservations):  # si otro pedido ganó la carrera, él ya notificó
        Notificacion.objects.bulk_create([
            _notify(r.usuario, 'reserva_vencida', f'Tu reserva de "{r.libro.titulo}" venció sin retirarse.', reserva=r)
            for r in late_reservations])
    late_loans = list(Prestamo.objects.filter(estado='vigente', fecha_vencimiento__lt=today).select_related('ejemplar__libro', 'usuario'))
    overdue = Prestamo.objects.filter(pk__in=[p.pk for p in late_loans], estado='vigente').update(estado='vencido')
    if overdue == len(late_loans):
        Notificacion.objects.bulk_create([
            _notify(p.usuario, 'prestamo_vencido', f'Tu préstamo de "{p.ejemplar.libro.titulo}" está vencido. Devolvelo cuanto antes.', prestamo=p)
            for p in late_loans])
    # Aviso de "vence pronto": desde el día hábil anterior al vencimiento, una sola vez por préstamo.
    soon = Prestamo.objects.filter(estado='vigente', fecha_vencimiento__gte=today, fecha_vencimiento__lte=today + timedelta(days=4))         .exclude(notificaciones__tipo='prestamo_por_vencer').select_related('ejemplar__libro', 'usuario')
    Notificacion.objects.bulk_create([
        _notify(p.usuario, 'prestamo_por_vencer', f'Tu préstamo de "{p.ejemplar.libro.titulo}" vence el {p.fecha_vencimiento:%d/%m/%Y}.', prestamo=p)
        for p in soon if _previous_business_day(p.fecha_vencimiento) <= today])
    return changed, overdue


@transaction.atomic
def create_reservation(*, usuario, libro, fecha_retiro, fecha_vencimiento):
    book = Libro.objects.select_for_update().get(pk=libro.pk)
    if book.estado != 'activo':
        raise ValidationError('El libro está inactivo y no admite nuevas reservas.')
    today = timezone.localdate()
    if fecha_retiro < today or fecha_vencimiento < fecha_retiro:
        raise ValidationError('Revisá las fechas de retiro y vencimiento.')
    Reserva.objects.filter(libro=book, estado='activa', fecha_retiro__lt=today).update(estado='vencida')
    if Reserva.objects.filter(libro=book, usuario=usuario, estado='activa').exists():
        raise ValidationError('Ya tenés una reserva activa para este libro.')
    reservation = Reserva.objects.create(usuario=usuario, libro=book, fecha_retiro=fecha_retiro, fecha_vencimiento=fecha_vencimiento)
    _notify(usuario, 'reserva_creada', f'Reservaste "{book.titulo}". Retiralo hasta el {fecha_retiro:%d/%m/%Y}.',
            reserva=reservation).save()
    return reservation


def _locked_reservation(reservation):
    # Consistent lock order for stock, pickup and return.
    book = Libro.objects.select_for_update().get(pk=reservation.libro_id)
    return book, Reserva.objects.select_for_update().get(pk=reservation.pk)


@transaction.atomic
def cancel_reservation(reservation, actor):
    book, reservation = _locked_reservation(reservation)
    if reservation.estado == 'cancelada':
        return reservation
    if reservation.estado != 'activa' or reservation.fecha_retiro < timezone.localdate():
        raise ValidationError('Solo se puede cancelar una reserva activa dentro del plazo de retiro.')
    reservation.estado = 'cancelada'
    librarian = _librarian(actor)
    if librarian is not None:
        reservation.bibliotecario = librarian
    reservation.save(update_fields=['estado', 'bibliotecario'])
    if librarian is not None:
        _log(actor, 'cancelacion_reserva', f'Canceló la reserva #{reservation.pk}.', reserva=reservation, libro=book)
        _notify(reservation.usuario, 'reserva_cancelada', f'La biblioteca canceló tu reserva de "{book.titulo}".', reserva=reservation).save()
    return reservation


@transaction.atomic
def pick_up(reservation, actor, ejemplar_id=None):
    book, reservation = _locked_reservation(reservation)
    if reservation.estado == 'finalizada':
        return reservation
    today = timezone.localdate()
    if reservation.estado != 'activa' or reservation.fecha_retiro < today:
        raise ValidationError('La reserva no está activa o venció el plazo de retiro.')
    copies = list(Ejemplar.objects.select_for_update().filter(libro=book, estado='disponible').order_by('pk'))
    if book.estado != 'activo' or not copies:
        raise ValidationError('No hay ejemplares disponibles de este libro activo.')
    queue = Reserva.objects.filter(libro=book, estado='activa', fecha_retiro__gte=today).order_by('fecha_reserva', 'id')
    # Each available copy can serve one of the people at the head of the queue.
    if reservation.pk not in list(queue.values_list('pk', flat=True)[:len(copies)]):
        raise ValidationError('Hay reservas anteriores esperando un ejemplar.')
    if ejemplar_id is not None and not isinstance(ejemplar_id, str):
        raise ValidationError('El identificador del ejemplar debe ser texto.')
    copy = next((item for item in copies if item.pk == ejemplar_id), None) if ejemplar_id is not None else copies[0]
    if copy is None:
        raise ValidationError('El ejemplar seleccionado no está disponible para este libro.')
    librarian = _librarian(actor)
    loan = Prestamo.objects.create(usuario=reservation.usuario, ejemplar=copy, fecha_prestamo=today,
                                   fecha_vencimiento=reservation.fecha_vencimiento, bibliotecario=librarian)
    copy.estado = 'prestado'
    copy.save(update_fields=['estado'])
    reservation.estado = 'finalizada'
    reservation.prestamo = loan
    reservation.bibliotecario = librarian
    reservation.save(update_fields=['estado', 'prestamo', 'bibliotecario'])
    _log(actor, 'retiro_reserva', f'Entregó el ejemplar {copy.pk} de la reserva #{reservation.pk}.',
         reserva=reservation, prestamo=loan, libro=book, ejemplar=copy)
    _notify(reservation.usuario, 'prestamo_iniciado',
            f'Retiraste "{book.titulo}". Devolvelo antes del {loan.fecha_vencimiento:%d/%m/%Y}.',
            reserva=reservation, prestamo=loan).save()
    return reservation


def _locked_loan(loan):
    book = Libro.objects.select_for_update().get(pk=loan.ejemplar.libro_id)
    return book, Prestamo.objects.select_for_update().select_related('ejemplar', 'usuario').get(pk=loan.pk)


@transaction.atomic
def return_loan(loan, actor=None):
    book, loan = _locked_loan(loan)
    if loan.estado == 'devuelto':
        return loan
    if loan.estado not in ['vigente', 'vencido']:
        raise ValidationError('El préstamo no admite devolución.')
    loan.estado = 'devuelto'
    loan.fecha_devolucion = timezone.localdate()
    loan.save(update_fields=['estado', 'fecha_devolucion'])
    copy = Ejemplar.objects.select_for_update().get(pk=loan.ejemplar_id)
    if copy.estado == 'prestado':
        copy.estado = 'disponible'
        copy.save(update_fields=['estado'])
    _log(actor, 'devolucion', f'Registró la devolución del ejemplar {copy.pk}.', prestamo=loan, libro=book, ejemplar=copy)
    _notify(loan.usuario, 'devolucion_registrada', f'Registramos la devolución de "{book.titulo}". ¡Gracias!', prestamo=loan).save()
    return loan
