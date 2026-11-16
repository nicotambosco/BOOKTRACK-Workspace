from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────
    path('api/users/', include('users.urls')),
    path('api/librarians/', include('users.librarian_urls')),
    path('api/roles/', include('users.role_urls')),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    # ── Recursos ──────────────────────────────────────────────────
    path('api/books/', include('books.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/reservations/', include('loans.reservation_urls')),
    path('api/copies/', include('books.copy_urls')),
    path('api/notifications/', include('loans.notification_urls')),
    path('api/admin-actions/', include('loans.action_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
