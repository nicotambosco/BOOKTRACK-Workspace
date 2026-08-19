from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
