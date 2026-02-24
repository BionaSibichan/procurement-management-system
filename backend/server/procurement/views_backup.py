from urllib import request
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.db.models import Count, Sum, Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password


import json
import secrets
import string
from django.utils import timezone
from datetime import datetime, timedelta


from .models import (
    Vendor, Category, Product, PurchaseOrder, 
    PurchaseOrderItem, Invoice, Payment, EmployeeProfile,
    PurchaseRequest, GoodsReceipt, Notification,
    RequestForQuotation, VendorQuotation
)
from .serializers import (
    InvoiceUploadSerializer, VendorSerializer, CategorySerializer, ProductSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    InvoiceSerializer, PaymentSerializer, EmployeeSerializer, 
    VendorPurchaseOrderSerializer, DeliveryStatusUpdateSerializer,
    PurchaseRequestSerializer, GoodsReceiptSerializer, NotificationSerializer,
    RequestForQuotationSerializer, VendorQuotationSerializer
)


# ==================== UTILITY FUNCTIONS ====================

def generate_temp_password(length=12):
    """Generate a secure temporary password"""
    characters = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_rfq_number():
    """Generate unique RFQ number"""
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"RFQ-{timestamp}-{random_suffix}"


def generate_quotation_number():
    """Generate unique quotation number"""
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"QUOTE-{timestamp}-{random_suffix}"


# ==================== AUTH VIEWS ====================

@ensure_csrf_cookie
def get_csrf_token(request):
    """Endpoint to get CSRF token"""
    return JsonResponse({'csrfToken': get_token(request)})


