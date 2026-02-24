from django.db import models
from vendors.models import Vendor

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Delivered', 'Delivered'),
    ]

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=100, unique=True)
    items = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.order_number
