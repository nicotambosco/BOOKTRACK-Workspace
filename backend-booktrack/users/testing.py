"""Fábrica de personas para los tests: el legajo es la clave primaria y el rol decide la tabla."""
from .models import Bibliotecario, Usuario


def make_user(legajo, rol='usuario', password='clave-segura', nombre='', apellido='', email='', **extra):
    model = Bibliotecario if rol == 'bibliotecario' else Usuario
    user = model(id=legajo, nombre=nombre, apellido=apellido, email=email, **extra)
    user.set_password(password)
    user.save()
    return user
