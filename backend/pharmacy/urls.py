from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicineViewSet,
    StockMovementViewSet,
    PrescriptionViewSet,
    PrescriptionItemViewSet,
    MedicineDispenseViewSet,
)

router = DefaultRouter()
router.register(r"medicines", MedicineViewSet, basename="medicine")
router.register(r"stock-movements", StockMovementViewSet, basename="stock-movement")
router.register(r"prescriptions", PrescriptionViewSet, basename="prescription")
router.register(r"items", PrescriptionItemViewSet, basename="prescription-item")
router.register(r"dispensations", MedicineDispenseViewSet, basename="dispense")

urlpatterns = [
    path("", include(router.urls)),
]
