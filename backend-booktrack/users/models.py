from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models


NIVEL_USUARIO, NIVEL_BIBLIOTECARIO, NIVEL_ADMIN = 0, 1, 2
CATEGORIA_POR_NIVEL = {NIVEL_USUARIO: 'usuario', NIVEL_BIBLIOTECARIO: 'bibliotecario', NIVEL_ADMIN: 'admin'}


class Persona(AbstractBaseUser):
    """Quien inicia sesión. La clave primaria es el legajo; cada rol vive en su propia tabla."""
    nombre = models.CharField(max_length=100, blank=True)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    imagen = models.TextField(blank=True)  # foto de perfil (data URI); fuera del diagrama
    is_active = models.BooleanField(default=True)
    nivel = models.PositiveSmallIntegerField(default=NIVEL_USUARIO)  # privilegios: 0 usuario, 1 bibliotecario, 2 admin

    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = []

    class Meta:
        abstract = True

    @property
    def categoria(self):
        return CATEGORIA_POR_NIVEL[self.nivel]

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

    id = models.CharField(max_length=50, primary_key=True, db_column='idUsuario')  # el legajo
    email_alternativo = models.EmailField(blank=True, db_column='emailAlternativo')
    telefono = models.CharField(max_length=30, blank=True)
    tipo_usuario = models.CharField(max_length=20, choices=TIPO_CHOICES, default='alumno', db_column='tipoUsuario')
    codigo = models.CharField(max_length=50, blank=True)  # código de invitación del registro; fuera del diagrama

    class Meta:
        db_table = 'Usuario'
        constraints = [models.CheckConstraint(condition=models.Q(nivel=NIVEL_USUARIO), name='usuario_nivel_0')]


class Bibliotecario(Persona):
    id = models.CharField(max_length=50, primary_key=True, db_column='idBibliotecario')  # el legajo
    nivel = models.PositiveSmallIntegerField(default=NIVEL_BIBLIOTECARIO)

    class Meta:
        db_table = 'Bibliotecario'
        constraints = [models.CheckConstraint(condition=models.Q(nivel=NIVEL_BIBLIOTECARIO), name='bibliotecario_nivel_1')]


class Administrador(Persona):
    """Cuenta propia, distinta de la del bibliotecario: gestiona a los bibliotecarios."""
    id = models.CharField(max_length=50, primary_key=True, db_column='idAdministrador')  # el legajo
    nivel = models.PositiveSmallIntegerField(default=NIVEL_ADMIN)

    class Meta:
        db_table = 'Administrador'
        constraints = [models.CheckConstraint(condition=models.Q(nivel=NIVEL_ADMIN), name='administrador_nivel_2')]


MODELO_POR_CATEGORIA = {'usuario': Usuario, 'bibliotecario': Bibliotecario, 'admin': Administrador}


def find_persona(legajo):
    """El legajo es único entre las tres tablas: devuelve a quien lo tiene, o None."""
    for model in (Administrador, Bibliotecario, Usuario):
        person = model.objects.filter(pk=legajo).first()
        if person:
            return person
    return None
