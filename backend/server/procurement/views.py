from decimal import Decimal
from http import client
from io import BytesIO
import json
import os
import secrets
import string
import traceback
from datetime import datetime, timedelta
from urllib import request
import razorpay
from django.conf import settings
import hmac
import hashlib


from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.http import JsonResponse, HttpResponse
from django.middleware.csrf import get_token
from django.db.models import Count, Sum, Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from .models import (
    Vendor, Category, Product, PurchaseOrder, 
    PurchaseOrderItem, Invoice, Payment, EmployeeProfile,
    PurchaseRequest, GoodsReceipt, Notification,
    RequestForQuotation, VendorQuotation, UserProfile
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


# ============================================
# UPDATED LOGIN VIEW - Replace in views.py
# ============================================

@csrf_exempt
def login_view(request):
    """Handle user login with proper session management"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            print(f"\n🔐 Login attempt for username: {username}")
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                print(f"✅ Authentication successful for: {username}")
                
                # ✅ CRITICAL: Login the user (creates session)
                login(request, user)
                
                # ✅ Force session save
                request.session.save()
                
                # ✅ DEBUG: Verify session was created
                print(f"🍪 Session created:")
                print(f"  → Session key: {request.session.session_key}")
                print(f"  → User ID in session: {request.session.get('_auth_user_id')}")
                print(f"  → User authenticated: {request.user.is_authenticated}")
                print(f"  → User object: {request.user}")
                
                # Then check vendor status
                if hasattr(user, 'profile') and user.profile.role == 'vendor':
                    vendor = user.profile.vendor
                    
                    if vendor:
                        if vendor.status == 'pending':
                            logout(request)
                            return JsonResponse({
                                'error': 'Your account is awaiting approval.'
                            }, status=403)
                        
                        if vendor.status == 'rejected':
                            logout(request)
                            return JsonResponse({
                                'error': f'Your account has been rejected.'
                            }, status=403)
                        
                        if vendor.status == 'suspended':
                            logout(request)
                            return JsonResponse({
                                'error': 'Your account has been suspended.'
                            }, status=403)
                
                # Determine user role
                role = 'employee'
                if user.is_superuser:
                    role = 'admin'
                elif hasattr(user, 'profile'):
                    role = user.profile.role
                
                print(f"✅ Login successful - User role: {role}")
                
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': role,
                        'company_name': user.profile.vendor.company_name if (
            hasattr(user, 'profile') and 
            user.profile.vendor
        ) else None,
                    }
                })
            else:
                print(f"❌ Authentication failed for: {username}")
                return JsonResponse({
                    'error': 'Invalid username or password'
                }, status=401)
                
        except Exception as e:
            import traceback
            print(f"❌ Login error: {str(e)}")
            traceback.print_exc()
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
            'pending_vendors': Vendor.objects.filter(status='pending').count(),
            'approved_vendors': Vendor.objects.filter(status='approved').count(),
            'rejected_vendors': Vendor.objects.filter(status='rejected').count(),
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


# ==================== VENDOR SELF-REGISTRATION ====================

@csrf_exempt
def vendor_self_register(request):
    """
    Public endpoint for vendor self-registration with password
    POST /api/vendor/register/
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # UPDATED: Add password to required fields
        required_fields = ['company_name', 'contact_person', 'email', 'phone', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return JsonResponse({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Validate password
        password = data.get('password')
        if len(password) < 8:
            return JsonResponse({
                'error': 'Password must be at least 8 characters long'
            }, status=400)
        
        # Check if email already exists
        if Vendor.objects.filter(email=data['email']).exists():
            return JsonResponse({
                'error': 'A vendor with this email already exists'
            }, status=400)
        
        # AUTO-GENERATE TEMPORARY VENDOR CODE
        timestamp = datetime.now().strftime('%Y%m%d')
        random_suffix = ''.join(secrets.choice(string.digits) for _ in range(5))
        temp_vendor_code = f"TEMP-{timestamp}-{random_suffix}"
        
        # AUTO-GENERATE USERNAME from email
        username = data['email'].split('@')[0].lower()[:20]
        original_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1
        
        # CREATE USER ACCOUNT IMMEDIATELY with vendor's password
        user = User.objects.create_user(
            username=username,
            email=data['email'],
            password=password,  # Use vendor's chosen password
            first_name=data['contact_person'].split()[0] if data['contact_person'] else '',
            last_name=' '.join(data['contact_person'].split()[1:]) if data['contact_person'] and len(data['contact_person'].split()) > 1 else '',
            is_active=False  # Inactive until approved
        )
        
        # Create vendor with 'pending' status
        vendor = Vendor.objects.create(
            vendor_code=temp_vendor_code,
            company_name=data['company_name'],
            contact_person=data['contact_person'],
            email=data['email'],
            phone=data['phone'],
            address=data.get('address', ''),
            city=data.get('city', ''),
            state=data.get('state', ''),
            postal_code=data.get('postal_code', ''),
            country=data.get('country', ''),
            tax_id=data.get('tax_id', ''),
            status='pending',
            is_active=False,
            user=user  # Link user to vendor
        )
        
        # Create UserProfile linking user to vendor
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': 'vendor'}
        )
        profile.role = 'vendor'
        profile.vendor = vendor
        profile.save()
        
        # Send email notification to admins
        try:
            admin_emails = User.objects.filter(
                is_superuser=True, 
                is_active=True
            ).values_list('email', flat=True)
            
            if admin_emails:
                subject = f'New Vendor Registration: {vendor.company_name}'
                message = f"""
A new vendor has registered and is awaiting approval.

Vendor Details:
- Company: {vendor.company_name}
- Contact Person: {vendor.contact_person}
- Email: {vendor.email}
- Phone: {vendor.phone}
- Username: {username}
- Temporary ID: {vendor.vendor_code}

Please review and approve/reject this vendor in the admin dashboard.
Once approved, a permanent vendor code will be assigned and the vendor can login.
                """
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=list(admin_emails),
                    fail_silently=True,
                )
        except Exception as e:
            print(f"Failed to send admin notification: {e}")
        
        # Send confirmation email to vendor
        try:
            send_mail(
                subject='Vendor Registration Received',
                message=f"""
Dear {vendor.contact_person},

Thank you for registering with our procurement system.

Your vendor registration has been received and is currently under review. 
You will receive an email notification once your account has been approved.

Company: {vendor.company_name}
Username: {username}
Reference ID: {vendor.vendor_code}

Please save your username. You can use it to login once your account is approved.

If you have any questions, please contact our procurement team.

Best regards,
Procurement Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[vendor.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send vendor confirmation: {e}")
        
        return JsonResponse({
            'message': 'Registration successful! Your account is pending approval. You will be notified once approved.',
            'vendor': {
                'id': vendor.id,
                'company_name': vendor.company_name,
                'username': username,
                'reference_id': vendor.vendor_code,
                'status': vendor.status
            }
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


# ==================== EMPLOYEE VIEWSET ====================

class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for Employee management with full CRUD - EXCLUDES VENDORS"""
    serializer_class = EmployeeSerializer
   
    
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
        
        # Send credentials to HR email
        email_status = "failed"
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            employee_name = f"{user.first_name} {user.last_name}".strip() or user.username
            
            subject = f'New Employee: {employee_name} - Login Credentials'
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1E293B; border-bottom: 2px solid #4A90E2; padding-bottom: 10px;">
                        New Employee Account Created
                    </h2>
                    
                    <p>A new employee account has been created.</p>
                    
                    <div style="background-color: #F0F9FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1E293B;">Employee Details:</h3>
                        <p><strong>Name:</strong> {employee_name}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Department:</strong> {request.data.get('department', 'N/A')}</p>
                        <p><strong>Position:</strong> {request.data.get('position', 'N/A')}</p>
                    </div>
                    
                    <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #065F46;">🔑 Login Credentials:</h3>
                        <p style="font-size: 16px;"><strong>Username:</strong> <code style="background-color: #E5E7EB; padding: 4px 8px; border-radius: 4px;">{user.username}</code></p>
                        <p style="font-size: 16px;"><strong>Password:</strong> <code style="background-color: #E5E7EB; padding: 4px 8px; border-radius: 4px;">{temp_password}</code></p>
                    </div>
                    
                    <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #92400E;">
                            ⚠️ <strong>Important:</strong> Share these credentials securely with the employee.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            send_mail(
                subject=subject,
                message=f"Employee: {employee_name}\nUsername: {user.username}\nPassword: {temp_password}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.EMAIL_HOST_USER],
                html_message=html_message,
                fail_silently=False,
            )
            
            email_status = "sent"
            print(f"✅ Email sent to {settings.EMAIL_HOST_USER}")
            
        except Exception as e:
            print(f"❌ Email failed: {e}")
            import traceback
            traceback.print_exc()
            email_status = "failed"
        
        response_data = serializer.data
        response_data['temporary_password'] = temp_password
        response_data['email_status'] = email_status
        response_data['message'] = f'Employee created. Email {email_status}.'
        
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
    def approve(self, request, pk=None):
        """
        Approve a pending vendor - no password generation needed
        POST /api/vendors/{id}/approve/
        """
        vendor = self.get_object()
        
        if vendor.status == 'approved':
            return Response({
                'error': 'Vendor is already approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # GENERATE PERMANENT VENDOR CODE
        from django.db.models import Max
        
        existing_codes = Vendor.objects.filter(
            vendor_code__startswith='VEND-'
        ).values_list('vendor_code', flat=True)
        
        max_number = 1000
        for code in existing_codes:
            try:
                number = int(code.split('-')[1])
                if number > max_number:
                    max_number = number
            except (IndexError, ValueError):
                continue
        
        new_vendor_code = f"VEND-{max_number + 1:04d}"
        
        # Update vendor with permanent code
        vendor.vendor_code = new_vendor_code
        vendor.status = 'approved'
        vendor.is_active = True
        vendor.approved_by = request.user if request.user.is_authenticated else None
        vendor.approved_at = timezone.now()
        vendor.rejection_reason = ''
        vendor.rejected_by = None
        vendor.rejected_at = None
        vendor.save()
        
        # ACTIVATE USER ACCOUNT (no password generation)
        if vendor.user:
            vendor.user.is_active = True
            vendor.user.save()
        
        # Send approval email (NO CREDENTIALS)
        try:
            send_mail(
                subject=f'Vendor Account Approved - {vendor.company_name}',
                message=f"""
Dear {vendor.contact_person},

Congratulations! Your vendor account has been approved.

Company: {vendor.company_name}
Vendor Code: {vendor.vendor_code}
Username: {vendor.user.username if vendor.user else 'N/A'}

You can now login to the vendor portal using the username and password you created during registration.

Best regards,
Procurement Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[vendor.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send approval email: {e}")
        
        return Response({
            'message': f'Vendor approved successfully. Vendor code assigned: {vendor.vendor_code}',
            'vendor': VendorSerializer(vendor).data
        })
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject(self, request, pk=None):
        """
        Reject a pending vendor
        POST /api/vendors/{id}/reject/
        Body: { "rejection_reason": "Reason for rejection" }
        """
        vendor = self.get_object()
        
        rejection_reason = request.data.get('rejection_reason', '')
        if not rejection_reason:
            return Response({
                'error': 'Rejection reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update vendor status
        vendor.status = 'rejected'
        vendor.is_active = False
        vendor.rejection_reason = rejection_reason
        vendor.rejected_by = request.user if request.user.is_authenticated else None
        vendor.rejected_at = timezone.now()
        vendor.approved_by = None
        vendor.approved_at = None
        vendor.save()
        
        # Send rejection email
        try:
            send_mail(
                subject=f'Vendor Registration Update - {vendor.company_name}',
                message=f"""
Dear {vendor.contact_person},

We regret to inform you that your vendor registration has not been approved.

Company: {vendor.company_name}
Vendor Code: {vendor.vendor_code}

Reason: {rejection_reason}

If you have any questions or would like to reapply, please contact our procurement team.

Best regards,
Procurement Team
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[vendor.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")
        
        return Response({
            'message': 'Vendor rejected',
            'vendor': VendorSerializer(vendor).data
        })
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def create_user_account(self, request, pk=None):
        """
        Create user account for vendor (manual creation by admin)
        POST /api/vendors/{id}/create_user_account/
        """
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
        """
        Reset password for vendor user account
        POST /api/vendors/{id}/reset_vendor_password/
        """
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

# Updated ProductViewSet for views.py
# Replace the existing ProductViewSet class with this updated version

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product model with auto-generated product codes"""
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
    
    def generate_product_code(self):
        """Generate next product code in sequence (PID001, PID002, etc.)"""
        from django.db.models import Max
        
        # Get all existing product codes that start with 'PID'
        existing_codes = Product.objects.filter(
            product_code__startswith='PID'
        ).values_list('product_code', flat=True)
        
        # Find the maximum number
        max_number = 0
        for code in existing_codes:
            try:
                # Extract number from format PID001, PID002, etc.
                number = int(code.replace('PID', ''))
                if number > max_number:
                    max_number = number
            except (IndexError, ValueError):
                continue
        
        # Generate new code with zero-padding (PID001, PID002, etc.)
        new_number = max_number + 1
        new_product_code = f"PID{new_number:03d}"
        
        return new_product_code
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Override create to auto-generate product code"""
        data = request.data.copy()
        
        # Auto-generate product code if not provided or empty
        if not data.get('product_code') or data.get('product_code') == '':
            data['product_code'] = self.generate_product_code()
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response({
            **serializer.data,
            'message': f'Product created successfully with code {serializer.data["product_code"]}'
        }, status=status.HTTP_201_CREATED, headers=headers)
    
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
        
        # Accept the quotation
        quotation.status = 'accepted'
        quotation.reviewed_by = request.user if request.user.is_authenticated else None
        quotation.reviewed_date = timezone.now()
        quotation.save()
        
        # Update RFQ status
        rfq.status = 'accepted'
        rfq.save()
        
        # Get or create admin user
        admin_user = None
        if request.user.is_authenticated:
            admin_user = request.user
        else:
            admin_user = User.objects.filter(is_superuser=True, is_active=True).first()
        
        if not admin_user:
            return Response({
                'error': 'No admin user found'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate PO number
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
        po_number = f"PO-{timestamp}-{random_suffix}"
        
        from datetime import timedelta
        expected_delivery_date = timezone.now().date() + timedelta(days=quotation.estimated_delivery_days)
        total_quantity = quotation.quantity
        # Create Purchase Order
        po = PurchaseOrder.objects.create(
            po_number=po_number,
            vendor=rfq.vendor,
            purchase_request=rfq.purchase_request,
            vendor_quotation=quotation,
            created_by=admin_user,
            status='approved',
            expected_delivery_date=timezone.now().date() + timedelta(days=quotation.estimated_delivery_days),
            subtotal=quotation.subtotal,
            tax_amount=quotation.tax_amount,
            shipping_cost=quotation.shipping_cost,
            total_amount=quotation.total_amount,
            total_quantity=total_quantity,
            notes=f"Created from quotation {quotation.quotation_number}"
        )
        
        # Create PO Items
        product = None
        product_name = 'Product from Quotation'
        if rfq.purchase_request and rfq.purchase_request.product:
            product = rfq.purchase_request.product
            product_name = product.name
        else:
            product_name = rfq.purchase_request.item_name if rfq.purchase_request else 'Unknown Product'
        
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=product,
            product_name=product_name,
            quantity=quotation.quantity,
            unit_price=quotation.unit_price,
            line_total=quotation.quantity * quotation.unit_price
        )
        po_item = PurchaseOrderItem.objects.filter(purchase_order=po).last()
        print(f"Created PO Item: {po_item.product_name}, Quantity: {po_item.quantity}, Unit Price: {po_item.unit_price}")
        
        # Notify vendor
        if rfq.vendor.user:
            Notification.objects.create(
                user=rfq.vendor.user,
                type='general',
                message=f'Purchase Order {po.po_number} created from your quotation',
                related_order=po
            )
        
        return Response({
            'message': 'Quotation accepted, Purchase Order created',
            'rfq': RequestForQuotationSerializer(rfq).data,
            'po': PurchaseOrderSerializer(po).data,
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject_quotation(self, request, pk=None):
        """Reject a quotation"""
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
        """Submit a quotation for review"""
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
    queryset = PurchaseOrder.objects.all().prefetch_related('items')
    serializer_class = PurchaseOrderSerializer

    
    def get_queryset(self):
        return PurchaseOrder.objects.all().prefetch_related(
        'items',  # ← Fetch items
        'items__product'
    ).select_related(
        'vendor',
        'assigned_to'
    ).order_by('-created_at')
    
# ============================================
# FIX 2: Fix the assigned action to properly filter
# ============================================

# REPLACE the existing assigned method (around line 1330) with this:

    @action(detail=False, methods=['get'])
    def assigned(self, request):
        if not request.user.is_authenticated:
            return Response([], status=status.HTTP_200_OK)
        orders=PurchaseOrder.objects.filter(assigned_to=request.user).prefetch_related('items','items__product').select_related('vendor','assigned_to').order_by('-created_at')

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)




    
    @action(detail=True, methods=['post'],  url_path='goods-receipt')
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
    
# REPLACE the existing update_status method (around line 1350) with this:

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Update purchase order status - FIXED URL PATH
        POST /api/purchase-orders/{id}/update-status/
        """
        purchase_order = self.get_object()
        
        # ✅ FIX: Verify user has permission (either assigned or is admin)
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is assigned to this PO or is admin
        if not request.user.is_superuser:
            if purchase_order.assigned_to != request.user:
                return Response(
                    {'error': 'You are not assigned to this purchase order'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        new_status = request.data.get('status')
        reason = request.data.get('reason', '')
        
        valid_statuses = ['pending', 'in_progress', 'received', 'delivered', 'delayed']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status
        purchase_order.status = new_status
        if new_status == 'delayed':
            purchase_order.delay_reason = reason
        purchase_order.save()
        
        # Notify vendor if status changed to received/delivered
        if new_status in ['received', 'delivered'] and purchase_order.vendor.user:
            Notification.objects.create(
                user=purchase_order.vendor.user,
                type='general',
                message=f'Purchase Order {purchase_order.po_number} status updated to {new_status}',
                related_order=purchase_order
            )
        
        serializer = self.get_serializer(purchase_order)
        return Response({
            'message': f'Status updated to {new_status}',
            'purchase_order': serializer.data
        })
    
class GoodsReceiptViewSet(viewsets.ModelViewSet):
    queryset=GoodsReceipt.objects.all()
    serializer_class = GoodsReceiptSerializer

    def perform_create(self, serializer):
        receipt=serializer.save(received_by=self.request.user)
        if receipt.condition in ['good', 'partial']:
            po=receipt.purchase_order
            for item in po.items.all():
                product=item.product
                if product:
                    qty_to_add = receipt.delivered_quantity
                    product.current_stock += qty_to_add
                    product.save()

            if receipt.condition == 'good':
                po.status = 'delivered'
                po.actual_delivery_date = receipt.received_at.date()
            if receipt.received_at is None:
                po.status = 'received'
            po.save()
    
    def get_queryset(self):
        queryset = GoodsReceipt.objects.all()
        purchase_order = self.request.query_params.get('purchase_order')
        if purchase_order:
            queryset = queryset.filter(purchase_order_id=purchase_order)
        return queryset.order_by('-received_at')



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
    
    @action(detail=True, methods=['get'], url_path='download')
    def download_invoice(self, request, pk=None):
        """Generate and download invoice as PDF"""
        invoice = self.get_object()
        
        # Create PDF
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        p.setFont("Helvetica-Bold", 24)
        p.drawString(1*inch, height - 1*inch, "INVOICE")
        
        # Invoice details
        p.setFont("Helvetica", 12)
        y = height - 1.5*inch
        
        p.drawString(1*inch, y, f"Invoice Number: {invoice.invoice_number}")
        y -= 0.3*inch
        p.drawString(1*inch, y, f"Date: {invoice.invoice_date}")
        y -= 0.3*inch
        p.drawString(1*inch, y, f"Due Date: {invoice.due_date}")
        y -= 0.5*inch
        
        # Vendor info
        p.setFont("Helvetica-Bold", 14)
        p.drawString(1*inch, y, "Vendor:")
        p.setFont("Helvetica", 12)
        y -= 0.3*inch
        p.drawString(1*inch, y, invoice.vendor.company_name)
        y -= 0.3*inch
        p.drawString(1*inch, y, invoice.vendor.address)
        y -= 0.5*inch
        
        # PO info
        if invoice.purchase_order:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(1*inch, y, f"Purchase Order: {invoice.purchase_order.po_number}")
            y -= 0.5*inch
        
        # Amount details
        p.setFont("Helvetica", 12)
        p.drawString(4*inch, y, "Subtotal:")
        p.drawString(6*inch, y, f"₹{invoice.subtotal:,.2f}")
        y -= 0.3*inch
        
        p.drawString(4*inch, y, "Tax:")
        p.drawString(6*inch, y, f"₹{invoice.tax_amount:,.2f}")
        y -= 0.3*inch
        
        p.setFont("Helvetica-Bold", 14)
        p.drawString(4*inch, y, "Total:")
        p.drawString(6*inch, y, f"₹{invoice.total_amount:,.2f}")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
        
        return response
    
    
    
    @action(detail=True, methods=['post'], url_path='create-razorpay-order')
    def create_razorpay_order(self, request, pk=None):
        """Create Razorpay order for the invoice"""
        invoice = self.get_object()
        
        if invoice.status == 'paid':
            return Response({
                'error': 'Invoice is already paid'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            amount_to_pay = int(invoice.total_amount) - float(invoice.paid_amount or 0)
            amount_in_paise = int(amount_to_pay * 100)
            
            razorpay_order = client.order.create({
                'amount': amount_in_paise,
                'currency': 'INR',
                'receipt': f'invoice_{invoice.invoice_number}',
                'notes': {
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'vendor': invoice.vendor.company_name
                }
            })
            
            return Response({
                'order_id': razorpay_order['id'],
                'amount': amount_in_paise,
                'currency': 'INR',
                'key_id': settings.RAZORPAY_KEY_ID,
                'invoice_number': invoice.invoice_number,
                'vendor_name': invoice.vendor.company_name
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            import traceback
            print(f"❌ Razorpay Error: {str(e)}")
            traceback.print_exc()  # This will show the full error in your Django console
            return Response({
                'error': f'Failed to create Razorpay order: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=True, methods=['post'], url_path='verify-razorpay-payment')
    @transaction.atomic
    def verify_razorpay_payment(self, request, pk=None):
        """Verify Razorpay payment and update invoice status"""
        invoice = self.get_object()
        
        
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
            return Response({
                'error': 'Missing payment details'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            
            client.utility.verify_payment_signature(params_dict)

            payment_details = client.payment.fetch(razorpay_payment_id)
            amount_paid = Decimal(payment_details['amount']) / 100
            
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            payment_number = f"PAY-{timestamp}"
            
            payment=Payment.objects.create(
                payment_number=payment_number,
                invoice=invoice,
                vendor=invoice.vendor,
                payment_date=timezone.now().date(),
                amount=amount_paid,
                payment_method='Razorpay',
                razorpay_payment_id=razorpay_payment_id,
                razorpay_order_id=razorpay_order_id,
                razorpay_signature=razorpay_signature,
                transaction_reference=razorpay_payment_id,
                notes=f'Razorpay online payment - {payment_details.get("method", "card")}',
                created_by=request.user if request.user.is_authenticated else None
            )
            
            invoice.paid_amount = (invoice.paid_amount or Decimal('0.00')) + amount_paid
            if invoice.paid_amount >= invoice.total_amount:
                invoice.status = 'paid'
                invoice.payment_date = timezone.now().date()
            invoice.save()

            if invoice.vendor.user:
                Notification.objects.create(
                    user=invoice.vendor.user,
                    type='payment',
                    message=f'Payment of ₹{amount_paid:,.2f} received for Invoice {invoice.invoice_number}',
                    related_order=invoice.purchase_order
                )
            
            return Response({
                'message': 'Payment verified and recorded successfully',
                'payment': PaymentSerializer(payment).data,
                'invoice': InvoiceSerializer(invoice).data
            }, status=status.HTTP_201_CREATED)
        
        except razorpay.errors.SignatureVerificationError:
            return Response({
                'error': 'Invalid payment signature'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({
                'error': f'Failed to verify payment: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Update PaymentViewSet to include created_by
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    def get_queryset(self):
        queryset = Payment.objects.all()
        invoice = self.request.query_params.get('invoice', None)
        vendor = self.request.query_params.get('vendor', None)
        
        if invoice is not None:
            queryset = queryset.filter(invoice_id=invoice)
        
        if vendor is not None:
            queryset = queryset.filter(invoice__vendor_id=vendor)
        
        return queryset.order_by('-payment_date')
    
    def perform_create(self, serializer):
        invoice = serializer.validated_data.get('invoice')
        serializer.save(vendor=invoice.vendor if invoice else None,
                        created_by=self.request.user if self.request.user.is_authenticated else None)




# ==================== NOTIFICATION VIEWSET ====================

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    
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
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'status': 'All notifications marked as read'})



# ==================== VENDOR DASHBOARD VIEWSET ====================

class VendorDashboardViewSet(viewsets.ViewSet):
    """ViewSet for vendor portal functionality"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_vendor(self, request):
        """Get vendor associated with current user"""
        user = request.user
        if not user.is_authenticated:
            print("❌ User not authenticated")
            return None
        
        print(f"🔍 Looking for vendor for user: {user.username}")
        
        # Method 1: Check UserProfile
        if hasattr(user, 'profile') and user.profile.vendor:
            vendor = user.profile.vendor
            print(f"✅ Found vendor via profile: {vendor.company_name}")
            return vendor
        
        # Method 2: Check direct vendor_account relationship
        if hasattr(user, 'vendor_account'):
            vendor = user.vendor_account
            print(f"✅ Found vendor via vendor_account: {vendor.company_name}")
            return vendor
        
        # Method 3: Query Vendor model directly
        try:
            vendor = Vendor.objects.get(user=user)
            print(f"✅ Found vendor via direct query: {vendor.company_name}")
            return vendor
        except Vendor.DoesNotExist:
            print(f"❌ No vendor found for user {user.username}")
            pass
        
        # Method 4: Check UserProfile vendor field
        try:
            from .models import UserProfile
            profile = UserProfile.objects.get(user=user)
            if profile.vendor:
                vendor = profile.vendor
                print(f"✅ Found vendor via UserProfile query: {vendor.company_name}")
                return vendor
        except UserProfile.DoesNotExist:
            print(f"❌ No UserProfile found for user {user.username}")
            pass
        
        return None
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get vendor dashboard statistics"""
        print(f"\n📊 Dashboard stats requested by: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        print(f"✅ Calculating stats for vendor: {vendor.company_name}")
        
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
        
        print(f"📈 Stats: {stats}")
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_rfqs(self, request):
        """Get all RFQs for the logged-in vendor"""
        print(f"\n📨 RFQs requested by: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        print(f"🔍 Fetching RFQs for vendor: {vendor.company_name} (ID: {vendor.id})")
        
        rfqs = RequestForQuotation.objects.filter(vendor=vendor).select_related(
            'purchase_request',
            'purchase_request__employee',
            'purchase_request__product',
            'vendor',
            'sent_by'
        ).prefetch_related('quotation').order_by('-sent_date')
        
        print(f"📊 Found {rfqs.count()} RFQs")
        
        for rfq in rfqs:
            print(f"  - RFQ #{rfq.rfq_number}: Status={rfq.status}, PR={rfq.purchase_request.item_name if rfq.purchase_request else 'N/A'}")
        
        status_filter = request.query_params.get('status')
        if status_filter:
            rfqs = rfqs.filter(status=status_filter)
            print(f"🔍 Filtered to {rfqs.count()} RFQs with status={status_filter}")
        
        serializer = RequestForQuotationSerializer(rfqs, many=True)
        
        print(f"✅ Returning {len(serializer.data)} serialized RFQs")
        
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
        
        purchase_orders = PurchaseOrder.objects.filter(
            vendor=vendor
        ).prefetch_related('items').order_by('-created_at')
        
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
    
    @action(detail=True, methods=['post'], url_path='upload_invoice', parser_classes=[MultiPartParser, FormParser])
    @method_decorator(csrf_exempt)
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
        
        # ✅ FIX: Get file from request.FILES instead of request.data
        if 'invoice_file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invoice_file = request.FILES['invoice_file']
        
        # Validate file type
        allowed_extensions = ['.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png']
        file_ext = os.path.splitext(invoice_file.name)[1].lower()
        
        if file_ext not in allowed_extensions:
            return Response(
                {'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 10MB)
        if invoice_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'File size too large. Maximum size is 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invoice.invoice_file = invoice_file
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
        """Submit a quotation for an RFQ"""
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
    
    @action(detail=False, methods=['post'], url_path='create_invoice')
    @transaction.atomic
    def create_invoice(self, request):
        """Create invoice for a purchase order"""
        vendor = self.get_vendor(request)
        if not vendor:
            return Response(
                {'error': 'No vendor account associated with this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            purchase_order_id = request.data.get('purchase_order')
            purchase_order = PurchaseOrder.objects.get(id=purchase_order_id, vendor=vendor)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invoice already exists for this PO
        if Invoice.objects.filter(purchase_order=purchase_order).exists():
            return Response(
                {'error': 'Invoice already exists for this purchase order'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the invoice
        invoice = Invoice.objects.create(
            invoice_number=request.data.get('invoice_number'),
            vendor=vendor,
            purchase_order=purchase_order,
            invoice_date=request.data.get('invoice_date'),
            due_date=request.data.get('due_date'),
            subtotal=request.data.get('subtotal', purchase_order.subtotal),
            tax_amount=request.data.get('tax_amount', purchase_order.tax_amount),
            total_amount=request.data.get('total_amount', purchase_order.total_amount),
            notes=request.data.get('notes', ''),
            status='pending',
            uploaded_by=request.user if request.user.is_authenticated else None
        )
        
        # Notify admin
        admins = User.objects.filter(is_superuser=True, is_active=True)
        for admin in admins:
            Notification.objects.create(
                user=admin,
                type='general',
                message=f'New invoice {invoice.invoice_number} (₹{invoice.total_amount:,.2f}) submitted by {vendor.company_name}',
                related_order=purchase_order
            )
        
        # Send email to admins
        try:
            admin_emails = [admin.email for admin in admins if admin.email]
            if admin_emails:
                send_mail(
                    subject=f'New Invoice Received - {invoice.invoice_number}',
                    message=f"""
A new invoice has been submitted:

Invoice Number: {invoice.invoice_number}
Vendor: {vendor.company_name}
PO Number: {purchase_order.po_number}
Amount: ₹{invoice.total_amount:,.2f}
Due Date: {invoice.due_date}

Please review in the admin dashboard.
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    fail_silently=True,
                )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'message': 'Invoice created and submitted to admin successfully',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_201_CREATED)