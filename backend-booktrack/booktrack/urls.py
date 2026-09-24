from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    # ── Auth ──────────────────────────────────────────────────────
    path('api/users/', include('users.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    # ── Recursos ──────────────────────────────────────────────────
    path('api/books/', include('books.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/comments/', include('comments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
