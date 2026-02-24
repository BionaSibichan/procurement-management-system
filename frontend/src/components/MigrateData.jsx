import React, { useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

function MigrateData() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const migrateVendors = async () => {
    setIsLoading(true);
    setStatus('Migrating vendors...');
    
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    
    if (vendors.length === 0) {
      setStatus('No vendors found in localStorage');
      setIsLoading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const vendor of vendors) {
      try {
        const response = await fetch(`${API_BASE_URL}/vendors/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vendor),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error migrating vendor:', error);
        errorCount++;
      }
    }
    
    setStatus(`Migration complete! Success: ${successCount}, Errors: ${errorCount}`);
    setIsLoading(false);
  };

  const migrateProducts = async () => {
    setIsLoading(true);
    setStatus('Migrating products...');
    
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if (products.length === 0) {
      setStatus('No products found in localStorage');
      setIsLoading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const response = await fetch(`${API_BASE_URL}/products/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(product),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error migrating product:', error);
        errorCount++;
      }
    }
    
    setStatus(`Migration complete! Success: ${successCount}, Errors: ${errorCount}`);
    setIsLoading(false);
  };

  const migrateAll = async () => {
    setIsLoading(true);
    setStatus('Starting migration...');
    
    // Migrate vendors first
    await migrateVendors();
    
    // Then products
    await migrateProducts();
    
    // Add more migrations as needed (purchase orders, invoices, etc.)
    
    setStatus('All data migrated!');
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>Migrate LocalStorage Data to Database</h2>
      <p>Click the button below to transfer your localStorage data to the database.</p>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={migrateVendors} 
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Migrate Vendors
        </button>
        
        <button 
          onClick={migrateProducts} 
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Migrate Products
        </button>
        
        <button 
          onClick={migrateAll} 
          disabled={isLoading}
          style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white' }}
        >
          Migrate All Data
        </button>
      </div>
      
      {status && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <strong>Status:</strong> {status}
        </div>
      )}
      
      {isLoading && <p>Please wait...</p>}
    </div>
  );
}

export default MigrateData;