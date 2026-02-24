import string
from time import timezone
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from .models import (
    RequestForQuotation, Vendor, Category, Product,
    PurchaseOrder, PurchaseOrderItem,
    Invoice, Payment, UserProfile, EmployeeProfile,
    PurchaseRequest, GoodsReceipt, Notification,VendorQuotation
)

import secrets
import string

# ==================== VENDOR SERIALIZER ====================



def generate_temp_password(length=12):
    """Generate a secure temporary password"""
    characters = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(characters) for _ in range(length))


class VendorSerializer(serializers.ModelSerializer):
    # Existing fields...
    create_user_account = serializers.BooleanField(write_only=True, required=False, default=False)
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    temporary_password = serializers.CharField(read_only=True)
    has_user_account = serializers.SerializerMethodField()
    
    # ADD these:
    approved_by_name = serializers.SerializerMethodField()
    rejected_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = [
            'created_at', 
            'updated_at', 
            'temporary_password', 
            'has_user_account',
            'approved_by',      # ← ADD
            'approved_at',      # ← ADD
            'rejected_by',      # ← ADD
            'rejected_at',      # ← ADD
        ]
    
    def get_has_user_account(self, obj):
        from .models import UserProfile
        return UserProfile.objects.filter(vendor=obj, role='vendor').exists()
    
    # ADD these methods:
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip() or obj.approved_by.username
        return None
    
    def get_rejected_by_name(self, obj):
        if obj.rejected_by:
            return f"{obj.rejected_by.first_name} {obj.rejected_by.last_name}".strip() or obj.rejected_by.username
        return None
    
    @transaction.atomic
    def create(self, validated_data):
        # Extract user account creation fields
        create_user_account = validated_data.pop('create_user_account', False)
        username = validated_data.pop('username', None)
        
        # Create the vendor
        vendor = Vendor.objects.create(**validated_data)
        
        # Create user account if requested
        if create_user_account:
            if not username:
                # Auto-generate username from company name
                username = validated_data['company_name'].lower().replace(' ', '')[:20]
            
            # Check if username exists
            if User.objects.filter(username=username).exists():
                # Append vendor code to make it unique
                username = f"{username}_{validated_data['vendor_code']}"
            
            # Generate temporary password
            temp_password = generate_temp_password()
            
            # Create user account
            user = User.objects.create_user(
                username=username,
                email=validated_data['email'],
                password=temp_password,
                first_name=validated_data['contact_person'].split()[0] if validated_data['contact_person'] else '',
                last_name=' '.join(validated_data['contact_person'].split()[1:]) if len(validated_data['contact_person'].split()) > 1 else ''
            )
            
            # Link user to vendor through UserProfile
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': 'vendor'}
            )
            profile.role = 'vendor'
            profile.vendor = vendor
            profile.save()
            
            # Store the temporary password to return it
            vendor._temp_password = temp_password
            vendor._username = username
        
        return vendor
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Include temporary password if it was just created
        if hasattr(instance, '_temp_password'):
            data['temporary_password'] = instance._temp_password
            data['username'] = instance._username
        
        return data


# ==================== CATEGORY SERIALIZER ====================

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


# ==================== PRODUCT SERIALIZER ====================

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'


# ==================== PURCHASE ORDER SERIALIZERS ====================

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()  # Changed to SerializerMethodField
    product_code = serializers.CharField(source='product.product_code', read_only=True, allow_null=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
    
    def get_product_name(self, obj):
        """Safely get product name, handling None products"""
        if obj.product:
            return obj.product.name
        # Fallback: try to get from purchase request if available
        elif obj.purchase_order and obj.purchase_order.purchase_request:
            return obj.purchase_order.purchase_request.item_name
        return 'Product Not Specified'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()  # ← CHANGE THIS
    days_until_delivery = serializers.SerializerMethodField()  # ← ADD THIS
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    has_invoice = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'vendor', 'vendor_name', 'purchase_request',
            'order_date', 'expected_delivery_date', 'delivery_deadline',
            'assigned_to', 'assigned_to_name', 'status', 'delivery_status',
            'subtotal', 'tax_amount', 'shipping_cost', 'total_amount',
            'delivery_notes', 'tracking_number', 'shipment_date',
            'items', 'days_until_delivery', 'notes', 'has_invoice' 
        ]
    
    def get_assigned_to_name(self, obj):  # ← INDENT THIS PROPERLY
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None
    
    def get_days_until_delivery(self, obj):  # ← INDENT THIS PROPERLY
        if obj.expected_delivery_date:
            from datetime import date
            delta = obj.expected_delivery_date - date.today()
            return delta.days
        return None
    
    def get_has_invoice(self, obj):  # ← ADD THIS
        return Invoice.objects.filter(purchase_order=obj).exists()
