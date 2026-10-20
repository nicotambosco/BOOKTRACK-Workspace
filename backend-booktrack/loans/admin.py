from django.contrib import admin
from .models import Loan, Reservation


class LifecycleAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]


@admin.register(Loan)
class LoanAdmin(LifecycleAdmin):
    list_display = ['id', 'estudiante', 'libro', 'estado', 'fecha_vencimiento', 'fecha_devolucion']
    list_filter = ['estado']


@admin.register(Reservation)
class ReservationAdmin(LifecycleAdmin):
    list_display = ['codigo_reserva', 'estudiante', 'libro', 'estado', 'fecha_vencimiento', 'prioridad']
    list_filter = ['estado']
