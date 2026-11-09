from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .backup_views import DatabaseBackupViewSet

router = DefaultRouter()
router.register(r"", DatabaseBackupViewSet, basename="database-backups")

urlpatterns = [
    path("", include(router.urls)),
]

