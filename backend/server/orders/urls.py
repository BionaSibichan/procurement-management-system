from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet

router = DefaultRouter()
router.register('orders', PurchaseOrderViewSet)

urlpatterns = router.urls
