from rest_framework.routers import DefaultRouter
from .views import VendorViewSet

router = DefaultRouter()
router.register(r'vendors', VendorViewSet)

urlpatterns = router.urls
