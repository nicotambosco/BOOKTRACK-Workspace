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
        pdf.cell(0, 10, 'Historial de préstamos', ln=True)
        pdf.set_font('Helvetica', size=9)
        for l in loans:
            texto = f'{l.estudiante} - {l.libro} - {l.tipo_prestamo} - {l.estado} - {l.fecha_inicio} a {l.fecha_fin or "?"}'
            pdf.multi_cell(0, 7, texto.encode('latin-1', 'replace').decode('latin-1'))
        response = HttpResponse(bytes(pdf.output()), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.pdf"'
        return response

    @action(detail=False, methods=['get'], url_path='export/excel')
    def export_excel(self, request):
        loans = self.get_queryset()
        wb = Workbook()
        ws = wb.active
        ws.title = 'Préstamos'
        ws.append(['Estudiante', 'Libro', 'Tipo', 'Estado', 'Fecha inicio', 'Fecha fin'])
        for l in loans:
            ws.append([str(l.estudiante), str(l.libro), l.tipo_prestamo, l.estado, str(l.fecha_inicio), str(l.fecha_fin or '')])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="historial-prestamos.xlsx"'
        wb.save(response)
        return response
