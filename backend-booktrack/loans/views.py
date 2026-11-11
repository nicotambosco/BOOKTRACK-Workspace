from django.http import HttpResponse
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from openpyxl import Workbook
from fpdf import FPDF
from .models import AccionAdministrativa, Notificacion, Prestamo, Reserva
from .serializers import (AdminActionSerializer, LoanSerializer, NotificationSerializer, PickupSerializer,
                          ReservationSerializer)
from .permissions import IsLibrarian
from . import services


class LoanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        services.refresh_states()
        queryset = Prestamo.objects.select_related('usuario', 'ejemplar__libro', 'bibliotecario').all()
        if self.request.user.categoria != 'bibliotecario':
            queryset = queryset.filter(usuario=self.request.user)
        state = self.request.query_params.get('estado')
        if state:
            if state not in Prestamo.Estado.values:
                raise ValidationError({'estado': 'Estado de préstamo inválido.'})
            queryset = queryset.filter(estado=state)
        return queryset.order_by('-fecha_prestamo', '-id')

    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarian])
    def devolver(self, request, pk=None):
        return Response(self.get_serializer(services.return_loan(self.get_object(), request.user)).data)

    @action(detail=False, methods=['get'], url_path='export/pdf')
    def export_pdf(self, request):
        loans = self.get_queryset()
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Helvetica', size=14)
        pdf.cell(0, 10, 'Historial de prestamos', ln=True)
        pdf.ln(5)
        pdf.set_font('Helvetica', 'B', size=9)
        widths = [35, 40, 18, 20, 25, 25, 27]
        for width, label in zip(widths, ['Usuario', 'Libro', 'Ejemplar', 'Estado', 'Inicio', 'Vencimiento', 'Devolucion']):
            pdf.cell(width, 7, label)
        pdf.ln()
        pdf.set_font('Helvetica', size=8)
        for loan in loans:
            cells = [str(loan.usuario)[:18], loan.libro.titulo[:20],
                     loan.ejemplar_id[:10], loan.estado, str(loan.fecha_prestamo),
                     str(loan.fecha_vencimiento or '-'), str(loan.fecha_devolucion or '-')]
            for width, text in zip(widths, cells):
                pdf.cell(width, 7, text.encode('latin-1', 'replace').decode('latin-1'))
            pdf.ln()
        response = HttpResponse(bytes(pdf.output()), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.pdf"'
        return response

    @action(detail=False, methods=['get'], url_path='export/excel')
    def export_excel(self, request):
        loans = self.get_queryset()
        wb = Workbook()
        ws = wb.active
        ws.title = 'Prestamos'
        ws.append(['Usuario', 'Libro', 'Ejemplar', 'Estado', 'Fecha inicio', 'Fecha vencimiento', 'Fecha devolución'])
        for l in loans:
            nombre_estudiante = str(l.usuario)
            nombre_libro = l.libro.titulo
            fecha_fin = str(l.fecha_vencimiento) if l.fecha_vencimiento else ''
            ws.append([nombre_estudiante, nombre_libro, l.ejemplar_id, l.estado, str(l.fecha_prestamo), fecha_fin, str(l.fecha_devolucion or "")])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.xlsx"'
        wb.save(response)
        return response


class ReservationViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        services.refresh_states()
        queryset = Reserva.objects.select_related('usuario', 'libro', 'bibliotecario').all()
        if self.request.user.categoria != 'bibliotecario':
            queryset = queryset.filter(usuario=self.request.user)
        state = self.request.query_params.get('estado')
        if state:
            if state not in Reserva.Estado.values:
                raise ValidationError({'estado': 'Estado de reserva inválido.'})
            queryset = queryset.filter(estado=state)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.categoria != 'usuario':
            raise PermissionDenied('Solo los usuarios pueden reservar libros.')
        serializer.instance = services.create_reservation(usuario=self.request.user, **serializer.validated_data)

    @action(detail=True, methods=['patch'])
    def cancelar(self, request, pk=None):
        return Response(self.get_serializer(services.cancel_reservation(self.get_object(), request.user)).data)

    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarian])
    def retirar(self, request, pk=None):
        data = PickupSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        reservation = services.pick_up(self.get_object(), request.user, data.validated_data.get('ejemplarId'))
        return Response(self.get_serializer(reservation).data)



class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Avisos del usuario que consulta; un bibliotecario no recibe notificaciones."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        services.refresh_states()
        return Notificacion.objects.filter(usuario_id=self.request.user.pk if self.request.user.categoria == 'usuario' else None)


class AdminActionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminActionSerializer
    permission_classes = [IsLibrarian]
    queryset = AccionAdministrativa.objects.select_related('bibliotecario')
