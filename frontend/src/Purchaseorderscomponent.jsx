// Add this component to your AdminDashboard.jsx file

// Purchase Orders View Component
function PurchaseOrdersView({ onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/`);
      if (res.ok) {
        const data = await res.json();
        console.log('Purchase Orders:', data);
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, poNumber) => {
    if (!window.confirm(`Delete Purchase Order ${poNumber}?`)) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Purchase Order deleted successfully!');
        fetchOrders();
      } else {
        alert('Failed to delete purchase order');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowEditForm(true);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setSelectedOrder(null);
    fetchOrders();
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (loading) {
    return <div style={styles.emptyState}>Loading purchase orders...</div>;
  }

  return (
    <>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Purchase Orders ({orders.length})</h3>
          <div style={styles.filterButtons}>
            <button 
              style={filter === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('all')}
            >
              All ({orders.length})
            </button>
            <button 
              style={filter === 'draft' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('draft')}
            >
              Draft ({orders.filter(o => o.status === 'draft').length})
            </button>
            <button 
              style={filter === 'pending' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('pending')}
            >
              Pending ({orders.filter(o => o.status === 'pending').length})
            </button>
            <button 
              style={filter === 'in_progress' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('in_progress')}
            >
              In Progress ({orders.filter(o => o.status === 'in_progress').length})
            </button>
            <button 
              style={filter === 'delivered' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('delivered')}
            >
              Delivered ({orders.filter(o => o.status === 'delivered').length})
            </button>
            <button 
              style={styles.addButton}
              onClick={() => setShowCreateForm(true)}
            >
              + Create New PO
            </button>
            <button 
              style={styles.filterBtn}
              onClick={fetchOrders}
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>PO Number</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Order Date</th>
                <th style={styles.th}>Expected Delivery</th>
                <th style={styles.th}>Assigned To</th>
                <th style={styles.th}>Total Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <span style={{fontWeight: '600', color: '#1E293B'}}>
                      {order.po_number}
                    </span>
                  </td>
                  <td style={styles.td}>{order.vendor_name || 'N/A'}</td>
                  <td style={styles.td}>
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    {order.expected_delivery_date 
                      ? new Date(order.expected_delivery_date).toLocaleDateString()
                      : 'Not set'}
                  </td>
                  <td style={styles.td}>
                    {order.assigned_to_name || 'Unassigned'}
                  </td>
                  <td style={styles.td}>
                    <span style={{fontWeight: '600', color: '#059669'}}>
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={getPOStatusBadgeStyle(order.status)}>
                      {order.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button 
                        onClick={() => handleViewDetails(order)}
                        style={{...styles.actionBtn, color: '#3B82F6'}}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button 
                        onClick={() => handleEdit(order)}
                        style={styles.actionBtn}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(order.id, order.po_number)}
                        style={{...styles.actionBtn, color: '#EF4444'}}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'all' 
                ? 'No purchase orders found. Create your first purchase order!' 
                : `No ${filter} orders found.`}
            </div>
          )}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreatePurchaseOrderForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Edit Form Modal */}
      {showEditForm && selectedOrder && (
        <EditPurchaseOrderForm
          order={selectedOrder}
          onClose={() => {
            setShowEditForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <PurchaseOrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onRefresh={fetchOrders}
        />
      )}
    </>
  );
}

// Create Purchase Order Form
function CreatePurchaseOrderForm({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Select source, 2: Fill details
  const [sourceType, setSourceType] = useState(''); // 'manual' or 'from_request'
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    vendor: '',
    purchase_request: '',
    assigned_to: '',
    expected_delivery_date: '',
    delivery_deadline: '',
    notes: '',
    items: [],
    tax_amount: '0.00',
    shipping_cost: '0.00'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch vendors
      const vendorsRes = await apiFetch(`${API_BASE_URL}/vendors/`);
      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setVendors(vendorsData.filter(v => v.is_active));
      }

      // Fetch employees
      const employeesRes = await apiFetch(`${API_BASE_URL}/employees/`);
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData.filter(e => e.is_active));
      }

      // Fetch products
      const productsRes = await apiFetch(`${API_BASE_URL}/products/`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.filter(p => p.is_active));
      }

      // Fetch approved purchase requests
      const requestsRes = await apiFetch(`${API_BASE_URL}/purchase-requests/`);
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setApprovedRequests(requestsData.filter(r => r.status === 'approved'));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleSourceSelection = (type) => {
    setSourceType(type);
    if (type === 'manual') {
      // Initialize with one empty item
      setFormData({
        ...formData,
        items: [{
          product: '',
          quantity: 1,
          unit_price: '0.00'
        }]
      });
    }
    setStep(2);
  };

  const handleRequestSelection = (requestId) => {
    const request = approvedRequests.find(r => r.id === parseInt(requestId));
    if (request && request.product) {
      setFormData({
        ...formData,
        purchase_request: requestId,
        items: [{
          product: request.product,
          quantity: request.quantity,
          unit_price: products.find(p => p.id === request.product)?.unit_price || '0.00'
        }]
      });
    } else {
      setFormData({
        ...formData,
        purchase_request: requestId
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { product: '', quantity: 1, unit_price: '0.00' }
      ]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-fill unit price when product is selected
    if (field === 'product') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = product.unit_price;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const lineTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
      return sum + lineTotal;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = parseFloat(formData.tax_amount || 0);
    const shipping = parseFloat(formData.shipping_cost || 0);
    return subtotal + tax + shipping;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.vendor) {
      setError('Please select a vendor');
      return;
    }

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    for (let item of formData.items) {
      if (!item.product || !item.quantity || parseFloat(item.quantity) <= 0) {
        setError('Please fill in all item details with valid quantities');
        return;
      }
    }

    setLoading(true);

    try {
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const payload = {
        vendor: parseInt(formData.vendor),
        purchase_request: formData.purchase_request ? parseInt(formData.purchase_request) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        expected_delivery_date: formData.expected_delivery_date || null,
        delivery_deadline: formData.delivery_deadline || null,
        tax_amount: parseFloat(formData.tax_amount || 0),
        shipping_cost: parseFloat(formData.shipping_cost || 0),
        notes: formData.notes || '',
        created_by: currentUser.id,
        status: 'draft',
        items: formData.items.map(item => ({
          product: parseInt(item.product),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      console.log('Creating PO with payload:', payload);

      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`Purchase Order ${data.po_number} created successfully!`);
        setTimeout(() => onSuccess(), 1500);
      } else {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        setError(JSON.stringify(errorData));
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth: '900px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Create Purchase Order</h2>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        {step === 1 && (
          <div>
            <p style={{fontSize: '15px', color: '#6B7280', marginBottom: '24px'}}>
              Choose how you want to create this purchase order:
            </p>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <button
                onClick={() => handleSourceSelection('manual')}
                style={{
                  padding: '24px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <div style={{fontSize: '32px', marginBottom: '12px'}}>📝</div>
                <div style={{fontSize: '16px', fontWeight: '600', marginBottom: '8px'}}>
                  Create Manually
                </div>
                <div style={{fontSize: '14px', color: '#6B7280'}}>
                  Start from scratch and add items manually
                </div>
              </button>

              <button
                onClick={() => {
                  setSourceType('from_request');
                  setStep(2);
                }}
                style={{
                  padding: '24px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <div style={{fontSize: '32px', marginBottom: '12px'}}>✅</div>
                <div style={{fontSize: '16px', fontWeight: '600', marginBottom: '8px'}}>
                  From Approved Request
                </div>
                <div style={{fontSize: '14px', color: '#6B7280'}}>
                  Create from an approved purchase request
                </div>
                {approvedRequests.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'inline-block'
                  }}>
                    {approvedRequests.length} available
                  </div>
                )}
              </button>
            </div>

            <div style={{marginTop: '24px', textAlign: 'right'}}>
              <button onClick={onClose} style={styles.btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            {/* Source Selection */}
            {sourceType === 'from_request' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Approved Purchase Request</label>
                <select
                  value={formData.purchase_request}
                  onChange={(e) => handleRequestSelection(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Choose a purchase request...</option>
                  {approvedRequests.map(req => (
                    <option key={req.id} value={req.id}>
                      #{req.id} - {req.item_name} (Qty: {req.quantity}) - {req.employee_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main PO Details */}
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vendor *</label>
                <select
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.company_name} ({v.vendor_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assign To Employee</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Select Employee (Optional)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.username})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Delivery Deadline</label>
                <input
                  type="date"
                  value={formData.delivery_deadline}
                  onChange={(e) => setFormData({...formData, delivery_deadline: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Items Section */}
            <div style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', margin: 0}}>Order Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  + Add Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} style={{
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: '#F9FAFB'
                }}>
                  <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end'}}>
                    <div>
                      <label style={{...styles.label, fontSize: '13px'}}>Product *</label>
                      <select
  value={item.product}
  onChange={(e) => updateItem(index, 'product', e.target.value)}
  style={styles.input}
  required
>
  <option value="">Select Product</option>
  {products.length === 0 ? (
    <option value="" disabled>No active products available</option>
  ) : (
    products.map(p => (
      <option key={p.id} value={p.id}>
        {p.name} - ${p.unit_price}
      </option>
    ))
  )}
</select>
                    </div>

                    <div>
                      <label style={{...styles.label, fontSize: '13px'}}>Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div>
                      <label style={{...styles.label, fontSize: '13px'}}>Unit Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{
                          padding: '12px',
                          backgroundColor: '#EF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                        disabled={formData.items.length === 1}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{marginTop: '8px', fontSize: '14px', fontWeight: '600', color: '#059669'}}>
                    Line Total: ${(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Summary */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#F0F9FF',
              borderRadius: '8px',
              border: '1px solid #BAE6FD'
            }}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tax Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({...formData, tax_amount: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Shipping Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({...formData, shipping_cost: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #BAE6FD'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#6B7280'}}>Subtotal:</span>
                  <span style={{fontSize: '14px', fontWeight: '600'}}>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#6B7280'}}>Tax:</span>
                  <span style={{fontSize: '14px', fontWeight: '600'}}>${parseFloat(formData.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#6B7280'}}>Shipping:</span>
                  <span style={{fontSize: '14px', fontWeight: '600'}}>${parseFloat(formData.shipping_cost || 0).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #0369A1'}}>
                  <span style={{fontSize: '16px', fontWeight: '700', color: '#1E293B'}}>Total:</span>
                  <span style={{fontSize: '18px', fontWeight: '700', color: '#059669'}}>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{marginTop: '16px'}}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                style={{...styles.input, minHeight: '80px'}}
                placeholder="Add any additional notes or instructions..."
              />
            </div>

            {/* Actions */}
            <div style={styles.modalActions}>
              <button type="submit" style={styles.btnPrimary} disabled={loading}>
                {loading ? 'Creating...' : 'Create Purchase Order'}
              </button>
              <button 
                type="button" 
                onClick={() => step === 1 ? onClose() : setStep(1)} 
                style={styles.btnSecondary}
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Edit Purchase Order Form (simplified version)
function EditPurchaseOrderForm({ order, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    status: order.status || 'draft',
    expected_delivery_date: order.expected_delivery_date || '',
    delivery_deadline: order.delivery_deadline || '',
    assigned_to: order.assigned_to || '',
    notes: order.notes || ''
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/employees/`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.filter(e => e.is_active));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        status: formData.status,
        expected_delivery_date: formData.expected_delivery_date || null,
        delivery_deadline: formData.delivery_deadline || null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        notes: formData.notes
      };

      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${order.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess('Purchase order updated successfully!');
        setTimeout(() => onSuccess(), 1500);
      } else {
        const errorData = await res.json();
        setError(JSON.stringify(errorData));
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Edit Purchase Order</h2>
        <div style={styles.modalSubtitle}>PO Number: {order.po_number}</div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                style={styles.input}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent to Vendor</option>
                <option value="in_progress">In Progress</option>
                <option value="received">Received</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Assign To Employee</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                style={styles.input}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Expected Delivery Date</label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Delivery Deadline</label>
              <input
                type="date"
                value={formData.delivery_deadline}
                onChange={(e) => setFormData({...formData, delivery_deadline: e.target.value})}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              style={{...styles.input, minHeight: '80px'}}
            />
          </div>

          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Updating...' : 'Update Purchase Order'}
            </button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Purchase Order Details Modal
function PurchaseOrderDetailsModal({ order, onClose, onRefresh }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Purchase Order Details</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <DetailItem label="PO Number" value={order.po_number} />
          <DetailItem label="Status" value={<span style={getPOStatusBadgeStyle(order.status)}>{order.status?.replace('_', ' ')}</span>} />
          <DetailItem label="Vendor" value={order.vendor_name} />
          <DetailItem label="Order Date" value={new Date(order.order_date).toLocaleDateString()} />
          <DetailItem label="Expected Delivery" value={order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'Not set'} />
          <DetailItem label="Delivery Deadline" value={order.delivery_deadline ? new Date(order.delivery_deadline).toLocaleDateString() : 'Not set'} />
          <DetailItem label="Assigned To" value={order.assigned_to_name || 'Unassigned'} />
        </div>

        {/* Items */}
        <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px'}}>Order Items</h3>
        <div style={{marginBottom: '24px'}}>
          {order.items && order.items.length > 0 ? (
            <table style={{...styles.table, fontSize: '14px'}}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{...styles.th, padding: '12px'}}>Product</th>
                  <th style={{...styles.th, padding: '12px'}}>Quantity</th>
                  <th style={{...styles.th, padding: '12px'}}>Unit Price</th>
                  <th style={{...styles.th, padding: '12px'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{...styles.td, padding: '12px'}}>{item.product_name || item.name || 'N/A'}</td>
                    <td style={{...styles.td, padding: '12px'}}>{item.quantity}</td>
                    <td style={{...styles.td, padding: '12px'}}>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td style={{...styles.td, padding: '12px', fontWeight: '600', color: '#059669'}}>
                      ${parseFloat(item.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>No items found</div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div style={{
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Subtotal:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>${parseFloat(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Tax:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>${parseFloat(order.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Shipping:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>${parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #E5E7EB'}}>
            <span style={{fontSize: '16px', fontWeight: '700'}}>Total Amount:</span>
            <span style={{fontSize: '18px', fontWeight: '700', color: '#059669'}}>
              ${parseFloat(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{marginBottom: '24px'}}>
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#6B7280'}}>Notes</h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              {order.notes}
            </div>
          </div>
        )}

        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.btnPrimary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for details
function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{fontSize: '12px', color: '#6B7280', marginBottom: '4px', fontWeight: '500'}}>
        {label}
      </div>
      <div style={{fontSize: '14px', color: '#1E293B', fontWeight: '600'}}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

// Helper function for PO status badge styling
function getPOStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'capitalize'
  };

  const colors = {
    draft: { backgroundColor: '#F3F4F6', color: '#1F2937' },
    pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    approved: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    sent: { backgroundColor: '#E0E7FF', color: '#3730A3' },
    in_progress: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    received: { backgroundColor: '#E0E7FF', color: '#3730A3' },
    delivered: { backgroundColor: '#D1FAE5', color: '#065F46' },
    delayed: { backgroundColor: '#FED7AA', color: '#9A3412' },
    cancelled: { backgroundColor: '#FEE2E2', color: '#991B1B' }
  };

  return { ...baseStyle, ...(colors[status] || colors.draft) };
}

