"""Jerarquía de roles compartida por los endpoints que alteran accesos."""
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import ADMIN_PRINCIPAL_LEGAJO, CATEGORIA_POR_NIVEL

RANGO_POR_ROL = {rol: nivel for nivel, rol in CATEGORIA_POR_NIVEL.items()}


def es_admin_fijo(persona):
    return persona.pk == ADMIN_PRINCIPAL_LEGAJO and 'admin' in persona.roles


def rango_maximo(persona):
    return max((RANGO_POR_ROL[rol] for rol in persona.roles), default=-1)


def validar_cambio_roles(actor, persona, roles):
    actuales, elegidos = set(persona.roles), set(roles)
    if not set(persona.roles_fijos) <= elegidos:
        raise ValidationError('El rol administrador de la cuenta principal es fijo.')
    if es_admin_fijo(actor):
        return
    agregados, quitados = elegidos - actuales, actuales - elegidos
    rango = rango_maximo(actor)
    if actor.pk == persona.pk:
        if agregados:
            raise PermissionDenied('No podés asignarte roles. Solo el administrador principal puede hacerlo.')
        if any(RANGO_POR_ROL[rol] >= rango for rol in quitados):
            raise PermissionDenied('Solo podés quitarte roles inferiores a tu rango más alto.')
    else:
        if actor.categoria != 'admin':
            raise PermissionDenied('Esta operación requiere la vista administrador.')
        if any(RANGO_POR_ROL[rol] >= rango for rol in agregados | quitados):
            raise PermissionDenied('Solo el administrador principal puede asignar o quitar el rol admin.')