@csrf_exempt
def login_view(request):
    """Handle user login"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                
                # Determine user role
                role = 'employee'  # default role
                if user.is_superuser:
                    role = 'admin'
                elif hasattr(user, 'profile'):
                    role = user.profile.role
                
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': role,
                    }
                })
            else:
                return JsonResponse({
                    'error': 'Invalid username or password'
                }, status=401)
                
        except Exception as e:
            return JsonResponse({
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def logout_view(request):
    """Handle user logout"""
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logout successful'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def check_auth(request):
    """Check if user is authenticated"""
    if request.user.is_authenticated:
        role = 'employee'
        if request.user.is_superuser:
            role = 'admin'
        elif hasattr(request.user, 'profile'):
            role = request.user.profile.role
            
        return JsonResponse({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'role': role,
            }
        })
    return JsonResponse({'authenticated': False}, status=401)


def current_user(request):
    """Get current logged-in user"""
    if request.user.is_authenticated:
        role = 'employee'
        if request.user.is_superuser:
            role = 'admin'
        elif hasattr(request.user, 'profile'):
            role = request.user.profile.role
            
        return JsonResponse({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': role,
        })
    return JsonResponse({'error': 'Not authenticated'}, status=401)


# ==================== DASHBOARD VIEWS ====================

def dashboard_stats(request):
    """Get dashboard statistics"""
    try:
        from .models import UserProfile
        
        vendor_user_ids = list(UserProfile.objects.filter(
            role='vendor'
        ).values_list('user_id', flat=True))
        
        vendor_user_ids_direct = list(Vendor.objects.filter(
            user__isnull=False
        ).values_list('user_id', flat=True))
        
        all_vendor_user_ids = list(set(vendor_user_ids + vendor_user_ids_direct))
        
        base_query = User.objects.filter(
            is_staff=False, 
            is_superuser=False
        )
        
        total_employees = base_query.exclude(
            id__in=all_vendor_user_ids
        ).count()
        
        active_employees = base_query.filter(
            is_active=True
        ).exclude(
            id__in=all_vendor_user_ids
        ).count()
        
        stats = {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'total_vendors': Vendor.objects.count(),
            'active_vendors': Vendor.objects.filter(is_active=True).count(),
            'total_products': Product.objects.count(),
            'total_purchase_orders': PurchaseOrder.objects.count(),
            'pending_orders': PurchaseOrder.objects.filter(status='pending').count(),
            'total_invoices': Invoice.objects.count(),
            'pending_invoices': Invoice.objects.filter(status='pending').count(),
            'total_purchase_requests': PurchaseRequest.objects.count(),
            'pending_purchase_requests': PurchaseRequest.objects.filter(status='pending').count(),
            'approved_purchase_requests': PurchaseRequest.objects.filter(status='approved').count(),
            'rejected_purchase_requests': PurchaseRequest.objects.filter(status='rejected').count(),
            'total_rfqs': RequestForQuotation.objects.count(),
            'pending_rfqs': RequestForQuotation.objects.filter(status='sent').count(),
            'received_quotations': RequestForQuotation.objects.filter(status='received').count(),
        }
        
        return JsonResponse(stats)
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


# ==================== EMPLOYEE VIEWSET ====================

class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for Employee management with full CRUD - EXCLUDES VENDORS"""
    serializer_class = EmployeeSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        from .models import UserProfile
        
        queryset = User.objects.filter(is_staff=False, is_superuser=False)
        
        vendor_user_ids = UserProfile.objects.filter(role='vendor').values_list('user_id', flat=True)
        queryset = queryset.exclude(id__in=vendor_user_ids)
        
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        department = self.request.query_params.get('department', None)
        if department:
            queryset = queryset.filter(employee_profile__department=department)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        return queryset.order_by('-date_joined')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.save()
        
        from .models import UserProfile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': 'employee'}
        )
        profile.role = 'employee'
        profile.save()
        
        response_data = serializer.data
        response_data['temporary_password'] = temp_password
        response_data['message'] = 'Employee created successfully. Share the temporary password securely.'
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        from .models import UserProfile
        if hasattr(instance, 'profile') and instance.profile.role == 'vendor':
            return Response({
                'error': 'Cannot edit vendor accounts in employee management. Use vendor management instead.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            **serializer.data,
            'message': 'Employee updated successfully'
        })
    
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            from .models import UserProfile
            if hasattr(instance, 'profile') and instance.profile.role == 'vendor':
                return Response({
                    'error': 'Cannot delete vendor accounts from employee management. Use vendor management instead.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            employee_id = instance.id
            username = instance.username
            
            try:
                EmployeeProfile.objects.filter(user=instance).delete()
            except Exception as e:
                print(f"Note: No EmployeeProfile found or error deleting: {e}")
            
            try:
                UserProfile.objects.filter(user=instance).delete()
            except Exception as e:
                print(f"Note: No UserProfile found or error deleting: {e}")
            
            PurchaseRequest.objects.filter(employee=instance).update(employee=None)
            
            try:
                Notification.objects.filter(user=instance).delete()
            except Exception as e:
                print(f"Note: Error deleting notifications: {e}")
            
            try:
                GoodsReceipt.objects.filter(received_by=instance).update(received_by=None)
            except Exception as e:
                print(f"Note: Error updating GoodsReceipts: {e}")
            
            try:
                PurchaseOrder.objects.filter(assigned_to=instance).update(assigned_to=None)
            except Exception as e:
                print(f"Note: Error updating PurchaseOrders: {e}")
            
            instance.delete()
            
            return Response({
                'message': f'Employee {username} deleted successfully',
                'employee_id': employee_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            print(f"ERROR deleting employee: {str(e)}")
            traceback.print_exc()
            
            return Response({
                'error': f'Failed to delete employee: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save()
        
        return Response({
            'message': 'Employee activated successfully',
            'employee': self.get_serializer(instance).data
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'Employee deactivated successfully',
            'employee': self.get_serializer(instance).data
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        instance = self.get_object()
        
        from .models import UserProfile
        if hasattr(instance, 'profile') and instance.profile.role == 'vendor':
            return Response({
                'error': 'Cannot reset vendor passwords from employee management. Use vendor management instead.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        temp_password = generate_temp_password()
        instance.set_password(temp_password)
        instance.save()
        
        return Response({
            'message': 'Password reset successfully',
            'username': instance.username,
            'temporary_password': temp_password
        })
    
    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        instance = self.get_object()
        
        if request.user.is_authenticated and request.user.id != instance.id:
            return Response({
                'error': 'You can only change your own password'
            }, status=status.HTTP_403_FORBIDDEN)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Both current_password and new_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_password(current_password, instance.password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.set_password(new_password)
        instance.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


# ==================== VENDOR VIEWSET ====================

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def create_user_account(self, request, pk=None):
        vendor = self.get_object()
        
        from .models import UserProfile
        existing_profiles = UserProfile.objects.filter(vendor=vendor)
        if existing_profiles.exists():
            existing_user = existing_profiles.first().user
            return Response({
                'error': 'Vendor already has a user account',
                'username': existing_user.username
            }, status=status.HTTP_400_BAD_REQUEST)
        
        username = request.data.get('username', '')
        if not username:
            username = vendor.company_name.lower().replace(' ', '').replace('-', '')[:20]
        
        original_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1
        
        temp_password = generate_temp_password()
        
        try:
            user = User.objects.create_user(
                username=username,
                email=vendor.email,
                password=temp_password,
                first_name=vendor.contact_person.split()[0] if vendor.contact_person else '',
                last_name=' '.join(vendor.contact_person.split()[1:]) if vendor.contact_person and len(vendor.contact_person.split()) > 1 else ''
            )
            
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': 'vendor'}
            )
            profile.role = 'vendor'
            profile.vendor = vendor
            profile.save()
            
            return Response({
                'message': 'User account created successfully',
                'username': username,
                'temporary_password': temp_password,
                'vendor_id': vendor.id,
                'vendor_name': vendor.company_name
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Failed to create user account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reset_vendor_password(self, request, pk=None):
        vendor = self.get_object()
        
        from .models import UserProfile
        try:
            profile = UserProfile.objects.get(vendor=vendor, role='vendor')
            user = profile.user
        except UserProfile.DoesNotExist:
            return Response({
                'error': 'No user account found for this vendor'
            }, status=status.HTTP_404_NOT_FOUND)
        
        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.save()
        
        return Response({
            'message': 'Password reset successfully',
            'username': user.username,
            'temporary_password': temp_password,
            'vendor_name': vendor.company_name
        }, status=status.HTTP_200_OK)


# ==================== CATEGORY VIEWSET ====================

class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for Category model"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


# ==================== PRODUCT VIEWSET ====================

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product model"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_queryset(self):
        queryset = Product.objects.all()
        category = self.request.query_params.get('category', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if category is not None:
            queryset = queryset.filter(category_id=category)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        product = self.get_object()
        product.is_active = True
        product.save()
        return Response(self.get_serializer(product).data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        product = self.get_object()
        product.is_active = False
        product.save()
        return Response(self.get_serializer(product).data)


# ==================== PURCHASE REQUEST VIEWSET ====================

class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        return PurchaseRequest.objects.select_related(
            'employee', 
            'product',
            'reviewed_by'
        ).all().order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        print(f"DEBUG LIST: Found {queryset.count()} requests")
        
        serializer = self.get_serializer(queryset, many=True)
        print(f"DEBUG LIST: Serialized data: {serializer.data}")
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        try:
            queryset = self.get_queryset()
            
            print(f"DEBUG my_requests: Found {queryset.count()} total requests")
            
            for req in queryset:
                print(f"  - Request #{req.id}: {req.item_name}, employee={req.employee}, status={req.status}")
            
            serializer = self.get_serializer(queryset, many=True)
            
            print(f"DEBUG my_requests: Serialized {len(serializer.data)} requests")
            print(f"DEBUG my_requests: Data = {serializer.data}")
            
            return Response(serializer.data)
            
        except Exception as e:
            print(f"ERROR in my_requests: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e), 'detail': traceback.format_exc()}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        purchase_request = self.get_object()
        
        if purchase_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_request.status = 'approved'
        purchase_request.reviewed_by = request.user if request.user.is_authenticated else None
        purchase_request.reviewed_date = timezone.now()
        purchase_request.save()
        
        if purchase_request.employee:
            Notification.objects.create(
                user=purchase_request.employee,
                type='approval',
                message=f'Your purchase request for "{purchase_request.item_name}" has been approved!',
                related_request=purchase_request
            )
        
        serializer = self.get_serializer(purchase_request)
        return Response({
            'message': 'Purchase request approved successfully',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        purchase_request = self.get_object()
        
        if purchase_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', 'No reason provided')
        
        purchase_request.status = 'rejected'
        purchase_request.reviewed_by = request.user if request.user.is_authenticated else None
        purchase_request.reviewed_date = timezone.now()
        purchase_request.rejection_reason = rejection_reason
        purchase_request.save()
        
        if purchase_request.employee:
            Notification.objects.create(
                user=purchase_request.employee,
                type='rejection',
                message=f'Your purchase request for "{purchase_request.item_name}" has been rejected. Reason: {rejection_reason}',
                related_request=purchase_request
            )
        
        serializer = self.get_serializer(purchase_request)
        return Response({
            'message': 'Purchase request rejected',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='send-rfq')
    @transaction.atomic
    def send_rfq(self, request, pk=None):
        """
        Send RFQ to one or more vendors
        POST /api/purchase-requests/{id}/send-rfq/
        Body: {
            "vendor_ids": [1, 2, 3],
            "response_deadline": "2026-02-10",
            "admin_notes": "Optional notes"
        }
        """
        purchase_request = self.get_object()
        
        if purchase_request.status != 'approved':
            return Response({
                'error': 'Only approved requests can be sent for quotation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        vendor_ids = request.data.get('vendor_ids', [])
        if not vendor_ids:
            return Response({
                'error': 'At least one vendor must be selected'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response_deadline_str = request.data.get('response_deadline')
        admin_notes = request.data.get('admin_notes', '')
        
        response_deadline = None
        if response_deadline_str:
            try:
                response_deadline = datetime.strptime(response_deadline_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        created_rfqs = []
        
        for vendor_id in vendor_ids:
            try:
                vendor = Vendor.objects.get(id=vendor_id)
                
                rfq = RequestForQuotation.objects.create(
                    rfq_number=generate_rfq_number(),
                    purchase_request=purchase_request,
                    vendor=vendor,
                    sent_by=request.user if request.user.is_authenticated else None,
                    response_deadline=response_deadline,
                    admin_notes=admin_notes,
                    status='sent'
                )
                
                if vendor.user:
                    Notification.objects.create(
                        user=vendor.user,
                        type='rfq',
                        message=f'New RFQ received for "{purchase_request.item_name}"',
                        related_request=purchase_request,
                        related_rfq=rfq
                    )
                
                created_rfqs.append(rfq)
                
            except Vendor.DoesNotExist:
                continue
        
        purchase_request.status = 'rfq_sent'
        purchase_request.save()
        
        serializer = RequestForQuotationSerializer(created_rfqs, many=True)
        
        return Response({
            'message': f'RFQ sent to {len(created_rfqs)} vendor(s) successfully',
            'rfqs': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        employee_id = self.request.data.get('employee_id')
        
        if employee_id:
            try:
                employee = User.objects.get(id=employee_id)
                serializer.save(employee=employee)
                return
            except User.DoesNotExist:
                pass
        
        if self.request.user.is_authenticated:
            serializer.save(employee=self.request.user)
        else:
            serializer.save()


# ==================== RFQ VIEWSET ====================

class RequestForQuotationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing RFQs"""
    serializer_class = RequestForQuotationSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        queryset = RequestForQuotation.objects.select_related(
            'purchase_request',
            'vendor',
            'sent_by'
        ).prefetch_related('quotation').all()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        vendor_id = self.request.query_params.get('vendor_id')
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)
        
        return queryset.order_by('-sent_date')
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept_quotation(self, request, pk=None):
        """
        Accept a quotation and optionally create PO
        POST /api/rfqs/{id}/accept_quotation/
        Body: {
            "create_po": true,
            "expected_delivery_date": "2026-03-01"
        }
        """
        rfq = self.get_object()
        
        if not hasattr(rfq, 'quotation'):
            return Response({
                'error': 'No quotation submitted for this RFQ'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        quotation = rfq.quotation
        
        if quotation.status != 'submitted':
            return Response({
                'error': 'Only submitted quotations can be accepted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rfq.status = 'accepted'
        rfq.save()
        
        quotation.status = 'accepted'
        quotation.reviewed_by = request.user if request.user.is_authenticated else None
        quotation.reviewed_date = timezone.now()
        quotation.save()
        
        create_po = request.data.get('create_po', False)
        
        if create_po:
            from datetime import datetime
            expected_delivery_str = request.data.get('expected_delivery_date')
            
            expected_delivery_date = None
            if expected_delivery_str:
                try:
                    expected_delivery_date = datetime.strptime(expected_delivery_str, '%Y-%m-%d').date()
                except ValueError:
                    expected_delivery_date = datetime.now().date() + timedelta(days=quotation.estimated_delivery_days)
            else:
                expected_delivery_date = datetime.now().date() + timedelta(days=quotation.estimated_delivery_days)
            
            po_number = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            po = PurchaseOrder.objects.create(
                po_number=po_number,
                vendor=rfq.vendor,
                purchase_request=rfq.purchase_request,
                vendor_quotation=quotation,
                created_by=request.user if request.user.is_authenticated else User.objects.filter(is_superuser=True).first(),
                expected_delivery_date=expected_delivery_date,
                subtotal=quotation.subtotal,
                tax_amount=quotation.tax_amount,
                shipping_cost=quotation.shipping_cost,
                total_amount=quotation.total_amount,
                total_quantity=quotation.quantity,
                status='approved'
            )
            
            if rfq.purchase_request.product:
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product=rfq.purchase_request.product,
                    quantity=quotation.quantity,
                    unit_price=quotation.unit_price
                )
            
            if rfq.vendor.user:
                Notification.objects.create(
                    user=rfq.vendor.user,
                    type='general',
                    message=f'Purchase Order {po.po_number} created from your quotation',
                    related_order=po
                )
            
            return Response({
                'message': 'Quotation accepted and Purchase Order created',
                'rfq': RequestForQuotationSerializer(rfq).data,
                'po': PurchaseOrderSerializer(po).data
            })
        
        return Response({
            'message': 'Quotation accepted successfully',
            'rfq': RequestForQuotationSerializer(rfq).data
        })
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject_quotation(self, request, pk=None):
        """
        Reject a quotation
        POST /api/rfqs/{id}/reject_quotation/
        Body: { "review_notes": "Reason for rejection" }
        """
        rfq = self.get_object()
        
        if not hasattr(rfq, 'quotation'):
            return Response({
                'error': 'No quotation submitted for this RFQ'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        quotation = rfq.quotation
        review_notes = request.data.get('review_notes', 'No reason provided')
        
        rfq.status = 'rejected'
        rfq.save()
        
        quotation.status = 'rejected'
        quotation.reviewed_by = request.user if request.user.is_authenticated else None
        quotation.reviewed_date = timezone.now()
        quotation.review_notes = review_notes
        quotation.save()
        
        if rfq.vendor.user:
            Notification.objects.create(
                user=rfq.vendor.user,
                type='general',
                message=f'Your quotation for RFQ {rfq.rfq_number} has been rejected',
                related_rfq=rfq
            )
        
        return Response({
            'message': 'Quotation rejected',
            'rfq': RequestForQuotationSerializer(rfq).data
        })


# ==================== VENDOR QUOTATION VIEWSET ====================

class VendorQuotationViewSet(viewsets.ModelViewSet):
    """ViewSet for vendor quotations"""
    serializer_class = VendorQuotationSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        queryset = VendorQuotation.objects.select_related(
            'rfq',
            'rfq__vendor',
            'rfq__purchase_request'
        ).all()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def submit(self, request, pk=None):
        """
        Submit a quotation for review
        POST /api/vendor-quotations/{id}/submit/
        """
        quotation = self.get_object()
        
        if quotation.status != 'draft':
            return Response({
                'error': 'Only draft quotations can be submitted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        quotation.status = 'submitted'
        quotation.submitted_date = timezone.now()
        quotation.save()
        
        quotation.rfq.status = 'received'
        quotation.rfq.save()
        
        quotation.rfq.purchase_request.status = 'quotation_received'
        quotation.rfq.purchase_request.save()
        
        return Response({
            'message': 'Quotation submitted successfully',
            'quotation': VendorQuotationSerializer(quotation).data
        })


# ==================== PURCHASE ORDER VIEWSET ====================

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return PurchaseOrder.objects.none()
        if user.is_staff or user.is_superuser:
            return PurchaseOrder.objects.all()
        return PurchaseOrder.objects.filter(assigned_to=user)
    
    @action(detail=False, methods=['get'])
    def assigned(self, request):
        if not request.user.is_authenticated:
            return Response([], status=status.HTTP_200_OK)
        orders = PurchaseOrder.objects.filter(assigned_to=request.user)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def goods_receipt(self, request, pk=None):
        purchase_order = self.get_object()
        
        serializer = GoodsReceiptSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                purchase_order=purchase_order,
                received_by=request.user
            )
            
            if request.data.get('condition') == 'good':
                purchase_order.status = 'received'
                purchase_order.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        purchase_order = self.get_object()
        new_status = request.data.get('status')
        reason = request.data.get('reason', '')
        
        valid_statuses = ['pending', 'in_progress', 'received', 'delivered', 'delayed']
        if new_status not in valid_statuses:
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_order.status = new_status
        if new_status == 'delayed':
            purchase_order.delay_reason = reason
        purchase_order.save()
        
        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)


# ==================== PURCHASE ORDER ITEM VIEWSET ====================

class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    
    def get_queryset(self):
        queryset = PurchaseOrderItem.objects.all()
        purchase_order = self.request.query_params.get('purchase_order', None)
        
        if purchase_order is not None:
            queryset = queryset.filter(purchase_order_id=purchase_order)
        
        return queryset


# ==================== INVOICE VIEWSET ====================

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        queryset = Invoice.objects.all()
        purchase_order = self.request.query_params.get('purchase_order', None)
        status_param = self.request.query_params.get('status', None)
        
        if purchase_order is not None:
            queryset = queryset.filter(purchase_order_id=purchase_order)
        if status_param is not None:
            queryset = queryset.filter(status=status_param)
        
        return queryset.order_by('-invoice_date')


# ==================== PAYMENT VIEWSET ====================

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        queryset = Payment.objects.all()
        invoice = self.request.query_params.get('invoice', None)
        
        if invoice is not None:
            queryset = queryset.filter(invoice_id=invoice)
        
        return queryset.order_by('-payment_date')


# ==================== NOTIFICATION VIEWSET ====================

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'status': 'All notifications marked as read'})


# ==================== VENDOR DASHBOARD VIEWSET ====================

class VendorDashboardViewSet(viewsets.ViewSet):
    """ViewSet for vendor portal functionality"""
    authentication_classes = []
    permission_classes = []
    
    def get_vendor(self, request):
        user = request.user
        if not user.is_authenticated:
            return None
        
        if hasattr(user, 'profile') and user.profile.vendor:
            return user.profile.vendor
        
        if hasattr(user, 'vendor_account'):
            return user.vendor_account
        
        return None
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get vendor dashboard statistics"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        stats = {
            'total_rfqs': RequestForQuotation.objects.filter(vendor=vendor).count(),
            'pending_rfqs': RequestForQuotation.objects.filter(vendor=vendor, status='sent').count(),
            'submitted_quotations': VendorQuotation.objects.filter(rfq__vendor=vendor, status='submitted').count(),
            'accepted_quotations': VendorQuotation.objects.filter(rfq__vendor=vendor, status='accepted').count(),
            'total_orders': PurchaseOrder.objects.filter(vendor=vendor).count(),
            'pending_deliveries': PurchaseOrder.objects.filter(vendor=vendor).exclude(delivery_status='delivered').count(),
            'upcoming_deliveries': PurchaseOrder.objects.filter(
                vendor=vendor,
                expected_delivery_date__gte=timezone.now().date(),
                expected_delivery_date__lte=timezone.now().date() + timedelta(days=7)
            ).count(),
            'pending_payments': Invoice.objects.filter(vendor=vendor, status='pending').count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_rfqs(self, request):
        """Get all RFQs for the logged-in vendor"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        rfqs = RequestForQuotation.objects.filter(vendor=vendor).order_by('-sent_date')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            rfqs = rfqs.filter(status=status_filter)
        
        serializer = RequestForQuotationSerializer(rfqs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_quotations(self, request):
        """Get all quotations submitted by the vendor"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        quotations = VendorQuotation.objects.filter(rfq__vendor=vendor).order_by('-created_at')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            quotations = quotations.filter(status=status_filter)
        
        serializer = VendorQuotationSerializer(quotations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_purchase_orders(self, request):
        """Get all purchase orders for the logged-in vendor"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        purchase_orders = PurchaseOrder.objects.filter(vendor=vendor).order_by('-order_date')
        
        status_filter = request.query_params.get('status', None)
        if status_filter:
            purchase_orders = purchase_orders.filter(status=status_filter)
        
        serializer = VendorPurchaseOrderSerializer(purchase_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_invoices(self, request):
        """Get all invoices for the logged-in vendor"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invoices = Invoice.objects.filter(vendor=vendor).order_by('-invoice_date')
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='update_delivery_status')
    def update_delivery_status(self, request, pk=None):
        """Update delivery status of a purchase order"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            purchase_order = PurchaseOrder.objects.get(id=pk, vendor=vendor)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = DeliveryStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        purchase_order.delivery_status = serializer.validated_data['delivery_status']
        
        if serializer.validated_data.get('shipment_date'):
            purchase_order.shipment_date = serializer.validated_data['shipment_date']
        
        if serializer.validated_data.get('tracking_number'):
            purchase_order.tracking_number = serializer.validated_data['tracking_number']
        
        if serializer.validated_data.get('delivery_notes'):
            purchase_order.delivery_notes = serializer.validated_data['delivery_notes']
        
        purchase_order.last_status_update = timezone.now()
        purchase_order.save()
        
        return Response({
            'message': 'Delivery status updated successfully',
            'purchase_order': VendorPurchaseOrderSerializer(purchase_order).data
        })
    
    @action(detail=True, methods=['post'], url_path='upload_invoice')
    def upload_invoice(self, request, pk=None):
        """Upload invoice file for an invoice"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            invoice = Invoice.objects.get(id=pk, vendor=vendor)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = InvoiceUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        invoice.invoice_file = serializer.validated_data['invoice_file']
        invoice.uploaded_by = request.user if request.user.is_authenticated else None
        invoice.upload_date = timezone.now()
        invoice.save()
        
        return Response({
            'message': 'Invoice uploaded successfully',
            'invoice': InvoiceSerializer(invoice).data
        })
    
    @action(detail=True, methods=['post'], url_path='submit_quotation')
    @transaction.atomic
    def submit_quotation(self, request, pk=None):
        """
        Submit a quotation for an RFQ
        POST /api/vendor-dashboard/{rfq_id}/submit_quotation/
        Body: {
            "unit_price": 100.00,
            "quantity": 10,
            "tax_rate": 18,
            "shipping_cost": 50.00,
            "estimated_delivery_days": 7,
            "quotation_valid_until": "2026-02-28",
            "payment_terms": "Net 30",
            "warranty_terms": "1 year warranty",
            "additional_notes": "Optional notes"
        }
        """
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            rfq = RequestForQuotation.objects.get(id=pk, vendor=vendor)
        except RequestForQuotation.DoesNotExist:
            return Response(
                {'error': 'RFQ not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if hasattr(rfq, 'quotation'):
            return Response(
                {'error': 'Quotation already exists for this RFQ'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quotation_data = {
            'rfq': rfq.id,
            'quotation_number': generate_quotation_number(),
            'unit_price': request.data.get('unit_price'),
            'quantity': request.data.get('quantity', rfq.purchase_request.quantity),
            'tax_rate': request.data.get('tax_rate', 0),
            'shipping_cost': request.data.get('shipping_cost', 0),
            'estimated_delivery_days': request.data.get('estimated_delivery_days'),
            'quotation_valid_until': request.data.get('quotation_valid_until'),
            'payment_terms': request.data.get('payment_terms', 'Net 30'),
            'warranty_terms': request.data.get('warranty_terms', ''),
            'additional_notes': request.data.get('additional_notes', ''),
            'status': 'submitted',
            'submitted_date': timezone.now()
        }
        
        serializer = VendorQuotationSerializer(data=quotation_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        quotation = serializer.save()
        
        rfq.status = 'received'
        rfq.save()
        
        rfq.purchase_request.status = 'quotation_received'
        rfq.purchase_request.save()
        
        return Response({
            'message': 'Quotation submitted successfully',
            'quotation': VendorQuotationSerializer(quotation).data
        }, status=status.HTTP_201_CREATED)