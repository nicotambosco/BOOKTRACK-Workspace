from django.urls import path
from .librarian_views import LibrarianActivityView, LibrarianDetailView, LibrarianListView

urlpatterns = [
    path('', LibrarianListView.as_view()),
    path('<str:pk>/', LibrarianDetailView.as_view()),
    path('<str:pk>/activity/', LibrarianActivityView.as_view()),
]
