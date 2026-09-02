from django.http import HttpResponse
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
        # bibliotecario ve todos; usuario solo los suyos
        if user.categoria == 'bibliotecario':
            return Loan.objects.all().order_by('-fecha_inicio')
        return Loan.objects.filter(estudiante=user).order_by('-fecha_inicio')

    def perform_create(self, serializer):
        serializer.save(estudiante=self.request.user)

    @action(detail=True, methods=['patch'])
    def aprobar(self, request, pk=None):
        loan = self.get_object()
        loan.estado = 'aprobado'
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'])
    def denegar(self, request, pk=None):
        loan = self.get_object()
        loan.estado = 'denegado'
        loan.save()
        return Response(LoanSerializer(loan).data)

    @action(detail=True, methods=['patch'])
    def devolver(self, request, pk=None):
        loan = self.get_object()
        loan.estado = 'devuelto'
        loan.save()
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
            nombre_estudiante = l.estudiante.nombreApellido if hasattr(l.estudiante, 'nombreApellido') else str(l.estudiante)
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
            nombre_estudiante = l.estudiante.nombreApellido if hasattr(l.estudiante, 'nombreApellido') else str(l.estudiante)
            nombre_libro = l.libro.titulo if hasattr(l.libro, 'titulo') else str(l.libro)
            fecha_fin = str(l.fecha_fin) if l.fecha_fin else ''
            ws.append([nombre_estudiante, nombre_libro, l.tipo_prestamo, l.estado, str(l.fecha_inicio), fecha_fin])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.xlsx"'
        wb.save(response)
        return response
