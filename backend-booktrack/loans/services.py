"""All lifecycle and stock changes are performed atomically here."""
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from books.models import Book
from .models import Loan, Reservation


def refresh_states():
    today = timezone.localdate()
    reservations = Reservation.objects.filter(estado='activa', fecha_vencimiento__lt=today).update(estado='vencida')
    loans = Loan.objects.filter(estado='vigente', fecha_vencimiento__lt=today).update(estado='vencido', extension_pendiente=False)
    return reservations, loans


@transaction.atomic
def create_reservation(*, estudiante, libro, fecha_vencimiento, fecha_devolucion_prevista):
    book = Book.objects.select_for_update().get(pk=libro.pk)
    if book.estado != 'activo':
        raise ValidationError('El libro está inactivo y no admite nuevas reservas.')
    today = timezone.localdate()
    if fecha_vencimiento < today or fecha_devolucion_prevista < fecha_vencimiento:
        raise ValidationError('Revisá las fechas de retiro y devolución.')
    Reservation.objects.filter(libro=book, estado='activa', fecha_vencimiento__lt=today).update(estado='vencida')
    if Reservation.objects.filter(libro=book, estudiante=estudiante, estado='activa').exists():
        raise ValidationError('Ya tenés una reserva activa para este libro.')
    return Reservation.objects.create(estudiante=estudiante, libro=book, fecha_vencimiento=fecha_vencimiento,
                                      fecha_devolucion_prevista=fecha_devolucion_prevista)


def _locked_reservation(reservation):
    # Consistent lock order for stock, pickup, return and priority changes.
    book = Book.objects.select_for_update().get(pk=reservation.libro_id)
    return book, Reservation.objects.select_for_update().get(pk=reservation.pk)


@transaction.atomic
def cancel_reservation(reservation, actor):
    _, reservation = _locked_reservation(reservation)
    if reservation.estado == 'cancelada':
        return reservation
    if reservation.estado != 'activa' or reservation.fecha_vencimiento < timezone.localdate():
        raise ValidationError('Solo se puede cancelar una reserva activa dentro del plazo de retiro.')
    reservation.estado = 'cancelada'
    if actor.categoria == 'bibliotecario':
        reservation.bibliotecario = actor
    reservation.save(update_fields=['estado', 'bibliotecario'])
    return reservation


@transaction.atomic
def prioritize_reservation(reservation, priority):
    _, reservation = _locked_reservation(reservation)
    if reservation.estado != 'activa' or reservation.fecha_vencimiento < timezone.localdate():
        raise ValidationError('Solo se puede priorizar una reserva activa.')
    reservation.prioridad = priority
    reservation.save(update_fields=['prioridad'])
    return reservation


@transaction.atomic
def pick_up(reservation, librarian):
    book, reservation = _locked_reservation(reservation)
    if reservation.estado == 'finalizada':
        return reservation
    today = timezone.localdate()
    if reservation.estado != 'activa' or reservation.fecha_vencimiento < today:
        raise ValidationError('La reserva no está activa o venció el plazo de retiro.')
    if book.estado != 'activo' or book.disponibles < 1:
        raise ValidationError('No hay ejemplares disponibles de este libro activo.')
    if reservation.fecha_devolucion_prevista is None or reservation.fecha_devolucion_prevista < today:
        raise ValidationError('Falta una fecha de devolución prevista válida; revisá la reserva histórica.')
    queue = Reservation.objects.filter(libro=book, estado='activa', fecha_vencimiento__gte=today)
    # Each available copy can serve one of the people at the head of the queue.
    if reservation.pk not in list(queue.values_list('pk', flat=True)[:book.disponibles]):
        raise ValidationError('Hay reservas con mayor prioridad esperando un ejemplar.')
    loan = Loan.objects.create(estudiante=reservation.estudiante, libro=book, fecha_inicio=today,
                               fecha_vencimiento=reservation.fecha_devolucion_prevista,
                               plazo_de_solicitud=f'{today} a {reservation.fecha_devolucion_prevista}')
    book.disponibles -= 1
    book.save(update_fields=['disponibles'])
    reservation.estado = 'finalizada'
    reservation.prestamo = loan
    reservation.bibliotecario = librarian
    reservation.save(update_fields=['estado', 'prestamo', 'bibliotecario'])
    return reservation


def _locked_loan(loan):
    book = Book.objects.select_for_update().get(pk=loan.libro_id)
    return book, Loan.objects.select_for_update().get(pk=loan.pk)


@transaction.atomic
def return_loan(loan):
    book, loan = _locked_loan(loan)
    if loan.estado == 'devuelto':
        return loan
    if loan.estado not in ['vigente', 'vencido']:
        raise ValidationError('El préstamo no admite devolución.')
    loan.estado = 'devuelto'
    loan.fecha_devolucion = timezone.localdate()
    loan.extension_pendiente = False
    loan.save(update_fields=['estado', 'fecha_devolucion', 'extension_pendiente'])
    book.disponibles += 1
    book.save(update_fields=['disponibles'])
    return loan


def _require_current(loan):
    if loan.estado != 'vigente' or (loan.fecha_vencimiento and loan.fecha_vencimiento < timezone.localdate()):
        raise ValidationError('Solo se puede renovar un préstamo vigente.')


@transaction.atomic
def request_extension(loan):
    _, loan = _locked_loan(loan)
    _require_current(loan)
    if loan.fecha_vencimiento is None:
        raise ValidationError('El préstamo histórico no tiene una fecha de vencimiento conocida.')
    loan.extension_pendiente = True
    loan.extension_estado = ''
    loan.save(update_fields=['extension_pendiente', 'extension_estado'])
    return loan


@transaction.atomic
def resolve_extension(loan, approved):
    _, loan = _locked_loan(loan)
    _require_current(loan)
    if not loan.extension_pendiente:
        raise ValidationError('No hay una solicitud de renovación pendiente.')
    if approved:
        if loan.fecha_vencimiento is None:
            raise ValidationError('El préstamo no tiene fecha de vencimiento.')
        loan.fecha_vencimiento += timedelta(days=7)
    loan.extension_pendiente = False
    loan.extension_estado = 'aprobada' if approved else 'denegada'
    loan.save(update_fields=['fecha_vencimiento', 'extension_pendiente', 'extension_estado'])
    return loan
