from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AdminActionViewSet

router = DefaultRouter()
router.register(r'', AdminActionViewSet, basename='admin-action')
urlpatterns = [path('', include(router.urls))]
