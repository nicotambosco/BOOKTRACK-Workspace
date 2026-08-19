from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    CATEGORIA_CHOICES = [('usuario', 'Usuario'), ('bibliotecario', 'Bibliotecario')]

    nombre_apellido = models.CharField(max_length=255, blank=True)
    legajo = models.CharField(max_length=50, unique=True, null=True, blank=True)
    codigo = models.CharField(max_length=50, blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='usuario')
    imagen = models.URLField(blank=True)

    class Meta:
        db_table = 'users'
