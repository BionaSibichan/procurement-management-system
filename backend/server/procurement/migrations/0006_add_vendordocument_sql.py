# Corrected migration matching the actual VendorDocument model
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0005_alter_purchaseorder_options_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            # Forward SQL - creates the table with correct fields
            sql="""
                CREATE TABLE IF NOT EXISTS procurement_vendordocument (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    vendor_id BIGINT NOT NULL,
                    document_type VARCHAR(50) NOT NULL,
                    document_file VARCHAR(255) NOT NULL,
                    uploaded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    verified TINYINT(1) NOT NULL DEFAULT 0,
                    verified_by_id INT NULL,
                    INDEX idx_vendor (vendor_id),
                    INDEX idx_verified_by (verified_by_id),
                    CONSTRAINT fk_vendordoc_vendor 
                        FOREIGN KEY (vendor_id) 
                        REFERENCES procurement_vendor(id) 
                        ON DELETE CASCADE,
                    CONSTRAINT fk_vendordoc_verified_by 
                        FOREIGN KEY (verified_by_id) 
                        REFERENCES auth_user(id) 
                        ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            # Reverse SQL - drops the table
            reverse_sql="DROP TABLE IF EXISTS procurement_vendordocument;"
        ),
    ]