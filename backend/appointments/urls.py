from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, PatientFeedbackViewSet, MedicalQueryViewSet

router = DefaultRouter()
router.register(r"feedback", PatientFeedbackViewSet, basename="patient-feedback")
router.register(r"medical-queries", MedicalQueryViewSet, basename="medical-query")
router.register(r"", AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("", include(router.urls)),
]
