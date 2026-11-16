from django.urls import path
from .role_views import PeopleView, PersonRoleView

urlpatterns = [
    path('', PeopleView.as_view()),
    path('<str:pk>/', PersonRoleView.as_view()),
]
