from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models.signals import pre_save
from django.dispatch import receiver
import secrets
import string

# =========================
# USER PROFILE
# =========================
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('employee', 'Procurement Staff'),
        ('vendor', 'Vendor'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    
    vendor = models.ForeignKey(
        'Vendor', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='user_profiles',
        help_text="Link to vendor if user is a vendor"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    class Meta:
        ordering = ['user__username']


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


# =========================
# EMPLOYEE PROFILE
# =========================
class EmployeeProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    department = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.position or 'Employee'}"
    
    class Meta:
        db_table = 'procurement_employeeprofile'
        verbose_name = 'Employee Profile'
        verbose_name_plural = 'Employee Profiles'


# =========================
# VENDOR
# =========================
class Vendor(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    
    vendor_code = models.CharField(max_length=50, unique=True)
    company_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    
    tax_id = models.CharField(max_length=50, blank=True)
    payment_terms = models.CharField(max_length=100, default="Net 30")
    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vendor_account',
        help_text="User account for vendor portal access"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'  # ← Change default from 'approved' to 'pending'
    )
    
    # ADD these new fields:
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_vendors',
        help_text="Admin who approved this vendor"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    rejected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_vendors'
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['company_name']
    
    def __str__(self):
        return f"{self.vendor_code} - {self.company_name}"


# =========================
# VENDOR DOCUMENTS
# =========================
class VendorDocument(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50)
    document_file = models.FileField(upload_to='vendor_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_documents'
    )
    
    def __str__(self):
        return f"{self.vendor.company_name} - {self.document_type}"


# =========================
# CATEGORY
# =========================
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


# =========================
# PRODUCT
# =========================
class Product(models.Model):
    product_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    
    unit_of_measure = models.CharField(max_length=50, default="pieces")
    current_stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.product_code} - {self.name}"


# =========================
# PURCHASE REQUEST
# =========================
class PurchaseRequest(models.Model):
    
    employee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL,  # Sets to NULL instead of cascade delete
        null=True, 
        blank=True
    )
    URGENCY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('rfq_sent', 'RFQ Sent to Vendor'),
        ('quotation_received', 'Quotation Received'),
        ('completed', 'Completed'),
    ]
    
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employee_purchase_requests')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    department = models.CharField(max_length=100)
    urgency_level = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='medium')
    justification = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_purchase_requests')
    reviewed_date = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"PR #{self.id} - {self.item_name} ({self.status})"


# =========================
# PURCHASE REQUEST ITEM
# =========================
class PurchaseRequestItem(models.Model):
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity_requested = models.IntegerField(validators=[MinValueValidator(1)])
    justification = models.TextField(blank=True)
    estimated_unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"PR #{self.purchase_request.id} - {self.product.name}"


# =========================
# REQUEST FOR QUOTATION (RFQ)
# =========================
class RequestForQuotation(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent to Vendor'),
        ('received', 'Quotation Received'),
        ('accepted', 'Quotation Accepted'),
        ('rejected', 'Quotation Rejected'),
        ('expired', 'Expired'),
    ]
    
    rfq_number = models.CharField(max_length=50, unique=True)
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='rfqs'
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name='rfqs'
    )
    
    sent_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_rfqs'
    )
    sent_date = models.DateTimeField(auto_now_add=True)
    response_deadline = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    admin_notes = models.TextField(blank=True, help_text="Internal notes from admin")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-sent_date']
        verbose_name = 'Request for Quotation'
        verbose_name_plural = 'Requests for Quotation'
    
    def __str__(self):
        return f"RFQ-{self.rfq_number} - {self.vendor.company_name}"


# =========================
# VENDOR QUOTATION
# =========================
class VendorQuotation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    rfq = models.OneToOneField(
        RequestForQuotation,
        on_delete=models.CASCADE,
        related_name='quotation'
    )
    
    quotation_number = models.CharField(max_length=50, unique=True)
    
    # Pricing details
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Tax percentage (e.g., 18 for 18%)"
    )
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Delivery details
    estimated_delivery_days = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of days for delivery"
    )
    
    # Validity
    quotation_valid_until = models.DateField(help_text="Date until this quotation is valid")
    
    # Additional info
    payment_terms = models.CharField(max_length=200, default="Net 30")
    warranty_terms = models.TextField(blank=True)
    additional_notes = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Review details
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_quotations'
    )
    reviewed_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    submitted_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Quote-{self.quotation_number} - {self.rfq.vendor.company_name}"
    
    def save(self, *args, **kwargs):
        # Calculate totals
        self.subtotal = Decimal(self.quantity) * self.unit_price
        self.tax_amount = (self.subtotal * self.tax_rate) / Decimal('100')
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_cost
        super().save(*args, **kwargs)


