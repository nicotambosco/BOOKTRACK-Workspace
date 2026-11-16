from django.contrib.auth.base_user import AbstractBaseUser
from django.core.exceptions import ValidationError
from django.db import models, transaction


NIVEL_USUARIO, NIVEL_BIBLIOTECARIO, NIVEL_ADMIN = 0, 1, 2
CATEGORIA_POR_NIVEL = {NIVEL_USUARIO: 'usuario', NIVEL_BIBLIOTECARIO: 'bibliotecario', NIVEL_ADMIN: 'admin'}
ADMIN_PRINCIPAL_LEGAJO = 'ADMIN-1'


class Persona(AbstractBaseUser):
    """Identidad compartida por legajo: cada fila activa habilita uno de sus roles."""
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
    def roles(self):
        return [rol for rol, modelo in MODELO_POR_CATEGORIA.items()
                if modelo.objects.filter(pk=self.pk, is_active=True).exists()]

    @property
    def roles_fijos(self):
        return ['admin'] if self.pk == ADMIN_PRINCIPAL_LEGAJO else []

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
    """Habilita la vista admin; puede coexistir con otros roles del mismo legajo."""
    id = models.CharField(max_length=50, primary_key=True, db_column='idAdministrador')  # el legajo
    nivel = models.PositiveSmallIntegerField(default=NIVEL_ADMIN)

    def save(self, *args, **kwargs):
        if self.pk == ADMIN_PRINCIPAL_LEGAJO and not self.is_active:
            raise ValidationError('El rol administrador de la cuenta principal es fijo.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.pk == ADMIN_PRINCIPAL_LEGAJO:
            raise ValidationError('No se puede eliminar el administrador principal.')
        return super().delete(*args, **kwargs)

    class Meta:
        db_table = 'Administrador'
        constraints = [models.CheckConstraint(condition=models.Q(nivel=NIVEL_ADMIN), name='administrador_nivel_2')]


MODELO_POR_CATEGORIA = {'usuario': Usuario, 'bibliotecario': Bibliotecario, 'admin': Administrador}


MODELO_POR_NIVEL = {NIVEL_USUARIO: Usuario, NIVEL_BIBLIOTECARIO: Bibliotecario, NIVEL_ADMIN: Administrador}
CAMPOS_COMPARTIDOS = ['nombre', 'apellido', 'email', 'imagen', 'password']


def find_persona(legajo, solo_activas=False):
    """Identidad principal por legajo: prioriza admin, bibliotecario y usuario activos."""
    filas = [m.objects.filter(pk=legajo).first() for m in (Administrador, Bibliotecario, Usuario)]
    filas = [p for p in filas if p]
    return next((p for p in filas if p.is_active), None if solo_activas else (filas[0] if filas else None))


def sincronizar_persona(persona):
    """Las filas por rol pertenecen a una única identidad y comparten credenciales y ficha."""
    datos = {campo: getattr(persona, campo) for campo in CAMPOS_COMPARTIDOS}
    for modelo in MODELO_POR_CATEGORIA.values():
        modelo.objects.filter(pk=persona.pk).update(**datos)


@transaction.atomic
def asignar_roles(persona, roles):
    """Activa los roles elegidos sin borrar filas ni relaciones históricas."""
    elegidos = set(roles)
    if not elegidos or not elegidos <= set(MODELO_POR_CATEGORIA):
        raise ValueError('Elegí al menos un rol válido.')
    if not set(persona.roles_fijos) <= elegidos:
        raise ValidationError('El rol administrador de la cuenta principal es fijo.')
    filas = [m.objects.select_for_update().filter(pk=persona.pk).first()
             for m in (Administrador, Bibliotecario, Usuario)]
    origen = next(p for p in filas if p and p.is_active)
    datos = {campo: getattr(origen, campo) for campo in CAMPOS_COMPARTIDOS}
    for rol, modelo in MODELO_POR_CATEGORIA.items():
        fila = next((p for p in filas if isinstance(p, modelo)), None)
        if fila is None and rol not in elegidos:
            continue
        fila = fila or modelo(id=persona.pk)
        for campo, valor in datos.items():
            setattr(fila, campo, valor)
        fila.is_active = rol in elegidos
        fila.save()
    return find_persona(persona.pk, solo_activas=True)


def cambiar_nivel(persona, nivel):
    """Compatibilidad con el contrato anterior de asignación de un solo nivel."""
    return asignar_roles(persona, [CATEGORIA_POR_NIVEL[nivel]])
