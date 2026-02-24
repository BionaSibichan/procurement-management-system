from django.core.management.base import BaseCommand
from procurement.models import PurchaseOrder, PurchaseOrderItem

class Command(BaseCommand):
    help = 'Fix POs with missing items'

    def handle(self, *args, **kwargs):
        pos_without_items = PurchaseOrder.objects.filter(items__isnull=True)
        
        for po in pos_without_items:
            if po.vendor_quotation:
                # Create item from quotation
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product=po.purchase_request.product if po.purchase_request else None,
                    quantity=po.vendor_quotation.quantity,
                    unit_price=po.vendor_quotation.unit_price,
                    line_total=po.vendor_quotation.subtotal
                )
                self.stdout.write(f"✅ Fixed PO {po.po_number}")
            elif po.purchase_request:
                # Create item from purchase request
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product=po.purchase_request.product,
                    quantity=po.purchase_request.quantity,
                    unit_price=po.subtotal / po.purchase_request.quantity if po.purchase_request.quantity > 0 else 0,
                    line_total=po.subtotal
                )
                self.stdout.write(f"✅ Fixed PO {po.po_number}")
        
        self.stdout.write(self.style.SUCCESS(f'Fixed {pos_without_items.count()} purchase orders'))