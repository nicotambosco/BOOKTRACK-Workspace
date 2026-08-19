from django.urls import path
from .views import LoginView, RegisterView, ProfileView, UserListView, UserDetailView

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('register/', RegisterView.as_view()),
    path('me/', ProfileView.as_view()),
    path('', UserListView.as_view()),
    path('<int:pk>/', UserDetailView.as_view()),
]
