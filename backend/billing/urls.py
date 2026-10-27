from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillViewSet, BillItemViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r"bills", BillViewSet, basename="bills")
router.register(r"invoices", BillViewSet, basename="bill")
router.register(r"items", BillItemViewSet, basename="bill-item")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("", include(router.urls)),
]