# =========================
# PURCHASE ORDER
# =========================
class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('sent', 'Sent to Vendor'),
        ('in_progress', 'In Progress'),
        ('received', 'Received'),
        ('delivered', 'Delivered'),
        ('delayed', 'Delayed'),
        ('cancelled', 'Cancelled'),
    ]
    
    DELIVERY_STATUS_CHOICES = [
        ('pending', 'Pending Shipment'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('delayed', 'Delayed'),
        ('cancelled', 'Cancelled'),
    ]
    
    po_number = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name='purchase_orders')
    
    order_date = models.DateField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivery_deadline = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='pending')
    
    purchase_request = models.ForeignKey(
        PurchaseRequest, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True,
        related_name='purchase_orders',
        help_text="Source purchase request"
    )
    
    vendor_quotation = models.ForeignKey(
        'VendorQuotation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_orders',
        help_text="Source vendor quotation"
    )
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.PROTECT,
        related_name='created_purchase_orders'
    )
    
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_purchase_orders')
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_quantity = models.IntegerField(default=0)
    
    shipment_date = models.DateField(null=True, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    delivery_notes = models.TextField(blank=True)
    delay_reason = models.TextField(blank=True)
    last_status_update = models.DateTimeField(null=True, blank=True)
    status_updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='po_status_updates'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-order_date', '-created_at']
    
    def __str__(self):
        return f"PO-{self.po_number}"
    
    def calculate_total(self):
        items = self.items.all()
        self.subtotal = sum(item.line_total for item in items)
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_cost
        self.save()


# =========================
# PURCHASE ORDER ITEM
# =========================
class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    product_name = models.CharField(max_length=255, blank=True)  # ← ADD THIS
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    received_quantity = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.line_total = Decimal(self.quantity) * self.unit_price
        # Auto-populate product_name if not set
        if not self.product_name and self.product:
            self.product_name = self.product.name
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.purchase_order and self.product:
            return f"{self.purchase_order.po_number} - {self.product.name}"
        return f"PO Item #{self.id}"


# =========================
# GOODS RECEIPT
# =========================
class GoodsReceipt(models.Model):
    CONDITION_CHOICES = [
        ('good', 'Good Condition'),
        ('damaged', 'Damaged'),
        ('partial', 'Partial Delivery'),
        ('shortage', 'Shortage'),
    ]
    
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='goods_receipts')
    delivered_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_goods')
    received_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"GR for PO #{self.purchase_order.po_number}"


# =========================
# GOODS RECEIPT ITEM
# =========================
class GoodsReceiptItem(models.Model):
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='items')
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.PROTECT)
    quantity_received = models.IntegerField(validators=[MinValueValidator(0)])
    quantity_accepted = models.IntegerField(validators=[MinValueValidator(0)])
    quantity_rejected = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    rejection_reason = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.goods_receipt.purchase_order.po_number} - {self.purchase_order_item.product.name}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        product = self.purchase_order_item.product
        product.current_stock += self.quantity_accepted
        product.save()


# =========================
# INVOICE
# =========================
class Invoice(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    invoice_number = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    invoice_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    invoice_file = models.FileField(
        upload_to='invoices/%Y/%m/',
        null=True,
        blank=True,
        help_text="Uploaded invoice document (PDF/Excel)"
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_invoices',
        help_text="User who uploaded this invoice"
    )
    upload_date = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-invoice_date']
    
    def __str__(self):
        return f"INV-{self.invoice_number}"
    
    @property
    def balance_due(self):
        return self.total_amount - self.paid_amount


# =========================
# PAYMENT
# =========================
# In models.py - UPDATE Payment model

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('razorpay', 'Razorpay Online'),  # ← ADD THIS
        ('other', 'Other'),
    ]
    
    payment_number = models.CharField(max_length=50, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    vendor = models.ForeignKey(
        Vendor, 
        on_delete=models.PROTECT, 
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=100, choices=PAYMENT_METHOD_CHOICES)
    
    # ← ADD THESE NEW FIELDS
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    transaction_reference = models.CharField(max_length=100, blank=True)  # Existing field
    
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"PAY-{self.payment_number}"


# =========================
# NOTIFICATION
# =========================
class Notification(models.Model):
    TYPE_CHOICES = [
        ('approval', 'Approval'),
        ('rejection', 'Rejection'),
        ('delivery', 'Delivery'),
        ('rfq', 'RFQ'),
        ('quotation', 'Quotation'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    message = models.TextField()
    read = models.BooleanField(default=False)
    related_request = models.ForeignKey(PurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True)
    related_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    related_rfq = models.ForeignKey(RequestForQuotation, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Notification for {self.user.username} - {self.type}"
    
# =========================
# SIGNALS FOR AUTO-GENERATION
# =========================



@receiver(pre_save, sender=PurchaseOrder)
def generate_po_number(sender, instance, **kwargs):
    """Auto-generate PO number if not set"""
    if not instance.po_number or instance.po_number == '':
        # Generate unique PO number
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d')
        
        # Get max existing PO number
        existing_pos = PurchaseOrder.objects.filter(
            po_number__startswith='PO-'
        ).order_by('-po_number').first()
        
        if existing_pos and existing_pos.po_number:
            try:
                # Extract number from PO-YYYYMMDD-XXXX format
                last_num = int(existing_pos.po_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
        
        instance.po_number = f"PO-{timestamp}-{new_num:04d}"