# ==================== INVOICE SERIALIZER ====================

class InvoiceSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    po_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = '__all__'
    
    def get_po_number(self, obj):
        if obj.purchase_order:
            return obj.purchase_order.po_number
        return None

# ==================== PAYMENT SERIALIZER ====================

# In serializers.py - UPDATE PaymentSerializer

class PaymentSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='invoice.vendor.company_name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['created_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None


# ==================== USER PROFILE SERIALIZERS ====================

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'vendor', 'phone', 'department', 'is_active']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


# ==================== EMPLOYEE SERIALIZERS ====================

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = ['department', 'position', 'phone']


class EmployeeSerializer(serializers.ModelSerializer):
    department = serializers.CharField(allow_blank=True, required=False, write_only=True)
    position = serializers.CharField(allow_blank=True, required=False, write_only=True)
    phone = serializers.CharField(allow_blank=True, required=False, write_only=True)
    has_usable_password = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_active', 'department', 'position', 'phone',
            'has_usable_password'
        ]
        read_only_fields = ['id', 'has_usable_password']
    
    def get_has_usable_password(self, obj):
        return obj.has_usable_password()
    
    def validate_username(self, value):
        if self.instance is None:
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError("A user with that username already exists.")
        else:
            if User.objects.filter(username=value).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("A user with that username already exists.")
        return value
    
    def validate_email(self, value):
        if self.instance is None:
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError("A user with that email already exists.")
        else:
            if User.objects.filter(email=value).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("A user with that email already exists.")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        department = validated_data.pop('department', '')
        position = validated_data.pop('position', '')
        phone = validated_data.pop('phone', '')
        
        try:
            user = User.objects.create(
                username=validated_data['username'],
                email=validated_data['email'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                is_staff=False,
                is_superuser=False
            )
            
            user.set_unusable_password()
            user.save()
            
            user_profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'role': 'employee',
                    'phone': phone,
                    'department': department,
                    'is_active': True
                }
            )
            
            EmployeeProfile.objects.create(
                user=user,
                department=department,
                position=position,
                phone=phone
            )
            
            return user
            
        except Exception as e:
            raise serializers.ValidationError(f"Failed to create employee: {str(e)}")
    
    @transaction.atomic
    def update(self, instance, validated_data):
        department = validated_data.pop('department', None)
        position = validated_data.pop('position', None)
        phone = validated_data.pop('phone', None)
        
        try:
            instance.username = validated_data.get('username', instance.username)
            instance.email = validated_data.get('email', instance.email)
            instance.first_name = validated_data.get('first_name', instance.first_name)
            instance.last_name = validated_data.get('last_name', instance.last_name)
            instance.is_active = validated_data.get('is_active', instance.is_active)
            instance.save()
            
            if hasattr(instance, 'profile'):
                if department is not None:
                    instance.profile.department = department
                if phone is not None:
                    instance.profile.phone = phone
                instance.profile.save()
            
            if department is not None or position is not None or phone is not None:
                profile_defaults = {}
                if department is not None:
                    profile_defaults['department'] = department
                if position is not None:
                    profile_defaults['position'] = position
                if phone is not None:
                    profile_defaults['phone'] = phone
                
                EmployeeProfile.objects.update_or_create(
                    user=instance,
                    defaults=profile_defaults
                )
            
            return instance
            
        except Exception as e:
            raise serializers.ValidationError(f"Failed to update employee: {str(e)}")
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        if hasattr(instance, 'employee_profile'):
            data['department'] = instance.employee_profile.department or ''
            data['position'] = instance.employee_profile.position or ''
            data['phone'] = instance.employee_profile.phone or ''
        elif hasattr(instance, 'profile'):
            data['department'] = instance.profile.department or ''
            data['position'] = ''
            data['phone'] = instance.profile.phone or ''
        else:
            data['department'] = ''
            data['position'] = ''
            data['phone'] = ''
        
        return data


# ==================== VENDOR DASHBOARD SERIALIZERS ====================

class VendorPurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)  # Make sure this is included
    days_until_delivery = serializers.SerializerMethodField()
    has_invoice = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'vendor_name', 'order_date', 
            'expected_delivery_date', 'actual_delivery_date',
            'status', 'delivery_status', 'shipment_date', 
            'tracking_number', 'delivery_notes',
            'subtotal', 'tax_amount', 'shipping_cost', 'total_amount',
            'items', 'days_until_delivery', 'notes', 'has_invoice'  # ← Make sure 'items' is here
        ]
        read_only_fields = ['po_number', 'order_date', 'subtotal', 'total_amount']
    
    def get_days_until_delivery(self, obj):
        if obj.expected_delivery_date:
            from datetime import date
            delta = obj.expected_delivery_date - date.today()
            return delta.days
        return None
    
    def get_has_invoice(self, obj):
        from .models import Invoice
        return Invoice.objects.filter(purchase_order=obj).exists()



class InvoiceUploadSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'vendor', 'vendor_name',
            'purchase_order', 'po_number', 'invoice_date', 'due_date',
            'total_amount', 'paid_amount', 'status',
            'invoice_file', 'uploaded_by', 'upload_date', 'notes'
        ]
        read_only_fields = ['uploaded_by', 'upload_date']


class DeliveryStatusUpdateSerializer(serializers.Serializer):
    delivery_status = serializers.ChoiceField(
        choices=PurchaseOrder.DELIVERY_STATUS_CHOICES
    )
    shipment_date = serializers.DateField(required=False, allow_null=True)
    tracking_number = serializers.CharField(required=False, allow_blank=True)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)


# ==================== PURCHASE REQUEST SERIALIZERS ====================

class PurchaseRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_id = serializers.IntegerField(source='employee.id', read_only=True, allow_null=True)
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    
    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 
            'item_name', 
            'quantity', 
            'department', 
            'urgency_level', 
            'status',
            'justification',
            'employee',  # ← Keep this for writing
            'employee_id',  # ← This is read-only
            'employee_name',
            'product',
            'product_name',
            'created_at',
            'updated_at',
            'reviewed_date',
            'reviewed_by',
            'rejection_reason'
        ]
        read_only_fields = ['id', 'employee_name', 'employee_id', 'product_name', 'created_at', 'updated_at']
    
    def get_employee_name(self, obj):
        """Safely get employee username"""
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.username
        return "Unknown"

# =========================
# RFQ SERIALIZERS
# =========================

class VendorQuotationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='rfq.vendor.company_name', read_only=True)
    rfq_number = serializers.CharField(source='rfq.rfq_number', read_only=True)
    purchase_request_id = serializers.IntegerField(source='rfq.purchase_request.id', read_only=True)
    item_name = serializers.CharField(source='rfq.purchase_request.item_name', read_only=True)
    
    class Meta:
        model = VendorQuotation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'subtotal', 'tax_amount', 'total_amount']


class RequestForQuotationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    vendor_email = serializers.EmailField(source='vendor.email', read_only=True)
    purchase_request_details = serializers.SerializerMethodField()  # Change this
    quotation = VendorQuotationSerializer(read_only=True)
    sent_by_name = serializers.SerializerMethodField()
    has_quotation = serializers.SerializerMethodField()
    
    class Meta:
        model = RequestForQuotation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'sent_date']
    
    def get_purchase_request_details(self, obj):
        """Safely serialize purchase request details"""
        if obj.purchase_request:
            return PurchaseRequestSerializer(obj.purchase_request).data
        return None
    
    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return f"{obj.sent_by.first_name} {obj.sent_by.last_name}".strip() or obj.sent_by.username
        return "N/A"
    
    def get_has_quotation(self, obj):
        return hasattr(obj, 'quotation')


# ==================== GOODS RECEIPT SERIALIZERS ====================

class GoodsReceiptSerializer(serializers.ModelSerializer):
    purchase_order_number = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceipt
        fields = [
            'id',
            'purchase_order',
            'purchase_order_number',
            'vendor_name',
            'delivered_quantity',
            'condition',
            'notes',
            'received_by',
            'received_by_name',
            'received_at',
        ]
        read_only_fields = ['purchase_order', 'received_by', 'received_at']

    def get_purchase_order_number(self, obj):
        if obj.purchase_order:
            return obj.purchase_order.po_number
        return None

    def get_vendor_name(self, obj):
        if obj.purchase_order and obj.purchase_order.vendor:
            return obj.purchase_order.vendor.company_name
        return None

    def get_received_by_name(self, obj):
        if obj.received_by:
            full_name = f"{obj.received_by.first_name} {obj.received_by.last_name}".strip()
            return full_name if full_name else obj.received_by.username
        return '—'


# ==================== NOTIFICATION SERIALIZERS ====================

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'type', 'message', 'read', 
            'related_request', 'related_order', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']