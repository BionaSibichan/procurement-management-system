from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

# Register ViewSets
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'vendors', views.VendorViewSet, basename='vendor')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'purchase-requests', views.PurchaseRequestViewSet, basename='purchase-request')
router.register(r'goods-receipts', views.GoodsReceiptViewSet, basename='goodsreceipt')
router.register(r'rfqs', views.RequestForQuotationViewSet, basename='rfq')
router.register(r'vendor-quotations', views.VendorQuotationViewSet, basename='vendor-quotation')
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchase-order')
router.register(r'purchase-order-items', views.PurchaseOrderItemViewSet, basename='purchase-order-item')
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'vendor-dashboard', views.VendorDashboardViewSet, basename='vendor-dashboard')

urlpatterns = [
    # Include all router URLs
    path('', include(router.urls)),
    
    # Auth endpoints
    path('auth/csrf/', views.get_csrf_token, name='csrf'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/current-user/', views.current_user, name='current-user'),
    path('auth/check/', views.check_auth, name='check_auth'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark-all-notifications-read'),
     
    # Dashboard endpoints
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),

    # ADD THIS NEW LINE:
    path('vendor/register/', views.vendor_self_register, name='vendor-register'),
]