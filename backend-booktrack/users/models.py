from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models


class Persona(AbstractBaseUser):
    """Quien inicia sesión. La clave primaria es el legajo; cada rol vive en su propia tabla."""
    nombre = models.CharField(max_length=100, blank=True)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    imagen = models.TextField(blank=True)  # foto de perfil (data URI); fuera del diagrama
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = []

    class Meta:
        abstract = True

    @property
    def legajo(self):
        return self.pk

    @property
    def nombre_apellido(self):
        return f'{self.nombre} {self.apellido}'.strip()

    def __str__(self):
        return self.nombre_apellido or str(self.pk)


class Usuario(Persona):
    TIPO_CHOICES = [('alumno', 'Alumno'), ('docente', 'Docente')]
    categoria = 'usuario'

    id = models.CharField(max_length=50, primary_key=True, db_column='idUsuario')  # el legajo
    email_alternativo = models.EmailField(blank=True, db_column='emailAlternativo')
    telefono = models.CharField(max_length=30, blank=True)
    tipo_usuario = models.CharField(max_length=20, choices=TIPO_CHOICES, default='alumno', db_column='tipoUsuario')
    codigo = models.CharField(max_length=50, blank=True)  # código de invitación del registro; fuera del diagrama

    class Meta:
        db_table = 'Usuario'


class Bibliotecario(Persona):
    categoria = 'bibliotecario'

    id = models.CharField(max_length=50, primary_key=True, db_column='idBibliotecario')  # el legajo

    class Meta:
        db_table = 'Bibliotecario'


def find_persona(legajo):
    """El legajo es único entre las dos tablas: devuelve al bibliotecario o usuario que lo tiene, o None."""
    return Bibliotecario.objects.filter(pk=legajo).first() or Usuario.objects.filter(pk=legajo).first()
