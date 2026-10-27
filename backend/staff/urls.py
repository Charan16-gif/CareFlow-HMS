from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, StaffProfileViewSet

router = DefaultRouter()
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"profiles", StaffProfileViewSet, basename="staff-profile")

urlpatterns = [
    path("", include(router.urls)),
]
