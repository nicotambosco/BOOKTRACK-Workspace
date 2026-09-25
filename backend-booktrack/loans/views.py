from django.http import HttpResponse
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from openpyxl import Workbook
from fpdf import FPDF
from .models import Loan
from .serializers import LoanSerializer


class LoanViewSet(viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.categoria == 'bibliotecario':
            queryset = Loan.objects.all()
        else:
            queryset = Loan.objects.filter(estudiante=user)
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset.order_by('-fecha_inicio')

    def perform_create(self, serializer):
        serializer.save(estudiante=self.request.user)

    @action(detail=True, methods=['patch'])
    @transaction.atomic
    def aprobar(self, request, pk=None):
        loan = self.get_object()
        if loan.estado != 'pendiente':
            return Response(LoanSerializer(loan).data)
        book = loan.libro
        if book.disponibles < 1:
            return Response({'detail': 'No hay ejemplares disponibles.'}, status=400)
        book.disponibles -= 1
        book.save(update_fields=['disponibles'])
        loan.estado = 'aprobado'
        loan.save(update_fields=['estado'])
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'])
    def denegar(self, request, pk=None):
        loan = self.get_object()
        loan.estado = 'denegado'
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'])
    @transaction.atomic
    def devolver(self, request, pk=None):
        loan = self.get_object()
        if loan.estado != 'aprobado':
            return Response(LoanSerializer(loan).data)
        book = loan.libro
        book.disponibles += 1
        book.save(update_fields=['disponibles'])
        loan.estado = 'devuelto'
        loan.save(update_fields=['estado'])
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'], url_path='solicitar-extension')
    def solicitar_extension(self, request, pk=None):
        loan = self.get_object()
        loan.extension_pendiente = True
        loan.extension_estado = ''
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'], url_path='aprobar-extension')
    def aprobar_extension(self, request, pk=None):
        import datetime
        loan = self.get_object()
        base = loan.fecha_fin or datetime.date.today()
        loan.fecha_fin = base + datetime.timedelta(days=7)
        loan.extension_pendiente = False
        loan.extension_estado = 'aprobada'
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'], url_path='denegar-extension')
    def denegar_extension(self, request, pk=None):
        loan = self.get_object()
        loan.extension_pendiente = False
        loan.extension_estado = 'denegada'
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=False, methods=['get'], url_path='export/pdf')
    def export_pdf(self, request):
        loans = self.get_queryset()
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Helvetica', size=14)
        pdf.cell(0, 10, 'Historial de prestamos', ln=True)
        pdf.ln(5)
        pdf.set_font('Helvetica', 'B', size=9)
        pdf.cell(50, 7, 'Estudiante')
        pdf.cell(50, 7, 'Libro')
        pdf.cell(30, 7, 'Tipo')
        pdf.cell(25, 7, 'Estado')
        pdf.cell(35, 7, 'Periodo')
        pdf.ln()
        pdf.set_font('Helvetica', size=8)
        for l in loans:
            nombre_estudiante = l.estudiante.nombre_apellido or str(l.estudiante)
            nombre_libro = l.libro.titulo if hasattr(l.libro, 'titulo') else str(l.libro)
            fecha_fin = str(l.fecha_fin) if l.fecha_fin else '-'
            periodo = f'{l.fecha_inicio} a {fecha_fin}'
            pdf.cell(50, 7, nombre_estudiante[:20])
            pdf.cell(50, 7, nombre_libro[:20])
            pdf.cell(30, 7, l.tipo_prestamo[:10])
            pdf.cell(25, 7, l.estado[:10])
            pdf.cell(35, 7, periodo[:15])
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
        ws.append(['Estudiante', 'Libro', 'Tipo', 'Estado', 'Fecha inicio', 'Fecha fin'])
        for l in loans:
            nombre_estudiante = l.estudiante.nombre_apellido or str(l.estudiante)
            nombre_libro = l.libro.titulo if hasattr(l.libro, 'titulo') else str(l.libro)
            fecha_fin = str(l.fecha_fin) if l.fecha_fin else ''
            ws.append([nombre_estudiante, nombre_libro, l.tipo_prestamo, l.estado, str(l.fecha_inicio), fecha_fin])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.xlsx"'
        wb.save(response)
        return response
