from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsLibrarian(BasePermission):
    message = 'Esta operación requiere el rol bibliotecario.'

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.categoria == 'bibliotecario')


class ReadOnlyOrLibrarian(IsLibrarian):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or super().has_permission(request, view)
