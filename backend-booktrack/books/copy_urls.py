from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import EjemplarViewSet

router = DefaultRouter()
router.register(r'', EjemplarViewSet, basename='ejemplar')
urlpatterns = [path('', include(router.urls))]
