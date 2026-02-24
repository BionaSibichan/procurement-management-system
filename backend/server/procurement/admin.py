from django.contrib import admin
from .models import (
    UserProfile, EmployeeProfile, Vendor, VendorDocument,
    Category, Product, PurchaseOrder, PurchaseOrderItem,
    Invoice, Payment
)


# ==================== USER PROFILE ADMIN ====================

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'department', 'phone', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['user__username', 'user__email', 'department']
    readonly_fields = ['created_at', 'updated_at']


# ==================== EMPLOYEE PROFILE ADMIN ====================

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'position', 'phone', 'created_at']
    list_filter = ['department']
    search_fields = ['user__username', 'user__email', 'department', 'position']
    readonly_fields = ['created_at', 'updated_at']


# ==================== VENDOR ADMIN ====================

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['vendor_code', 'company_name', 'contact_person', 'email', 'phone', 'is_active', 'status']
    list_filter = ['is_active', 'status', 'city', 'country']
    search_fields = ['vendor_code', 'company_name', 'contact_person', 'email']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor_code', 'company_name', 'contact_person', 'email', 'phone')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'postal_code', 'country')
        }),
        ('Business Details', {
            'fields': ('tax_id', 'payment_terms', 'credit_limit')
        }),
        ('Status', {
            'fields': ('is_active', 'status', 'rating', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VendorDocument)
class VendorDocumentAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'document_type', 'uploaded_at', 'verified', 'verified_by']
    list_filter = ['verified', 'document_type']
    search_fields = ['vendor__company_name', 'document_type']
    readonly_fields = ['uploaded_at']


# ==================== CATEGORY ADMIN ====================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


# ==================== PRODUCT ADMIN ====================

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['product_code', 'name', 'category', 'unit_price', 'current_stock', 'reorder_level', 'is_active']
    list_filter = ['is_active', 'category']
    search_fields = ['product_code', 'name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('product_code', 'name', 'description', 'category')
        }),
        ('Inventory', {
            'fields': ('unit_of_measure', 'current_stock', 'reorder_level')
        }),
        ('Pricing', {
            'fields': ('unit_price',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ==================== PURCHASE ORDER ADMIN ====================

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = ['product', 'quantity', 'unit_price', 'line_total', 'received_quantity', 'notes']
    readonly_fields = ['line_total']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'vendor', 'order_date', 'expected_delivery_date', 'status', 'total_amount']
    list_filter = ['status', 'order_date']
    search_fields = ['po_number', 'vendor__company_name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [PurchaseOrderItemInline]
    fieldsets = (
        ('Order Information', {
            'fields': ('po_number', 'vendor', 'order_date', 'expected_delivery_date', 'actual_delivery_date', 'status')
        }),
        ('Financial Details', {
            'fields': ('subtotal', 'tax_amount', 'shipping_cost', 'total_amount')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ['purchase_order', 'product', 'quantity', 'unit_price', 'line_total', 'received_quantity']
    list_filter = ['purchase_order__status']
    search_fields = ['purchase_order__po_number', 'product__name']
    readonly_fields = ['line_total', 'created_at']


# ==================== INVOICE ADMIN ====================

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'vendor', 'invoice_date', 'due_date', 'status', 'total_amount', 'paid_amount', 'balance_due']
    list_filter = ['status', 'invoice_date']
    search_fields = ['invoice_number', 'vendor__company_name']
    readonly_fields = ['created_at', 'updated_at', 'balance_due']
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'vendor', 'purchase_order', 'invoice_date', 'due_date', 'status')
        }),
        ('Financial Details', {
            'fields': ('subtotal', 'tax_amount', 'total_amount', 'paid_amount', 'balance_due')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ==================== PAYMENT ADMIN ====================

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_number', 'invoice', 'amount', 'payment_date', 'payment_method']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['payment_number', 'invoice__invoice_number', 'reference_number']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_number', 'invoice', 'amount', 'payment_date', 'payment_method')
        }),
        ('Reference', {
            'fields': ('reference_number', 'notes')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )