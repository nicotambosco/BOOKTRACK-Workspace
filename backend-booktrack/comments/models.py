from django.db import models


class Comment(models.Model):
    # Solo los usuarios comentan; el comentario sobrevive si el usuario se elimina.
    usuario = models.ForeignKey('users.Usuario', on_delete=models.SET_NULL, null=True, blank=True, db_column='idUsuario')
    seccion = models.CharField(max_length=100)
    comentario = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comments'
