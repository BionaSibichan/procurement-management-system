import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api';

// CSRF Helper
function getCsrfToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

async function apiFetch(url, options = {}) {
  const csrfToken = getCsrfToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.method && options.method !== 'GET') {
    headers['X-CSRFToken'] = csrfToken;
  }
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
}
// Email sending function
function EmployeeForm({ editData, onClose, onSuccess }) {
  const isEditing = !!editData;
  const [formData, setFormData] = useState(editData || {
    username: '', 
    email: '', 
    first_name: '', 
    last_name: '', 
    department: '', 
    position: '', 
    phone: '', 
    is_active: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ==================== VALIDATION FUNCTIONS ====================
  
  const validateName = (name, fieldName) => {
    if (!name || name.trim() === '') {
      return `${fieldName} is required`;
    }
    if (!/^[A-Za-z\s]+$/.test(name)) {
      return `${fieldName} should contain only alphabets and spaces`;
    }
    if (name.trim().length < 2) {
      return `${fieldName} should be at least 2 characters`;
    }
    if (name.trim().length > 50) {
      return `${fieldName} should not exceed 50 characters`;
    }
    return '';
  };

  const validateUsername = (username) => {
    if (!username || username.trim() === '') {
      return 'Username is required';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    if (username.length < 3) {
      return 'Username should be at least 3 characters';
    }
    if (username.length > 20) {
      return 'Username should not exceed 20 characters';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (phone && phone.trim() !== '') {
      // Remove spaces, hyphens, parentheses, and plus signs for validation
      const cleanPhone = phone.replace(/[\s\-()+ ]/g, '');
      if (!/^[0-9]{10,15}$/.test(cleanPhone)) {
        return 'Phone number should contain 10-15 digits';
      }
    }
    return '';
  };

  const validateDepartment = (department) => {
    if (department && department.trim() !== '') {
      if (!/^[A-Za-z\s&-]+$/.test(department)) {
        return 'Department should contain only alphabets, spaces, hyphens, and &';
      }
      if (department.trim().length > 100) {
        return 'Department name should not exceed 100 characters';
      }
    }
    return '';
  };

  const validatePosition = (position) => {
    if (position && position.trim() !== '') {
      if (!/^[A-Za-z\s&-]+$/.test(position)) {
        return 'Position should contain only alphabets, spaces, hyphens, and &';
      }
      if (position.trim().length > 100) {
        return 'Position should not exceed 100 characters';
      }
    }
    return '';
  };

  // Main validation function
  const validateForm = () => {
    const errors = {};
    
    errors.username = validateUsername(formData.username);
    errors.email = validateEmail(formData.email);
    errors.first_name = validateName(formData.first_name, 'First name');
    errors.last_name = validateName(formData.last_name, 'Last name');
    errors.phone = validatePhone(formData.phone);
    errors.department = validateDepartment(formData.department);
    errors.position = validatePosition(formData.position);

    // Remove empty error messages
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field changes with real-time validation
  const handleFieldChange = (field, value) => {
    setFormData({...formData, [field]: value});
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      const newErrors = {...validationErrors};
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  // ==================== FORM SUBMISSION ====================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate form before submission
    if (!validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }
    
    setLoading(true);

    try {
      const url = isEditing ? `${API_BASE_URL}/employees/${editData.id}/` : `${API_BASE_URL}/employees/`;
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (isEditing) {
          setSuccess('Employee updated successfully!');
        } else {
          setSuccess(
            `Employee created successfully!\n\n` +
            `Username: ${data.username || formData.username}\n` +
            `Password: ${data.temporary_password}\n` +
            `Email Status: ${data.email_status}\n\n` +
            (data.email_status === 'sent' 
              ? 'Credentials have been sent to HR email (company7915@gmail.com).'
              : 'Failed to send email. Please share these credentials manually.')
          );
        }
        setTimeout(() => onSuccess(), 3000);
      } else {
        const data = await response.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to save employee: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FORM ====================

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={{...styles.successAlert, whiteSpace: 'pre-wrap'}}>{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* Username Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Username *</label>
              <input 
                type="text" 
                placeholder="Enter username" 
                value={formData.username} 
                onChange={(e) => handleFieldChange('username', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.username ? '#EF4444' : '#E5E7EB'
                }} 
                disabled={isEditing} 
              />
              {validationErrors.username && (
                <div style={styles.validationError}>{validationErrors.username}</div>
              )}
            </div>

            {/* Email Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input 
                type="email" 
                placeholder="email@example.com" 
                value={formData.email} 
                onChange={(e) => handleFieldChange('email', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.email ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.email && (
                <div style={styles.validationError}>{validationErrors.email}</div>
              )}
            </div>

            {/* First Name Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name *</label>
              <input 
                type="text" 
                placeholder="First Name" 
                value={formData.first_name} 
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.first_name ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.first_name && (
                <div style={styles.validationError}>{validationErrors.first_name}</div>
              )}
            </div>

            {/* Last Name Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Last Name *</label>
              <input 
                type="text" 
                placeholder="Last Name" 
                value={formData.last_name} 
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.last_name ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.last_name && (
                <div style={styles.validationError}>{validationErrors.last_name}</div>
              )}
            </div>

            {/* Department Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Department</label>
              <input 
                type="text" 
                placeholder="Department (Optional)" 
                value={formData.department} 
                onChange={(e) => handleFieldChange('department', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.department ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.department && (
                <div style={styles.validationError}>{validationErrors.department}</div>
              )}
            </div>

            {/* Position Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Position</label>
              <input 
                type="text" 
                placeholder="Position (Optional)" 
                value={formData.position} 
                onChange={(e) => handleFieldChange('position', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.position ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.position && (
                <div style={styles.validationError}>{validationErrors.position}</div>
              )}
            </div>

            {/* Phone Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input 
                type="tel" 
                placeholder="Phone Number (Optional)" 
                value={formData.phone} 
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                style={{
                  ...styles.formInput,
                  borderColor: validationErrors.phone ? '#EF4444' : '#E5E7EB'
                }} 
              />
              {validationErrors.phone && (
                <div style={styles.validationError}>{validationErrors.phone}</div>
              )}
            </div>
          </div>

          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
            <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSendRFQModal, setShowSendRFQModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const user = { username: 'Admin User' };
  // Around line 170
const fetchInvoices = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/invoices/`);
    if (res.ok) {
      const data = await res.json();
      setInvoices(data);
    }
  } catch (err) {
    console.error('Error fetching invoices:', err);
  }
};
  const fetchDashboardData = async () => {
    await fetchInvoices();
    try {
      const statsRes = await apiFetch(`${API_BASE_URL}/dashboard/stats/`);
      if (statsRes.ok) setStats(await statsRes.json());

      const vendorsRes = await apiFetch(`${API_BASE_URL}/vendors/`);
      if (vendorsRes.ok) setVendors(await vendorsRes.json());

      const productsRes = await apiFetch(`${API_BASE_URL}/products/`);
      if (productsRes.ok) setProducts(await productsRes.json());

      const categoriesRes = await apiFetch(`${API_BASE_URL}/categories/`);
      if (categoriesRes.ok) setCategories(await categoriesRes.json());

      const employeesRes = await apiFetch(`${API_BASE_URL}/employees/`);
      if (employeesRes.ok) setEmployees(await employeesRes.json());

      const requestsRes = await apiFetch(`${API_BASE_URL}/purchase-requests/`);
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        console.log('Loaded purchase requests:', requestsData);
        setPurchaseRequests(requestsData);
      }
       const quotationsRes = await apiFetch(`${API_BASE_URL}/vendor-quotations/`);
    if (quotationsRes.ok) {
      const quotationsData = await quotationsRes.json();
      console.log('Loaded quotations:', quotationsData);
      setQuotations(quotationsData);
    }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await fetch(`${API_BASE_URL}/auth/csrf/`, {
          credentials: 'include',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    };

    fetchCsrfToken().then(() => {
      fetchDashboardData();
    });
  }, []);

  const handleAcceptQuotation = async (quotationId, rfqId, createPO = true) => {
  if (!window.confirm('Accept this quotation and create a Purchase Order?')) return;
  
  try {
    const res = await apiFetch(`${API_BASE_URL}/rfqs/${rfqId}/accept_quotation/`, {
      method: 'POST',
      body: JSON.stringify({ 
        create_po: createPO,
        expected_delivery_date: null // Will use quotation's estimated delivery
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'Quotation accepted and Purchase Order created successfully!');
      fetchDashboardData();
    } else {
      const error = await res.json();
      alert('Failed to accept quotation: ' + JSON.stringify(error));
    }
  } catch (err) {
    console.error('Error accepting quotation:', err);
    alert('Error: ' + err.message);
  }
};

const handleRejectQuotation = async (rfqId, reason) => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/rfqs/${rfqId}/reject_quotation/`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: reason })
    });
    
    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'Quotation rejected successfully');
      fetchDashboardData();
    } else {
      const error = await res.json();
      alert('Failed to reject quotation: ' + JSON.stringify(error));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

  // ADD these handler functions
  const handleApproveVendor = async (vendorId) => {
    if (!window.confirm('Approve this vendor and create their login account?')) return;
    
    try {
      const res = await apiFetch(`${API_BASE_URL}/vendors/${vendorId}/approve/`, {
        method: 'POST',
        body: JSON.stringify({ create_user_account: true })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        let message = data.message;
        if (data.credentials) {
          message += `\n\nLogin Credentials:\nUsername: ${data.credentials.username}\nPassword: ${data.credentials.password}\n\nThese have been emailed to the vendor.`;
        }
        
        alert(message);
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert('Failed to approve vendor: ' + JSON.stringify(error));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRejectVendor = async (vendorId, reason) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/vendors/${vendorId}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: reason })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Vendor rejected successfully');
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert('Failed to reject vendor: ' + JSON.stringify(error));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout/`, { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    if (type === 'employee') setShowEmployeeForm(true);
    if (type === 'vendor') setShowVendorForm(true);
    if (type === 'product') setShowProductForm(true);
    if (type === 'category') setShowCategoryForm(true);
  };

  const handleDelete = async (id, type, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const endpoints = {
        employee: 'employees',
        vendor: 'vendors',
        product: 'products',
        category: 'categories'
      };
      const res = await apiFetch(`${API_BASE_URL}/${endpoints[type]}/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Deleted successfully!');
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert('Failed to delete: ' + JSON.stringify(error));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Approve this purchase request?')) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-requests/${requestId}/approve/`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Request approved successfully!');
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert('Failed to approve: ' + JSON.stringify(error));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId, reason) => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/purchase-requests/${requestId}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason })
    });
    if (res.ok) {
      const data = await res.json();
      alert(data.message || 'Request rejected successfully!');
      setShowRejectModal(false);
      setSelectedRequest(null);
      fetchDashboardData();
    } else {
      const error = await res.json();
      alert('Failed to reject: ' + JSON.stringify(error));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

const handleSendRFQ = (request) => {
  setSelectedRequest(request);
  setShowSendRFQModal(true);
};

  const handleResetPassword = async (employeeId, username) => {
    if (!window.confirm(`Reset password for ${username}?`)) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/employees/${employeeId}/reset_password/`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Password reset!\n\nUsername: ${data.username}\nNew Password: ${data.temporary_password}\n\nPlease share this securely with the employee.`);
      } else {
        alert('Failed to reset password');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleActive = async (id, type, currentStatus, name) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}?`)) return;
    try {
      const endpoints = {
        employee: 'employees',
        vendor: 'vendors',
        product: 'products'
      };
      const res = await apiFetch(`${API_BASE_URL}/${endpoints[type]}/${id}/${action}/`, {
        method: 'POST'
      });
      if (res.ok) {
        alert(`${name} ${action}d successfully!`);
        fetchDashboardData();
      } else {
        const patchRes = await apiFetch(`${API_BASE_URL}/${endpoints[type]}/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: !currentStatus })
        });
        if (patchRes.ok) {
          alert(`${name} ${action}d successfully!`);
          fetchDashboardData();
        } else {
          alert('Failed to change status');
        }
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const closeForm = () => {
    setShowEmployeeForm(false);
    setShowVendorForm(false);
    setShowProductForm(false);
    setShowCategoryForm(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    closeForm();
    fetchDashboardData();
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const navItems = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'purchase-requests', icon: '📋', label: 'Purchase Requests' },
  { id: 'quotations', icon: '💰', label: 'Vendor Quotations' },  
  { id: 'invoices', icon: '📄', label: 'Invoices' },
  { id: 'vendors', icon: '🏢', label: 'Vendor Management' },
  { id: 'employees', icon: '👥', label: 'Employee Management' },
  { id: 'goods-receipts', icon: '📥', label: 'Goods Receipts' },
  { id: 'products', icon: '📦', label: 'Products' },
  { id: 'categories', icon: '🗂️', label: 'Categories' },
  { id: 'orders', icon: '🛒', label: 'Purchase Orders' },
  { id: 'reports', icon: '📈', label: 'Reports & Analytics' },
];
  

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={{...styles.sidebar, width: sidebarCollapsed ? '80px' : '280px'}}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>👤</div>
            {!sidebarCollapsed && <span style={styles.logoText}>Admin</span>}
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navItem,
                ...(activeTab === item.id ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{...styles.mainContent, marginLeft: sidebarCollapsed ? '80px' : '280px'}}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h1 style={styles.pageTitle}>
              {activeTab === 'dashboard' && 'Admin Dashboard'}
              {activeTab === 'purchase-requests' && 'Purchase Requests'}
              {activeTab === 'vendors' && 'Vendor Management'}
              {activeTab === 'employees' && 'Employee Management'}
              {activeTab === 'goods-receipts' && 'Goods Receipts'}
              {activeTab === 'products' && 'Products'}
              {activeTab === 'categories' && 'Categories'}
              {activeTab === 'orders' && 'Purchase Orders'}
              {activeTab === 'reports' && 'Reports & Analytics'}
              {activeTab === 'invoices' && 'Invoices'}   
            </h1>
          </div>
          <div style={styles.topBarRight}>
            {activeTab !== 'dashboard' && activeTab !== 'purchase-requests' && activeTab !== 'orders' && activeTab !== 'vendors' && activeTab !== 'reports' && activeTab !== 'quotations' && activeTab !== 'invoices' && activeTab !== 'goods-receipts' && (
              <button style={styles.addButton} onClick={() => {
                if (activeTab === 'vendors') setShowVendorForm(true);
                if (activeTab === 'employees') setShowEmployeeForm(true);
                if (activeTab === 'products') setShowProductForm(true);
                if (activeTab === 'categories') setShowCategoryForm(true);
              }}>
                + Add New
              </button>
            )}
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {activeTab === 'dashboard' && (
            <DashboardView 
              stats={stats} 
              purchaseRequests={purchaseRequests}
              onViewRequests={() => setActiveTab('purchase-requests')}
            />
          )}
          {activeTab === 'purchase-requests' && (
            <PurchaseRequestsView 
              requests={purchaseRequests}
              onApprove={handleApproveRequest}
              onReject={(request) => {
                setSelectedRequest(request);
                setShowRejectModal(true);
              }}
              onSendRFQ={handleSendRFQ}
              onRefresh={fetchDashboardData}
            />
          )}
          
          {activeTab === 'quotations' && (
  <QuotationsManagementView 
    quotations={quotations}
    onAccept={handleAcceptQuotation}
    onReject={handleRejectQuotation}
    onRefresh={fetchDashboardData}
  />
)}
          {activeTab === 'employees' && (
            <EmployeesView 
              employees={employees}
              onEdit={(emp) => handleEdit(emp, 'employee')}
              onDelete={(id, name) => handleDelete(id, 'employee', name)}
              onResetPassword={handleResetPassword}
              onToggleActive={(id, status, name) => handleToggleActive(id, 'employee', status, name)}
              onAddNew={() => setShowEmployeeForm(true)}
            />
          )}
          {activeTab === 'vendors' && (
            <VendorsView
              vendors={vendors}
              onEdit={(v) => handleEdit(v, 'vendor')}
              onDelete={(id, name) => handleDelete(id, 'vendor', name)}
              onToggleActive={(id, status, name) => handleToggleActive(id, 'vendor', status, name)}
              onAddNew={() => setShowVendorForm(true)}
              onApprove={handleApproveVendor}  // ← ADD THIS
              onReject={handleRejectVendor}  
            />
          )}
          {activeTab === 'goods-receipts' && (
            <GoodsReceiptsAdminView onRefresh={fetchDashboardData} />
        )}
          {activeTab === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              onEdit={(p) => handleEdit(p, 'product')}
              onDelete={(id, name) => handleDelete(id, 'product', name)}
              onToggleActive={(id, status, name) => handleToggleActive(id, 'product', status, name)}
              onAddNew={() => setShowProductForm(true)}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              onEdit={(c) => handleEdit(c, 'category')}
              onDelete={(id, name) => handleDelete(id, 'category', name)}
              onAddNew={() => setShowCategoryForm(true)}
            />
          )}
          {activeTab === 'invoices' && (
     <InvoicesManagementView 
       invoices={invoices}
       onRefresh={fetchDashboardData}
     />
   )}
          {activeTab === 'orders' && (
            <PurchaseOrdersView onRefresh={fetchDashboardData} />
          )}
          {activeTab === 'reports' && (
  <ReportsAnalyticsView />
)}
          
          
        </div>
      </div>

      {/* Forms */}
      {showEmployeeForm && (
        <EmployeeForm 
          editData={editingItem}
          onClose={closeForm} 
          onSuccess={handleFormSuccess} 
        />
      )}
      {showVendorForm && (
        <VendorForm 
          editData={editingItem}
          onClose={closeForm} 
          onSuccess={handleFormSuccess} 
        />
      )}
      {showProductForm && (
        <ProductForm 
          categories={categories} 
          editData={editingItem}
          onClose={closeForm} 
          onSuccess={handleFormSuccess} 
        />
      )}
      {showCategoryForm && (
        <CategoryForm 
          editData={editingItem}
          onClose={closeForm} 
          onSuccess={handleFormSuccess} 
        />
      )}
      {showRejectModal && selectedRequest && (
        <RejectModal
          request={selectedRequest}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
          }}
          onSubmit={(reason) => handleRejectRequest(selectedRequest.id, reason)}
        />
      )}
      {/* ADD THIS BLOCK HERE: */}
      {showSendRFQModal && selectedRequest && (
        <SendRFQModal
          request={selectedRequest}
          vendors={vendors.filter(v => v.is_active)}
          onClose={() => {
            setShowSendRFQModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowSendRFQModal(false);
            setSelectedRequest(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
    

// Dashboard View
function DashboardView({ stats, purchaseRequests, onViewRequests }) {
  const pendingRequests = purchaseRequests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Employees"
          value={stats?.total_employees || 0}
          subtitle={`${stats?.active_employees || 0} active`}
          color="#4A90E2"
          icon="👥"
        />
        <StatCard
          title="Total Vendors"
          value={stats?.total_vendors || 0}
          subtitle={`${stats?.active_vendors || 0} active`}
          color="#5ABE7F"
          icon="🏢"
        />
        <StatCard
          title="Total Products"
          value={stats?.total_products || 0}
          color="#F5A623"
          icon="📦"
          onClick={() => {/* Navigate to vendors tab showing pending */}}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          subtitle={`${stats?.total_purchase_requests || 0} total requests`}
          color="#BD10E0"
          icon="📋"
          onClick={onViewRequests}
        />
      </div>

      <div style={styles.dashboardGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Purchase Requests</h3>
          <div style={styles.activityList}>
            {purchaseRequests.slice(0, 5).map(req => (
              <ActivityItem 
                key={req.id}
                icon={req.status === 'pending' ? '⏳' : req.status === 'approved' ? '✅' : '❌'}
                title={`${req.item_name} - ${req.employee_name}`}
                time={new Date(req.created_at).toLocaleDateString()}
                color={req.status === 'pending' ? '#F5A623' : req.status === 'approved' ? '#5ABE7F' : '#EF4444'}
              />
            ))}
            {purchaseRequests.length === 0 && (
              <div style={styles.emptyState}>No purchase requests yet</div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Pending Actions</h3>
          <div style={styles.pendingList}>
            <PendingItem 
              title="Pending purchase requests"
              count={pendingRequests}
              color="#F5A623"
            />
            <PendingItem 
              title="Pending purchase orders"
              count={stats?.pending_orders || 0}
              color="#BD10E0"
            />
            <PendingItem 
              title="Pending invoices"
              count={stats?.pending_invoices || 0}
              color="#4A90E2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Purchase Requests View with Send RFQ functionality
function PurchaseRequestsView({ requests, onApprove, onReject, onSendRFQ, onRefresh }){
  const [filter, setFilter] = useState('all');

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>Purchase Requests ({requests.length})</h3>
        <div style={styles.filterButtons}>
          <button 
            style={filter === 'all' ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter('all')}
          >
            All ({requests.length})
          </button>
          <button 
            style={filter === 'pending' ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter('pending')}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button 
            style={filter === 'approved' ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter('approved')}
          >
            Approved ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button 
            style={filter === 'rejected' ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({requests.filter(r => r.status === 'rejected').length})
          </button>
          <button 
            style={styles.filterBtn}
            onClick={onRefresh}
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Item Name</th>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Urgency</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => (
              <tr key={req.id} style={styles.tableRow}>
                <td style={styles.td}>#{req.id}</td>
                <td style={styles.td}>{req.item_name}</td>
                <td style={styles.td}>{req.employee_name}</td>
                <td style={styles.td}>{req.department}</td>
                <td style={styles.td}>{req.quantity}</td>
                <td style={styles.td}>
                  <span style={getUrgencyBadgeStyle(req.urgency_level)}>
                    {req.urgency_level}
                  </span>
                </td>
                <td style={styles.td}>{new Date(req.created_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <span style={getStatusBadgeStyle(req.status)}>
                    {req.status}
                  </span>
                </td>
                <td style={styles.td}>
  {req.status === 'pending' && (
    <div style={styles.actionButtons}>
      <button 
        onClick={() => onApprove(req.id)} 
        style={{...styles.actionBtn, color: '#10B981'}} 
        title="Approve"
      >
        ✅
      </button>
      <button 
        onClick={() => onReject(req)} 
        style={{...styles.actionBtn, color: '#EF4444'}} 
        title="Reject"
      >
        ❌
      </button>
    </div>
  )}
  {req.status === 'approved' && (
    <div style={styles.actionButtons}>
      <button 
        onClick={() => onSendRFQ(req)} 
        style={{...styles.actionBtn, color: '#3B82F6', fontSize: '12px', padding: '6px 12px', background: '#DBEAFE', borderRadius: '6px'}} 
        title="Send RFQ to Vendor"
      >
        📨 Send RFQ
      </button>
    </div>
  )}
  {req.status === 'rejected' && (
    <span style={{fontSize: '12px', color: '#9CA3AF'}}>
      Rejected
    </span>
  )}
  {req.status === 'rfq_sent' && (
    <span style={{fontSize: '12px', color: '#3B82F6'}}>
      RFQ Sent
    </span>
  )}
</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRequests.length === 0 && (
          <div style={styles.emptyState}>
            {filter === 'all' 
              ? 'No purchase requests found' 
              : `No ${filter} requests found`}
          </div>
        )}
      </div>
    </div>
  );
}




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
                      ₹{parseFloat(order.total_amount || 0).toFixed(2)}
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
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState('');
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
      const vendorsRes = await apiFetch(`${API_BASE_URL}/vendors/`);
      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setVendors(vendorsData.filter(v => v.is_active));
      }

      const employeesRes = await apiFetch(`${API_BASE_URL}/employees/`);
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData.filter(e => e.is_active));
      }

      const productsRes = await apiFetch(`${API_BASE_URL}/products/`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.filter(p => p.is_active));
      }

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
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ~₹{p.unit_price} (ref.)
                          </option>
                        ))}
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

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#F0F9FF',
              borderRadius: '8px',
              border: '1px solid #BAE6FD'
            }}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tax Amount (₹)</label>
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
                  <label style={styles.label}>Shipping Cost (₹)</label>
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
                  <span style={{fontSize: '14px', fontWeight: '600'}}>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#6B7280'}}>Tax:</span>
                  <span style={{fontSize: '14px', fontWeight: '600'}}>₹{parseFloat(formData.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#6B7280'}}>Shipping:</span>
                  <span style={{fontSize: '14px', fontWeight: '600'}}>₹{parseFloat(formData.shipping_cost || 0).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #0369A1'}}>
                  <span style={{fontSize: '16px', fontWeight: '700', color: '#1E293B'}}>Total:</span>
                  <span style={{fontSize: '18px', fontWeight: '700', color: '#059669'}}>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{marginTop: '16px'}}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                style={{...styles.input, minHeight: '80px'}}
                placeholder="Add any additional notes or instructions..."
              />
            </div>

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

// Edit Purchase Order Form
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
function PurchaseOrderDetailsModal({ order, onClose }) {
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
                    <td style={{...styles.td, padding: '12px'}}>₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                    <td style={{...styles.td, padding: '12px', fontWeight: '600', color: '#059669'}}>
                      ₹{parseFloat(item.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>No items found</div>
          )}
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Subtotal:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Tax:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>₹{parseFloat(order.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Shipping:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>₹{parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #E5E7EB'}}>
            <span style={{fontSize: '16px', fontWeight: '700'}}>Total Amount:</span>
            <span style={{fontSize: '18px', fontWeight: '700', color: '#059669'}}>
              ₹{parseFloat(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

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

// Reject Modal
function RejectModal({ request, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    await onSubmit(reason);
    setLoading(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Reject Purchase Request</h2>
        <div style={styles.modalSubtitle}>
          Request #{request.id}: {request.item_name}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{...styles.input, minHeight: '100px'}}
              placeholder="Explain why this request is being rejected..."
              required
            />
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={{...styles.btnPrimary, backgroundColor: '#EF4444'}} disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject Request'}
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

// Send RFQ Modal Component
function SendRFQModal({ request, vendors, onClose, onSuccess }) {
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [responseDeadline, setResponseDeadline] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedVendors.length === 0) {
      setError('Please select at least one vendor');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(
        `${API_BASE_URL}/purchase-requests/${request.id}/send-rfq/`,
        {
          method: 'POST',
          body: JSON.stringify({
            vendor_ids: selectedVendors,
            response_deadline: responseDeadline || null,
            admin_notes: adminNotes
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'RFQ sent successfully!');
        onSuccess();
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
      <div style={{...styles.modal, maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Send RFQ to Vendors</h2>
        <div style={styles.modalSubtitle}>
          Request #{request.id}: {request.item_name} (Qty: {request.quantity})
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '24px'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px'}}>
              Select Vendors to Send RFQ
            </h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px'
            }}>
              {vendors.length === 0 ? (
                <div style={styles.emptyState}>No active vendors available</div>
              ) : (
                vendors.map(vendor => (
                  <label
                    key={vendor.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedVendors.includes(vendor.id) ? '#EFF6FF' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor.id)}
                      onChange={() => handleVendorToggle(vendor.id)}
                      style={{marginRight: '12px', width: '18px', height: '18px'}}
                    />
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '600', color: '#1E293B'}}>
                        {vendor.company_name}
                      </div>
                      <div style={{fontSize: '13px', color: '#6B7280'}}>
                        {vendor.vendor_code} • {vendor.email}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Response Deadline (Optional)</label>
            <input
              type="date"
              value={responseDeadline}
              onChange={(e) => setResponseDeadline(e.target.value)}
              style={styles.input}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              style={{...styles.input, minHeight: '100px'}}
              placeholder="Add any special instructions or notes for the vendors..."
            />
          </div>

          <div style={styles.modalActions}>
            <button 
              type="submit" 
              style={styles.btnPrimary} 
              disabled={loading || selectedVendors.length === 0}
            >
              {loading ? 'Sending...' : `Send RFQ to ${selectedVendors.length} Vendor(s)`}
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



// Helper functions
function getStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'capitalize'
  };

  const colors = {
    pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    approved: { backgroundColor: '#D1FAE5', color: '#065F46' },
    rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    rfq_sent: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    quotation_received: { backgroundColor: '#E0E7FF', color: '#3730A3' }
  };

  return { ...baseStyle, ...(colors[status] || colors.pending) };
}

function getUrgencyBadgeStyle(urgency) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'capitalize'
  };

  const colors = {
    low: { backgroundColor: '#E0E7FF', color: '#3730A3' },
    medium: { backgroundColor: '#FEF3C7', color: '#92400E' },
    high: { backgroundColor: '#FED7AA', color: '#9A3412' },
    urgent: { backgroundColor: '#FEE2E2', color: '#991B1B' }
  };

  return { ...baseStyle, ...(colors[urgency] || colors.medium) };
}

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
function getQuotationStatusBadgeStyle(status) {
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
    submitted: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    under_review: { backgroundColor: '#FEF3C7', color: '#92400E' },
    accepted: { backgroundColor: '#D1FAE5', color: '#065F46' },
    rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' }
  };

  return { ...baseStyle, ...(colors[status] || colors.draft) };
}
// ADD this function with your other helper functions
function getVendorStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'capitalize'
  };

  const colors = {
    pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    approved: { backgroundColor: '#D1FAE5', color: '#065F46' },
    rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    suspended: { backgroundColor: '#F3F4F6', color: '#1F2937' }
  };

  return { ...baseStyle, ...(colors[status] || colors.pending) };
}

function StatCard({ title, value, subtitle, color, icon, onClick }) {
  return (
    <div style={{...styles.statCard, cursor: onClick ? 'pointer' : 'default'}} onClick={onClick}>
      <div style={styles.statIcon}>
        <span style={{fontSize: '32px'}}>{icon}</span>
      </div>
      <div style={styles.statContent}>
        <div style={styles.statLabel}>{title}</div>
        <div style={{...styles.statValue, color}}>{value}</div>
        {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

function ActivityItem({ icon, title, time, color }) {
  return (
    <div style={styles.activityItem}>
      <div style={{...styles.activityIcon, backgroundColor: color + '20'}}>
        <span style={{fontSize: '18px'}}>{icon}</span>
      </div>
      <div style={styles.activityContent}>
        <div style={styles.activityTitle}>{title}</div>
        <div style={styles.activityTime}>{time}</div>
      </div>
    </div>
  );
}

function PendingItem({ title, count, color }) {
  return (
    <div style={styles.pendingItem}>
      <div style={styles.pendingContent}>
        <div style={styles.pendingTitle}>{title}</div>
        <div style={{...styles.pendingBadge, backgroundColor: color}}>
          {count}
        </div>
      </div>
    </div>
  );
}


// Employees View
function EmployeesView({ employees, onEdit, onDelete, onResetPassword, onToggleActive }) {
  return (
    <div style={styles.card}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} style={styles.tableRow}>
                <td style={styles.td}>{employee.username}</td>
                <td style={styles.td}>{employee.first_name} {employee.last_name}</td>
                <td style={styles.td}>{employee.email}</td>
                <td style={styles.td}>{employee.department || 'N/A'}</td>
                <td style={styles.td}>
                  <span style={employee.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {employee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button onClick={() => onEdit(employee)} style={styles.actionBtn} title="Edit">✏️</button>
                    <button onClick={() => onResetPassword(employee.id, employee.username)} style={styles.actionBtn} title="Reset">🔑</button>
                    <button onClick={() => onToggleActive(employee.id, employee.is_active, employee.username)} style={styles.actionBtn} title={employee.is_active ? 'Deactivate' : 'Activate'}>{employee.is_active ? '🚫' : '✅'}</button>
                    <button onClick={() => onDelete(employee.id, employee.username)} style={styles.actionBtn} title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <div style={styles.emptyState}>No employees found</div>}
      </div>
    </div>
  );
}

// Vendors View  
function VendorsView({ vendors, onEdit, onDelete, onToggleActive, onApprove, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const handleReject = (vendor) => {
    setSelectedVendor(vendor);
    setShowRejectModal(true);
  };

  return (
    <>
      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Vendor Code</th>
                <th style={styles.th}>Company Name</th>
                <th style={styles.th}>Contact Person</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} style={styles.tableRow}>
                  <td style={styles.td}>{v.vendor_code}</td>
                  <td style={styles.td}>{v.company_name}</td>
                  <td style={styles.td}>{v.contact_person}</td>
                  <td style={styles.td}>{v.email}</td>
                  <td style={styles.td}>
                    <span style={getVendorStatusBadgeStyle(v.status)}>
                      {v.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      {/* PENDING VENDORS: Show approve/reject buttons */}
                      {v.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => onApprove(v.id)}
                            style={{...styles.actionBtn, color: '#10B981'}} 
                            title="Approve Vendor"
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => handleReject(v)}
                            style={{...styles.actionBtn, color: '#EF4444'}} 
                            title="Reject Vendor"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      
                      {/* APPROVED VENDORS: Show only edit, toggle, delete - NO PASSWORD RESET */}
                      {v.status === 'approved' && (
                        <>
                          
                          
                          {/* REMOVED PASSWORD RESET BUTTON */}
                          
                          <button 
                            onClick={() => onToggleActive(v.id, v.is_active, v.company_name)} 
                            style={styles.actionBtn} 
                            title={v.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {v.is_active ? '🚫' : '✅'}
                          </button>
                          
                          <button 
                            onClick={() => onDelete(v.id, v.company_name)} 
                            style={styles.actionBtn} 
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendors.length === 0 && <div style={styles.emptyState}>No vendors found</div>}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedVendor && (
        <VendorRejectModal
          vendor={selectedVendor}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedVendor(null);
          }}
          onSubmit={(reason) => {
            onReject(selectedVendor.id, reason);
            setShowRejectModal(false);
            setSelectedVendor(null);
          }}
        />
      )}
    </>
  );
}

// ADD this new component
function VendorRejectModal({ vendor, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    await onSubmit(reason);
    setLoading(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Reject Vendor</h2>
        <div style={styles.modalSubtitle}>
          {vendor.company_name} ({vendor.vendor_code})
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{...styles.input, minHeight: '100px'}}
              placeholder="Explain why this vendor is being rejected..."
              required
            />
          </div>
          <div style={styles.modalActions}>
            <button 
              type="submit" 
              style={{...styles.btnPrimary, backgroundColor: '#EF4444'}} 
              disabled={loading}
            >
              {loading ? 'Rejecting...' : 'Reject Vendor'}
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
// Products View
function ProductsView({ products, categories, onEdit, onDelete, onToggleActive }) {
  return (
    <div style={styles.card}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Product Code</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Ref.Price</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={styles.tableRow}>
                <td style={styles.td}>{p.product_code}</td>
                <td style={styles.td}>{p.name}</td>
                <td style={styles.td}>{p.category_name || 'N/A'}</td>
                <td style={styles.td}>
  <span style={{color: '#6B7280', fontSize: '13px'}}>
    ~₹{p.unit_price}
  </span>
  <span style={{
    fontSize: '10px', 
    color: '#9CA3AF', 
    display: 'block',
    fontStyle: 'italic'
  }}>
    ref. only
  </span>
</td>
                <td style={styles.td}>{p.current_stock}</td>
                <td style={styles.td}>
                  <span style={p.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button onClick={() => onEdit(p)} style={styles.actionBtn} title="Edit">✏️</button>
                    <button onClick={() => onToggleActive(p.id, p.is_active, p.name)} style={styles.actionBtn} title={p.is_active ? 'Deactivate' : 'Activate'}>{p.is_active ? '🚫' : '✅'}</button>
                    <button onClick={() => onDelete(p.id, p.name)} style={styles.actionBtn} title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div style={styles.emptyState}>No products found</div>}
      </div>
    </div>
  );
}

// Categories View
function CategoriesView({ categories, onEdit, onDelete }) {
  return (
    <div style={styles.card}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} style={styles.tableRow}>
                <td style={styles.td}>{c.name}</td>
                <td style={styles.td}>{c.description || 'N/A'}</td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button onClick={() => onEdit(c)} style={styles.actionBtn} title="Edit">✏️</button>
                    <button onClick={() => onDelete(c.id, c.name)} style={styles.actionBtn} title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && <div style={styles.emptyState}>No categories found</div>}
      </div>
    </div>
  );
}


function VendorForm({ editData, onClose, onSuccess }) {
  const isEditing = !!editData;
  const [formData, setFormData] = useState(editData || {
    vendor_code: '', 
    company_name: '', 
    contact_person: '', 
    email: '', 
    phone: '', 
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    tax_id: '',
    is_active: true,
    // New fields for user account
    create_user_account: !isEditing,
    username: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-generate username from company name
  useEffect(() => {
    if (!isEditing && formData.company_name && formData.create_user_account) {
      const username = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      setFormData(prev => ({ ...prev, username }));
    }
  }, [formData.company_name, formData.create_user_account, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTempPassword('');
    setLoading(true);

    try {
      const url = isEditing 
        ? `${API_BASE_URL}/vendors/${editData.id}/` 
        : `${API_BASE_URL}/vendors/`;
      
      const res = await apiFetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (!isEditing && data.temporary_password) {
          setTempPassword(data.temporary_password);
          setSuccess(
            `Vendor created successfully!\n\n` +
            `Login Credentials:\n` +
            `Username: ${data.username || formData.username}\n` +
            `Password: ${data.temporary_password}\n\n` +
            `Please share these credentials securely with the vendor.`
          );
        } else {
          setSuccess(isEditing ? 'Vendor updated successfully!' : 'Vendor created successfully!');
          setTimeout(() => onSuccess(), 1500);
        }
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

  const copyCredentials = () => {
    const credentials = `Vendor Login Credentials\nUsername: ${formData.username}\nPassword: ${tempPassword}`;
    navigator.clipboard.writeText(credentials);
    alert('Credentials copied to clipboard!');
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>
          {isEditing ? 'Edit Vendor' : 'Add New Vendor'}
        </h2>
        
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && (
          <div style={styles.successAlert}>
            <div style={{whiteSpace: 'pre-wrap'}}>{success}</div>
            {tempPassword && (
              <div style={{ marginTop: '12px' }}>
                <button 
                  onClick={copyCredentials}
                  style={{
                    ...styles.btnPrimary, 
                    fontSize: '13px', 
                    padding: '8px 16px',
                    backgroundColor: '#10B981'
                  }}
                >
                  📋 Copy Credentials
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* All existing vendor fields */}
            <input 
              type="text" 
              placeholder="Vendor Code *" 
              value={formData.vendor_code} 
              onChange={(e) => setFormData({...formData, vendor_code: e.target.value})} 
              style={styles.formInput} 
              required 
              disabled={isEditing} 
            />
            <input 
              type="text" 
              placeholder="Company Name *" 
              value={formData.company_name} 
              onChange={(e) => setFormData({...formData, company_name: e.target.value})} 
              style={styles.formInput} 
              required 
            />
            <input 
              type="text" 
              placeholder="Contact Person *" 
              value={formData.contact_person} 
              onChange={(e) => setFormData({...formData, contact_person: e.target.value})} 
              style={styles.formInput} 
              required 
            />
            <input 
              type="email" 
              placeholder="Email *" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              style={styles.formInput} 
              required 
            />
            <input 
              type="tel" 
              placeholder="Phone" 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="Address" 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="City" 
              value={formData.city} 
              onChange={(e) => setFormData({...formData, city: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="State" 
              value={formData.state} 
              onChange={(e) => setFormData({...formData, state: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="Postal Code" 
              value={formData.postal_code} 
              onChange={(e) => setFormData({...formData, postal_code: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="Country" 
              value={formData.country} 
              onChange={(e) => setFormData({...formData, country: e.target.value})} 
              style={styles.formInput} 
            />
            <input 
              type="text" 
              placeholder="Tax ID" 
              value={formData.tax_id} 
              onChange={(e) => setFormData({...formData, tax_id: e.target.value})} 
              style={styles.formInput} 
            />
          </div>

          {/* User Account Section - Only for New Vendors */}
          {!isEditing && (
            <div style={{
              padding: '16px',
              backgroundColor: '#F0F9FF',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #BAE6FD'
            }}>
              <div style={{marginBottom: '12px'}}>
                <label style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.create_user_account}
                    onChange={(e) => setFormData({
                      ...formData, 
                      create_user_account: e.target.checked
                    })}
                    style={{width: '18px', height: '18px'}}
                  />
                  <span style={{
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#0369A1'
                  }}>
                    Create vendor portal login account
                  </span>
                </label>
              </div>

              {formData.create_user_account && (
                <div>
                  <label style={styles.label}>
                    Username (auto-generated from company name)
                  </label>
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({
                      ...formData, 
                      username: e.target.value
                    })}
                    style={styles.formInput}
                    placeholder="Username for vendor login"
                  />
                  <p style={{
                    fontSize: '12px', 
                    color: '#6B7280', 
                    marginTop: '4px'
                  }}>
                    💡 A secure temporary password will be generated automatically
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={styles.modalActions}>
            <button 
              type="submit" 
              style={styles.btnPrimary} 
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Vendor' : 'Create Vendor')}
            </button>
            <button 
              type="button" 
              onClick={tempPassword ? onSuccess : onClose} 
              style={styles.btnSecondary}
            >
              {tempPassword ? 'Done' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function RejectQuotationModal({ quotation, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    await onSubmit(reason);
    setLoading(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Reject Quotation</h2>
        <div style={styles.modalSubtitle}>
          Quotation #{quotation.quotation_number} from {quotation.vendor_name}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{...styles.input, minHeight: '100px'}}
              placeholder="Explain why this quotation is being rejected..."
              required
            />
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={{...styles.btnPrimary, backgroundColor: '#EF4444'}} disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject Quotation'}
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

function ProductForm({ categories, editData, onClose, onSuccess }) {
  const isEditing = !!editData;
  const [formData, setFormData] = useState(editData || {
    product_code: '', 
    name: '', 
    description: '', 
    category: '', 
    unit_price: '', 
    current_stock: 0, 
    reorder_level: 0, 
    is_active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const url = isEditing ? `${API_BASE_URL}/products/${editData.id}/` : `${API_BASE_URL}/products/`;
      
      // For new products, don't send product_code - let backend generate it
      const submitData = isEditing ? formData : { ...formData, product_code: '' };
      
      const res = await apiFetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess(`Product ${isEditing ? 'updated' : 'created'} successfully!${!isEditing ? ` Code: ${data.product_code}` : ''}`);
        setTimeout(() => onSuccess(), 1500);
      } else {
        const data = await res.json();
        setError(JSON.stringify(data));
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
        <h2 style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* Product Code - Show as read-only for new products, disabled for editing */}
            {isEditing && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Code</label>
                <input 
                  type="text" 
                  value={formData.product_code}
                  style={{...styles.formInput, backgroundColor: '#F3F4F6', cursor: 'not-allowed'}}
                  disabled
                />
              </div>
            )}
            {!isEditing && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Code</label>
                <input 
                  type="text" 
                  value="Auto-generated"
                  style={{...styles.formInput, backgroundColor: '#F0F9FF', color: '#0369A1', fontStyle: 'italic', cursor: 'not-allowed'}}
                  disabled
                />
                <p style={{fontSize: '12px', color: '#6B7280', marginTop: '4px'}}>
                  💡 Product code will be auto-generated (e.g., PID003, PID004, etc.)
                </p>
              </div>
            )}
            
            <input 
              type="text" 
              placeholder="Name *" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              style={styles.formInput} 
              required 
            />
            
            <select 
              value={formData.category} 
              onChange={(e) => setFormData({...formData, category: e.target.value})} 
              style={styles.formInput} 
              required
            >
              <option value="">Select Category *</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <div style={styles.formGroup}>
  <label style={styles.label}>Reference Price (₹)</label>
  <input 
    type="number" 
    step="0.01" 
    placeholder="e.g. 999.00 (for estimation only)" 
    value={formData.unit_price} 
    onChange={(e) => setFormData({...formData, unit_price: e.target.value})} 
    style={styles.formInput} 
  />
  <p style={{fontSize: '12px', color: '#6B7280', marginTop: '4px'}}>
    💡 This is a reference/catalog price. Actual price will be determined by vendor quotation.
  </p>
</div>
            
            <input 
              type="number" 
              placeholder="Current Stock" 
              value={formData.current_stock} 
              onChange={(e) => setFormData({...formData, current_stock: e.target.value})} 
              style={styles.formInput} 
            />
            
            <input 
              type="number" 
              placeholder="Reorder Level" 
              value={formData.reorder_level} 
              onChange={(e) => setFormData({...formData, reorder_level: e.target.value})} 
              style={styles.formInput} 
            />
          </div>
          
          <textarea 
            placeholder="Description" 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            style={{...styles.formInput, gridColumn: '1 / -1', minHeight: '80px', marginBottom: '16px'}} 
          />
          
          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
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

function CategoryForm({ editData, onClose, onSuccess }) {
  const isEditing = !!editData;
  const [formData, setFormData] = useState(editData || {
    name: '', description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/categories/${editData.id}/` : `${API_BASE_URL}/categories/`;
      const res = await apiFetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess('Category saved successfully!');
        setTimeout(() => onSuccess(), 1500);
      } else {
        const data = await res.json();
        setError(JSON.stringify(data));
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
        <h2 style={styles.modalTitle}>{isEditing ? 'Edit Category' : 'Add New Category'}</h2>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Category Name *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{...styles.formInput, marginBottom: '16px'}} required />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{...styles.formInput, minHeight: '80px', marginBottom: '24px'}} />
          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}</button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
function QuotationsManagementView({ quotations, onAccept, onReject, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const filteredQuotations = filter === 'all' 
    ? quotations 
    : quotations.filter(q => q.status === filter);

  const handleReject = (quotation) => {
    setSelectedQuotation(quotation);
    setShowRejectModal(true);
  };

  const handleViewDetails = (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  return (
    <>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Vendor Quotations ({quotations.length})</h3>
          <div style={styles.filterButtons}>
            <button 
              style={filter === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('all')}
            >
              All ({quotations.length})
            </button>
            <button 
              style={filter === 'submitted' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('submitted')}
            >
              Submitted ({quotations.filter(q => q.status === 'submitted').length})
            </button>
            <button 
              style={filter === 'accepted' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('accepted')}
            >
              Accepted ({quotations.filter(q => q.status === 'accepted').length})
            </button>
            <button 
              style={filter === 'rejected' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('rejected')}
            >
              Rejected ({quotations.filter(q => q.status === 'rejected').length})
            </button>
            <button 
              style={styles.filterBtn}
              onClick={onRefresh}
              title="Refresh data"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Quote #</th>
                <th style={styles.th}>RFQ #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Unit Price</th>
                <th style={styles.th}>Total Amount</th>
                <th style={styles.th}>Valid Until</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map(quote => (
                <tr key={quote.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <span style={{fontWeight: '600', color: '#1E293B'}}>
                      {quote.quotation_number}
                    </span>
                  </td>
                  <td style={styles.td}>{quote.rfq_number}</td>
                  <td style={styles.td}>{quote.vendor_name}</td>
                  <td style={styles.td}>{quote.item_name}</td>
                  <td style={styles.td}>{quote.quantity}</td>
                  <td style={styles.td}>
                    <span style={{fontWeight: '600', color: '#059669'}}>
                      ₹{parseFloat(quote.unit_price || 0).toFixed(2)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{fontWeight: '700', color: '#059669', fontSize: '15px'}}>
                      ₹{parseFloat(quote.total_amount || 0).toFixed(2)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {quote.quotation_valid_until 
                      ? new Date(quote.quotation_valid_until).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td style={styles.td}>
                    <span style={getQuotationStatusBadgeStyle(quote.status)}>
                      {quote.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button 
                        onClick={() => handleViewDetails(quote)}
                        style={{...styles.actionBtn, color: '#3B82F6'}}
                        title="View Details"
                      >
                        👁️
                      </button>
                      {quote.status === 'submitted' && (
                        <>
                          <button 
                            onClick={() => onAccept(quote.id, quote.rfq, true)}
                            style={{...styles.actionBtn, color: '#10B981'}}
                            title="Accept & Create PO"
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => handleReject(quote)}
                            style={{...styles.actionBtn, color: '#EF4444'}}
                            title="Reject"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      {quote.status === 'accepted' && (
                        <span style={{fontSize: '12px', color: '#10B981', fontWeight: '600'}}>
                          ✓ Accepted
                        </span>
                      )}
                      {quote.status === 'rejected' && (
                        <span style={{fontSize: '12px', color: '#EF4444', fontWeight: '600'}}>
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredQuotations.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'all' 
                ? 'No quotations received yet' 
                : `No ${filter} quotations found`}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedQuotation && (
        <RejectQuotationModal
          quotation={selectedQuotation}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedQuotation(null);
          }}
          onSubmit={(reason) => {
            onReject(selectedQuotation.rfq, reason);
            setShowRejectModal(false);
            setSelectedQuotation(null);
          }}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedQuotation && (
        <QuotationDetailsModal
          quotation={selectedQuotation}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedQuotation(null);
          }}
          onAccept={() => {
            setShowDetailsModal(false);
            onAccept(selectedQuotation.id, selectedQuotation.rfq, true);
            setSelectedQuotation(null);
          }}
          onReject={() => {
            setShowDetailsModal(false);
            handleReject(selectedQuotation);
          }}
        />
      )}
    </>
  );
}
function QuotationDetailsModal({ quotation, onClose, onAccept, onReject }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Quotation Details</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px'
        }}>
          <DetailItem label="Quotation Number" value={quotation.quotation_number} />
          <DetailItem label="Status" value={
            <span style={getQuotationStatusBadgeStyle(quotation.status)}>
              {quotation.status}
            </span>
          } />
          <DetailItem label="RFQ Number" value={quotation.rfq_number} />
          <DetailItem label="Vendor" value={quotation.vendor_name} />
          <DetailItem label="Item" value={quotation.item_name} />
          <DetailItem label="Quantity" value={quotation.quantity} />
          <DetailItem label="Unit Price" value={`₹${parseFloat(quotation.unit_price || 0).toFixed(2)}`} />
          <DetailItem label="Estimated Delivery" value={`${quotation.estimated_delivery_days} days`} />
          <DetailItem label="Valid Until" value={
            quotation.quotation_valid_until 
              ? new Date(quotation.quotation_valid_until).toLocaleDateString()
              : 'N/A'
          } />
          <DetailItem label="Submitted Date" value={
            quotation.submitted_date 
              ? new Date(quotation.submitted_date).toLocaleDateString()
              : 'N/A'
          } />
        </div>

        <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px'}}>
          Pricing Breakdown
        </h3>
        <div style={{
          padding: '16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Subtotal:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(quotation.subtotal || 0).toFixed(2)}
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>
              Tax ({quotation.tax_rate}%):
            </span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(quotation.tax_amount || 0).toFixed(2)}
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Shipping Cost:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(quotation.shipping_cost || 0).toFixed(2)}
            </span>
          </div>
          <div style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingTop: '12px', 
            borderTop: '2px solid #0369A1'
          }}>
            <span style={{fontSize: '16px', fontWeight: '700'}}>Total Amount:</span>
            <span style={{fontSize: '18px', fontWeight: '700', color: '#059669'}}>
              ₹{parseFloat(quotation.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {quotation.payment_terms && (
          <div style={{marginBottom: '16px'}}>
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#6B7280'}}>
              Payment Terms
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {quotation.payment_terms}
            </div>
          </div>
        )}

        {quotation.warranty_terms && (
          <div style={{marginBottom: '16px'}}>
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#6B7280'}}>
              Warranty Terms
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {quotation.warranty_terms}
            </div>
          </div>
        )}

        {quotation.additional_notes && (
          <div style={{marginBottom: '24px'}}>
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#6B7280'}}>
              Additional Notes
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#92400E'
            }}>
              {quotation.additional_notes}
            </div>
          </div>
        )}

        <div style={styles.modalActions}>
          {quotation.status === 'submitted' && (
            <>
              <button 
                onClick={onAccept}
                style={{...styles.btnPrimary, backgroundColor: '#10B981'}}
              >
                ✅ Accept & Create PO
              </button>
              <button 
                onClick={onReject}
                style={{...styles.btnPrimary, backgroundColor: '#EF4444'}}
              >
                ❌ Reject
              </button>
            </>
          )}
          <button onClick={onClose} style={styles.btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
// Invoice Management Main View
function InvoicesManagementView({ invoices, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === filter);

  const handleDownloadInvoice = (invoice) => {
    // Download the system-generated PDF
    window.open(`${API_BASE_URL}/invoices/${invoice.id}/download/`, '_blank');
  };

  const handleDownloadVendorFile = (invoice) => {
    // Download the vendor-uploaded file
    if (invoice.invoice_file) {
      window.open(`http://localhost:8000${invoice.invoice_file}`, '_blank');
    } else {
      alert('No vendor file uploaded yet');
    }
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const handleMarkAsPaid = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleApproveInvoice = async (invoiceId) => {
    if (!window.confirm('Approve this invoice?')) return;
    
    try {
      const res = await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      });
      
      if (res.ok) {
        alert('Invoice approved successfully!');
        onRefresh();
      } else {
        alert('Failed to approve invoice');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Invoices ({invoices.length})</h3>
          <div style={styles.filterButtons}>
            <button 
              style={filter === 'all' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('all')}
            >
              All ({invoices.length})
            </button>
            <button 
              style={filter === 'pending' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('pending')}
            >
              Pending ({invoices.filter(i => i.status === 'pending').length})
            </button>
            <button 
              style={filter === 'approved' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('approved')}
            >
              Approved ({invoices.filter(i => i.status === 'approved').length})
            </button>
            <button 
              style={filter === 'paid' ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter('paid')}
            >
              Paid ({invoices.filter(i => i.status === 'paid').length})
            </button>
            <button 
              style={styles.filterBtn}
              onClick={onRefresh}
              title="Refresh"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>PO Number</th>
                <th style={styles.th}>Invoice Date</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>File Status</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => {
                const isOverdue = invoice.status !== 'paid' && new Date(invoice.due_date) < new Date();
                
                return (
                  <tr key={invoice.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <span style={{fontWeight: '600', color: '#1E293B'}}>
                        {invoice.invoice_number}
                      </span>
                    </td>
                    <td style={styles.td}>{invoice.vendor_name || 'N/A'}</td>
                    <td style={styles.td}>
                      {invoice.po_number || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        color: isOverdue ? '#EF4444' : '#374151',
                        fontWeight: isOverdue ? '600' : 'normal'
                      }}>
                        {new Date(invoice.due_date).toLocaleDateString()}
                        {isOverdue && ' ⚠️'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{fontWeight: '700', color: '#059669', fontSize: '15px'}}>
                        ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {invoice.invoice_file ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#D1FAE5',
                          color: '#065F46'
                        }}>
                          ✅ Uploaded
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E'
                        }}>
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={getInvoiceStatusBadgeStyle(
                        isOverdue && invoice.status === 'pending' ? 'overdue' : invoice.status
                      )}>
                        {isOverdue && invoice.status === 'pending' ? 'OVERDUE' : invoice.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button 
                          onClick={() => handleViewDetails(invoice)}
                          style={{...styles.actionBtn, color: '#3B82F6'}}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => handleDownloadInvoice(invoice)}
                          style={{...styles.actionBtn, color: '#8B5CF6'}}
                          title="Download System PDF"
                        >
                          📥
                        </button>
                        {invoice.invoice_file && (
                          <button 
                            onClick={() => handleDownloadVendorFile(invoice)}
                            style={{...styles.actionBtn, color: '#10B981'}}
                            title="Download Vendor File"
                          >
                            📄
                          </button>
                        )}
                        {invoice.status === 'pending' && (
                          <button 
                            onClick={() => handleApproveInvoice(invoice.id)}
                            style={{...styles.actionBtn, color: '#3B82F6'}}
                            title="Approve Invoice"
                          >
                            ✅
                          </button>
                        )}
                        {(invoice.status === 'approved' || invoice.status === 'pending') && (
                          <button 
                            onClick={() => handleMarkAsPaid(invoice)}
                            style={{...styles.actionBtn, color: '#10B981'}}
                            title="Mark as Paid"
                          >
                            💰
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'all' 
                ? 'No invoices found' 
                : `No ${filter} invoices found`}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInvoice(null);
          }}
          onDownloadPDF={handleDownloadInvoice}
          onDownloadVendorFile={handleDownloadVendorFile}
          onMarkAsPaid={handleMarkAsPaid}
          onApprove={handleApproveInvoice}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

// Invoice Details Modal
function InvoiceDetailsModal({ invoice, onClose, onDownloadPDF, onDownloadVendorFile, onMarkAsPaid, onApprove }) {
  const isOverdue = invoice.status !== 'paid' && new Date(invoice.due_date) < new Date();

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth: '900px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Invoice Details</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px'
        }}>
          <DetailItem label="Invoice Number" value={invoice.invoice_number} />
          <DetailItem label="Status" value={
            <span style={getInvoiceStatusBadgeStyle(
              isOverdue && invoice.status === 'pending' ? 'overdue' : invoice.status
            )}>
              {isOverdue && invoice.status === 'pending' ? 'OVERDUE' : invoice.status.toUpperCase()}
            </span>
          } />
          <DetailItem label="Vendor" value={invoice.vendor_name} />
          <DetailItem label="PO Number" value={invoice.po_number || 'N/A'} />
          <DetailItem label="Invoice Date" value={new Date(invoice.invoice_date).toLocaleDateString()} />
          <DetailItem label="Due Date" value={
            <span style={{color: isOverdue ? '#EF4444' : '#1E293B', fontWeight: isOverdue ? '700' : '600'}}>
              {new Date(invoice.due_date).toLocaleDateString()}
              {isOverdue && ' ⚠️ OVERDUE'}
            </span>
          } />
          {invoice.uploaded_by_name && (
            <DetailItem label="Uploaded By" value={invoice.uploaded_by_name} />
          )}
          {invoice.upload_date && (
            <DetailItem label="Upload Date" value={new Date(invoice.upload_date).toLocaleDateString()} />
          )}
        </div>

        <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px'}}>
          Amount Breakdown
        </h3>
        <div style={{
          padding: '16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Subtotal:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(invoice.subtotal || 0).toFixed(2)}
            </span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Tax:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(invoice.tax_amount || 0).toFixed(2)}
            </span>
          </div>
          <div style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingTop: '12px', 
            borderTop: '2px solid #0369A1'
          }}>
            <span style={{fontSize: '16px', fontWeight: '700'}}>Total Amount:</span>
            <span style={{fontSize: '20px', fontWeight: '700', color: '#059669'}}>
              ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          {invoice.paid_amount > 0 && (
            <>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px'}}>
                <span style={{fontSize: '14px', color: '#10B981', fontWeight: '600'}}>Paid Amount:</span>
                <span style={{fontSize: '14px', fontWeight: '600', color: '#10B981'}}>
                  ₹{parseFloat(invoice.paid_amount || 0).toFixed(2)}
                </span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px'}}>
                <span style={{fontSize: '14px', color: '#EF4444', fontWeight: '600'}}>Balance Due:</span>
                <span style={{fontSize: '14px', fontWeight: '600', color: '#EF4444'}}>
                  ₹{(parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0)).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* File Status Section */}
        <div style={{
          padding: '16px',
          backgroundColor: invoice.invoice_file ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid ${invoice.invoice_file ? '#A7F3D0' : '#FDE68A'}`
        }}>
          <h3 style={{
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '12px',
            color: invoice.invoice_file ? '#065F46' : '#92400E'
          }}>
            📎 Invoice Files
          </h3>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{fontSize: '13px', color: '#374151'}}>
                📄 System Generated PDF
              </span>
              <button
                onClick={() => onDownloadPDF(invoice)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#8B5CF6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                📥 Download
              </button>
            </div>

            {invoice.invoice_file ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{fontSize: '13px', color: '#065F46', fontWeight: '500'}}>
                  ✅ Vendor Uploaded File
                </span>
                <button
                  onClick={() => onDownloadVendorFile(invoice)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  📄 Download
                </button>
                <a
                  href={`http://localhost:8000${invoice.invoice_file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#059669',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  View in Browser →
                </a>
              </div>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '13px', color: '#92400E'}}>
                  ⏳ Vendor file not uploaded yet
                </span>
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div style={{marginBottom: '24px'}}>
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#6B7280'}}>
              Notes
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              {invoice.notes}
            </div>
          </div>
        )}

        <div style={styles.modalActions}>
          {invoice.status === 'pending' && (
            <button 
              onClick={() => {
                onApprove(invoice.id);
                onClose();
              }}
              style={{...styles.btnPrimary, backgroundColor: '#3B82F6'}}
            >
              ✅ Approve Invoice
            </button>
          )}
          {(invoice.status === 'approved' || invoice.status === 'pending') && (
            <button 
              onClick={() => {
                onClose();
                onMarkAsPaid(invoice);
              }}
              style={{...styles.btnPrimary, backgroundColor: '#10B981'}}
            >
              💰 Make Payment
            </button>
          )}
          <button onClick={onClose} style={styles.btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Modal
// Add this new Payment Modal component in AdminDashboard.jsx

function PaymentModal({ invoice, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [paymentData, setPaymentData] = useState({
    payment_amount: invoice.total_amount - (invoice.paid_amount || 0),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'razorpay',
    transaction_reference: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Create Razorpay order
      const orderRes = await apiFetch(
        `${API_BASE_URL}/invoices/${invoice.id}/create-razorpay-order/`,
        { method: 'POST' }
      );

      if (!orderRes.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const orderData = await orderRes.json();

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Procurement System',
        description: `Payment for Invoice ${orderData.invoice_number}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await apiFetch(
              `${API_BASE_URL}/invoices/${invoice.id}/verify-razorpay-payment/`,
              {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              }
            );

            if (verifyRes.ok) {
              alert('Payment successful!');
              onSuccess();
            } else {
              const errorData = await verifyRes.json();
              alert('Payment verification failed: ' + (errorData.error || 'Unknown error'));
            }
          } catch (err) {
            alert('Payment verification error: ' + err.message);
          }
        },
        prefill: {
          name: orderData.vendor_name,
          email: invoice.vendor_email || '',
          contact: ''
        },
        theme: {
          color: '#4A90E2'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);

    } catch (err) {
      setError('Error: ' + err.message);
      setLoading(false);
    }
  };

  const handleOfflinePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Generate payment number
      const timestamp = Date.now();
      const paymentNumber = `PAY-${paymentData.payment_method.toUpperCase()}-${timestamp}`;

      // Create payment record
      const paymentRes = await apiFetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        body: JSON.stringify({
          payment_number: paymentNumber,
          invoice: invoice.id,
          vendor: invoice.vendor,
          amount: parseFloat(paymentData.payment_amount),
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          transaction_reference: paymentData.transaction_reference,
          notes: paymentData.notes
        })
      });

      if (!paymentRes.ok) {
        const errorData = await paymentRes.json();
        console.error('Payment creation error details:', errorData);
        throw new Error('Failed to create payment record: ' + JSON.stringify(errorData));
      }

      // Update invoice status
      const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(paymentData.payment_amount);
      const newStatus = newPaidAmount >= parseFloat(invoice.total_amount) ? 'paid' : invoice.status;
      const invoiceRes = await apiFetch(`${API_BASE_URL}/invoices/${invoice.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          paid_amount: newPaidAmount,
          payment_date: paymentData.payment_date
        })
      });

      if (invoiceRes.ok) {
        alert('Payment recorded successfully!');
        onSuccess();
      } else {
        throw new Error('Failed to update invoice');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else {
      handleOfflinePayment(e);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Record Payment</h2>
        <div style={styles.modalSubtitle}>
          Invoice #{invoice.invoice_number} - {invoice.vendor_name}
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <div style={{
          padding: '16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #BAE6FD'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '14px', color: '#6B7280'}}>Total Invoice Amount:</span>
            <span style={{fontSize: '14px', fontWeight: '600'}}>
              ₹{parseFloat(invoice.total_amount || 0).toFixed(2)}
            </span>
          </div>
          {invoice.paid_amount > 0 && (
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
              <span style={{fontSize: '14px', color: '#10B981'}}>Already Paid:</span>
              <span style={{fontSize: '14px', fontWeight: '600', color: '#10B981'}}>
                ₹{parseFloat(invoice.paid_amount || 0).toFixed(2)}
              </span>
            </div>
          )}
          <div style={{
            display: 'flex', 
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '2px solid #0369A1'
          }}>
            <span style={{fontSize: '15px', fontWeight: '700', color: '#EF4444'}}>Balance Due:</span>
            <span style={{fontSize: '16px', fontWeight: '700', color: '#EF4444'}}>
              ₹{(parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{marginBottom: '24px'}}>
          <label style={styles.label}>Select Payment Method *</label>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px'}}>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('razorpay');
                setPaymentData({...paymentData, payment_method: 'razorpay'});
              }}
              style={{
                ...styles.paymentMethodBtn,
                backgroundColor: paymentMethod === 'razorpay' ? '#4A90E2' : 'white',
                color: paymentMethod === 'razorpay' ? 'white' : '#374151',
                border: `2px solid ${paymentMethod === 'razorpay' ? '#4A90E2' : '#E5E7EB'}`
              }}
            >
              <div style={{fontSize: '24px', marginBottom: '8px'}}>💳</div>
              <div style={{fontWeight: '600'}}>Online Payment</div>
              <div style={{fontSize: '12px', marginTop: '4px'}}>Razorpay</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('offline')}
              style={{
                ...styles.paymentMethodBtn,
                backgroundColor: paymentMethod === 'offline' ? '#10B981' : 'white',
                color: paymentMethod === 'offline' ? 'white' : '#374151',
                border: `2px solid ${paymentMethod === 'offline' ? '#10B981' : '#E5E7EB'}`
              }}
            >
              <div style={{fontSize: '24px', marginBottom: '8px'}}>🏦</div>
              <div style={{fontWeight: '600'}}>Offline Payment</div>
              <div style={{fontSize: '12px', marginTop: '4px'}}>Bank/Cash/Check</div>
            </button>
          </div>
        </div>

        {/* Offline Payment Form */}
        {paymentMethod === 'offline' && (
          <form onSubmit={handleOfflinePayment}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Amount * (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.total_amount - (invoice.paid_amount || 0)}
                  value={paymentData.payment_amount}
                  onChange={(e) => setPaymentData({...paymentData, payment_amount: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Date *</label>
                <input
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Offline Payment Method *</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Transaction Reference</label>
                <input
                  type="text"
                  value={paymentData.transaction_reference}
                  onChange={(e) => setPaymentData({...paymentData, transaction_reference: e.target.value})}
                  style={styles.input}
                  placeholder="e.g., Check #, Transaction ID"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Notes</label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                style={{...styles.input, minHeight: '80px'}}
                placeholder="Add any additional notes about this payment..."
              />
            </div>

            <div style={styles.modalActions}>
              <button type="submit" style={{...styles.btnPrimary, backgroundColor: '#10B981'}} disabled={loading}>
                {loading ? 'Recording...' : '💰 Record Offline Payment'}
              </button>
              <button type="button" onClick={onClose} style={styles.btnSecondary}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Razorpay Payment Button */}
        {paymentMethod === 'razorpay' && (
          <div style={styles.modalActions}>
            <button 
              onClick={handleRazorpayPayment} 
              style={{...styles.btnPrimary, backgroundColor: '#4A90E2', fontSize: '16px'}} 
              disabled={loading}
            >
              {loading ? 'Processing...' : `💳 Pay ₹${(parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0)).toFixed(2)} with Razorpay`}
            </button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for invoice status badges
function getInvoiceStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'uppercase'
  };

  const colors = {
    pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    approved: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    paid: { backgroundColor: '#D1FAE5', color: '#065F46' },
    overdue: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    cancelled: { backgroundColor: '#F3F4F6', color: '#1F2937' }
  };

  return { ...baseStyle, ...(colors[status] || colors.pending) };
}

// Payment method button style
const paymentMethodBtn = {
  padding: '20px',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center',
  fontWeight: '500'
};
const additionalStyles = {
  formGroup: {
    marginBottom: '4px',  // Reduced from default
  },
  validationError: {
    color: '#EF4444',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '500'
  }
};

function GoodsReceiptsAdminView({ onRefresh }) {
  const [receipts, setReceipts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [selectedReceipt, setSelectedReceipt] = React.useState(null);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);

  React.useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/goods-receipts/`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data);
      } else {
        console.error('Failed to fetch goods receipts');
        setReceipts([]);
      }
    } catch (err) {
      console.error('Error fetching goods receipts:', err);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = filter === 'all'
    ? receipts
    : receipts.filter(r => r.condition === filter);

  const conditionCounts = {
    good: receipts.filter(r => r.condition === 'good').length,
    damaged: receipts.filter(r => r.condition === 'damaged').length,
    shortage: receipts.filter(r => r.condition === 'shortage').length,
    partial: receipts.filter(r => r.condition === 'partial').length,
  };

  const getConditionBadgeStyle = (condition) => {
    const base = {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      textTransform: 'capitalize',
    };
    const map = {
      good:     { backgroundColor: '#D1FAE5', color: '#065F46' },
      damaged:  { backgroundColor: '#FEE2E2', color: '#991B1B' },
      shortage: { backgroundColor: '#FED7AA', color: '#9A3412' },
      partial:  { backgroundColor: '#FEF3C7', color: '#92400E' },
    };
    return { ...base, ...(map[condition] || map.good) };
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyState}>Loading goods receipts...</div>
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Receipts"
          value={receipts.length}
          color="#4A90E2"
          icon="📥"
        />
        <StatCard
          title="Good Condition"
          value={conditionCounts.good}
          color="#10B981"
          icon="✅"
        />
        <StatCard
          title="Damaged"
          value={conditionCounts.damaged}
          color="#EF4444"
          icon="⚠️"
        />
        <StatCard
          title="Shortage / Partial"
          value={conditionCounts.shortage + conditionCounts.partial}
          color="#F59E0B"
          icon="📦"
        />
      </div>

      {/* Receipts Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={{ ...styles.cardTitle, padding: 0, borderBottom: 'none', margin: 0 }}>
            Goods Receipt Entries ({receipts.length})
          </h3>
          <div style={styles.filterButtons}>
            {[
              { key: 'all',      label: `All (${receipts.length})` },
              { key: 'good',     label: `Good (${conditionCounts.good})` },
              { key: 'damaged',  label: `Damaged (${conditionCounts.damaged})` },
              { key: 'shortage', label: `Shortage (${conditionCounts.shortage})` },
              { key: 'partial',  label: `Partial (${conditionCounts.partial})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                style={filter === key ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
            <button style={styles.filterBtn} onClick={fetchReceipts} title="Refresh">
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Receipt ID</th>
                <th style={styles.th}>PO Number</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Qty Delivered</th>
                <th style={styles.th}>Condition</th>
                <th style={styles.th}>Received By</th>
                <th style={styles.th}>Received At</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(receipt => (
                <tr key={receipt.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <span style={{ fontWeight: '600', color: '#1E293B' }}>
                      #{receipt.id}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: '600', color: '#3B82F6' }}>
                      {receipt.purchase_order_number || `PO #${receipt.purchase_order}`}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {receipt.vendor_name || '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>
                      {receipt.delivered_quantity}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={getConditionBadgeStyle(receipt.condition)}>
                      {receipt.condition}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {receipt.received_by_name || receipt.received_by || '—'}
                  </td>
                  <td style={styles.td}>
                    {receipt.received_at
                      ? new Date(receipt.received_at).toLocaleString()
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      maxWidth: '180px',
                      display: 'inline-block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle',
                      color: receipt.notes ? '#374151' : '#9CA3AF',
                      fontStyle: receipt.notes ? 'normal' : 'italic',
                    }}>
                      {receipt.notes || 'No notes'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => {
                        setSelectedReceipt(receipt);
                        setShowDetailsModal(true);
                      }}
                      style={{ ...styles.actionBtn, color: '#3B82F6' }}
                      title="View Details"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceipts.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'all'
                ? 'No goods receipts recorded yet.'
                : `No receipts with condition "${filter}".`}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedReceipt && (
        <GoodsReceiptDetailModal
          receipt={selectedReceipt}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReceipt(null);
          }}
          getConditionBadgeStyle={getConditionBadgeStyle}
        />
      )}
    </>
  );
}

// ── Details Modal ─────────────────────────────────────────────
function GoodsReceiptDetailModal({ receipt, onClose, getConditionBadgeStyle }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Goods Receipt Details</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '20px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <DetailItem label="Receipt ID"     value={`#${receipt.id}`} />
          <DetailItem
            label="Condition"
            value={<span style={getConditionBadgeStyle(receipt.condition)}>{receipt.condition}</span>}
          />
          <DetailItem
            label="PO Number"
            value={receipt.purchase_order_number || `PO #${receipt.purchase_order}`}
          />
          <DetailItem label="Vendor"          value={receipt.vendor_name || '—'} />
          <DetailItem label="Qty Delivered"   value={receipt.delivered_quantity} />
          <DetailItem
            label="Received By"
            value={receipt.received_by_name || receipt.received_by || '—'}
          />
          <DetailItem
            label="Received At"
            value={receipt.received_at ? new Date(receipt.received_at).toLocaleString() : '—'}
          />
        </div>

        {receipt.notes && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', marginBottom: '8px' }}>
              Notes
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#92400E',
            }}>
              {receipt.notes}
            </div>
          </div>
        )}

        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.btnPrimary}>Close</button>
        </div>
      </div>
    </div>
  );
}


function ReportsAnalyticsView() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  React.useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, vendorRes, poRes, receiptRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/purchase-requests/`),
        apiFetch(`${API_BASE_URL}/vendors/`),
        apiFetch(`${API_BASE_URL}/purchase-orders/`),
        apiFetch(`${API_BASE_URL}/goods-receipts/`),
      ]);

      const requests = reqRes.ok     ? await reqRes.json()     : [];
      const vendors  = vendorRes.ok  ? await vendorRes.json()  : [];
      const orders   = poRes.ok      ? await poRes.json()      : [];
      const receipts = receiptRes.ok ? await receiptRes.json() : [];

      // ── Filter requests to current month ───────────────────
      const now       = new Date();
      const thisMonth = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      };

      const monthRequests = requests.filter(r => thisMonth(r.created_at));

      // ── Purchase Request Stats ──────────────────────────────
      const prStats = {
        total:    monthRequests.length,
        pending:  monthRequests.filter(r => r.status === 'pending').length,
        approved: monthRequests.filter(r => r.status === 'approved').length,
        rejected: monthRequests.filter(r => r.status === 'rejected').length,
        rfqSent:  monthRequests.filter(r => r.status === 'rfq_sent').length,
      };

      const urgencyMap = { low: 0, medium: 0, high: 0, urgent: 0 };
      monthRequests.forEach(r => {
        if (urgencyMap[r.urgency_level] !== undefined) urgencyMap[r.urgency_level]++;
      });
      prStats.urgency = urgencyMap;

      const deptMap = {};
      monthRequests.forEach(r => {
        const dept = r.department || 'Unknown';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      prStats.departments = Object.entries(deptMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // ── Vendor Performance ──────────────────────────────────
      // Map: vendor id → metrics
      const vendorMap = {};
      vendors.forEach(v => {
        vendorMap[v.id] = {
          id: v.id, name: v.company_name, code: v.vendor_code,
          totalPOs: 0, deliveredPOs: 0,
          onTimePOs: 0, latePOs: 0,
          grGood: 0, grDamaged: 0, grShortage: 0, grPartial: 0, grTotal: 0,
        };
      });

      // PO → on-time delivery (using all orders for meaningful data)
      orders.forEach(o => {
        const vid = o.vendor;
        if (!vendorMap[vid]) return;
        vendorMap[vid].totalPOs++;
        if (o.status === 'delivered') {
          vendorMap[vid].deliveredPOs++;
          const actualDate   = o.actual_delivery_date   || null;
          const expectedDate = o.expected_delivery_date || o.delivery_deadline || null;
          if (actualDate && expectedDate) {
            if (new Date(actualDate) <= new Date(expectedDate)) {
              vendorMap[vid].onTimePOs++;
            } else {
              vendorMap[vid].latePOs++;
            }
          }
        }
      });

      // Goods receipts → match to vendor via PO
      const poVendorMap = {};
      orders.forEach(o => { poVendorMap[o.id] = o.vendor; });

      receipts.forEach(r => {
        const vid = poVendorMap[r.purchase_order];
        if (!vendorMap[vid]) return;
        vendorMap[vid].grTotal++;
        if (r.condition === 'good')     vendorMap[vid].grGood++;
        if (r.condition === 'damaged')  vendorMap[vid].grDamaged++;
        if (r.condition === 'shortage') vendorMap[vid].grShortage++;
        if (r.condition === 'partial')  vendorMap[vid].grPartial++;
      });

      // Compute derived rates
      const vendorPerf = Object.values(vendorMap)
        .filter(v => v.totalPOs > 0 || v.grTotal > 0)
        .map(v => {
          const deliveredWithDates = v.onTimePOs + v.latePOs;
          const onTimeRate = deliveredWithDates > 0
            ? Math.round((v.onTimePOs / deliveredWithDates) * 100) : null;
          const grQualityRate = v.grTotal > 0
            ? Math.round((v.grGood / v.grTotal) * 100) : null;
          return { ...v, onTimeRate, grQualityRate };
        })
        .sort((a, b) => b.totalPOs - a.totalPOs)
        .slice(0, 8);

      const activeVendors  = vendors.filter(v => v.is_active).length;
      const pendingVendors = vendors.filter(v => v.status === 'pending').length;
      const totalReceipts  = receipts.length;
      const goodReceipts   = receipts.filter(r => r.condition === 'good').length;

      setData({ prStats, vendorPerf, activeVendors, pendingVendors, totalReceipts, goodReceipts });
    } catch (err) {
      console.error('Report fetch error:', err);
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Bar chart component ────────────────────────────────────
  const BarChart = ({ items, color, maxValue }) => {
    const max = maxValue || Math.max(...items.map(i => i.value), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>
                {item.value}{item.suffix || ''}
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${max > 0 ? (item.value / max) * 100 : 0}%`,
                backgroundColor: color,
                borderRadius: '4px',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── SVG status ring ────────────────────────────────────────
  const StatusRing = ({ percent, color, label, count }) => {
    const radius = 28, circ = 2 * Math.PI * radius;
    const dash = (percent / 100) * circ;
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="8" />
          <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 36 36)" />
          <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1E293B">{count}</text>
        </svg>
        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', fontWeight: '500' }}>{label}</div>
      </div>
    );
  };

  // ── Condition pill ─────────────────────────────────────────
  const ConditionPill = ({ count, color, bg, label }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 10px', backgroundColor: bg, borderRadius: '8px', minWidth: '52px',
    }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color }}>{count}</span>
      <span style={{ fontSize: '11px', color, fontWeight: '500', marginTop: '2px' }}>{label}</span>
    </div>
  );

  if (loading) return (
    <div style={{ ...styles.card, padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
      Loading reports...
    </div>
  );

  if (error) return (
    <div style={{ ...styles.card, padding: '48px', textAlign: 'center', color: '#EF4444' }}>{error}</div>
  );

  const { prStats, vendorPerf, activeVendors, pendingVendors, totalReceipts, goodReceipts } = data;
  const prTotal = prStats.total || 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
            📊 Reports & Analytics
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>
            Purchase requests filtered to <strong>{monthLabel}</strong> · Vendor performance uses all-time data
          </p>
        </div>
        <button onClick={fetchReportData} style={{ ...styles.filterBtn, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
          🔄 Refresh
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — PURCHASE REQUEST STATS
      ══════════════════════════════════════════════════════ */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Purchase Request Stats — {monthLabel}
      </div>

      <div style={{ ...styles.statsGrid, marginBottom: '24px' }}>
        {[
          { label: 'Total Requests', value: prStats.total,    color: '#4A90E2', icon: '📋' },
          { label: 'Pending',        value: prStats.pending,  color: '#F59E0B', icon: '⏳' },
          { label: 'Approved',       value: prStats.approved, color: '#10B981', icon: '✅' },
          { label: 'Rejected',       value: prStats.rejected, color: '#EF4444', icon: '❌' },
        ].map(({ label, value, color, icon }) => (
          <StatCard key={label} title={label} value={value} color={color} icon={icon} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Request Status Breakdown</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '24px' }}>
            <StatusRing percent={Math.round((prStats.pending  / prTotal) * 100)} color="#F59E0B" label="Pending"  count={prStats.pending} />
            <StatusRing percent={Math.round((prStats.approved / prTotal) * 100)} color="#10B981" label="Approved" count={prStats.approved} />
            <StatusRing percent={Math.round((prStats.rejected / prTotal) * 100)} color="#EF4444" label="Rejected" count={prStats.rejected} />
            <StatusRing percent={Math.round((prStats.rfqSent  / prTotal) * 100)} color="#3B82F6" label="RFQ Sent" count={prStats.rfqSent} />
          </div>
          {prStats.total === 0 && <div style={styles.emptyState}>No requests this month</div>}
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Requests by Urgency</h3>
          <div style={{ padding: '20px 24px' }}>
            {prStats.total === 0
              ? <div style={styles.emptyState}>No requests this month</div>
              : <BarChart items={[
                  { label: '🔴 Urgent', value: prStats.urgency.urgent },
                  { label: '🟠 High',   value: prStats.urgency.high   },
                  { label: '🟡 Medium', value: prStats.urgency.medium },
                  { label: '🔵 Low',    value: prStats.urgency.low    },
                ]} color="#4A90E2" />
            }
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h3 style={styles.cardTitle}>Top Requesting Departments</h3>
          <div style={{ padding: '20px 24px' }}>
            {prStats.departments.length === 0
              ? <div style={styles.emptyState}>No department data this month</div>
              : <BarChart items={prStats.departments.map(([dept, count]) => ({ label: dept, value: count }))} color="#8B5CF6" />
            }
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — VENDOR PERFORMANCE
      ══════════════════════════════════════════════════════ */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Vendor Performance
      </div>

      <div style={{ ...styles.statsGrid, marginBottom: '24px' }}>
        {[
          { label: 'Active Vendors',       value: activeVendors,  color: '#10B981', icon: '🏢' },
          { label: 'Pending Approval',     value: pendingVendors, color: '#F59E0B', icon: '⏳' },
          { label: 'Total Goods Receipts', value: totalReceipts,  color: '#4A90E2', icon: '📦' },
          { label: 'Good Condition',       value: goodReceipts,   color: '#059669', icon: '✅' },
        ].map(({ label, value, color, icon }) => (
          <StatCard key={label} title={label} value={value} color={color} icon={icon} />
        ))}
      </div>

      {/* Vendor performance table */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Vendor Performance — On-Time Delivery & Goods Receipt Quality</h3>
        {vendorPerf.length === 0 ? (
          <div style={{ ...styles.emptyState, padding: '48px' }}>
            No vendor data yet. Appears once Purchase Orders are delivered and Goods Receipts are recorded.
          </div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Vendor</th>
                    <th style={styles.th}>Total POs</th>
                    <th style={styles.th}>Delivered</th>
                    <th style={styles.th}>On-Time Delivery</th>
                    <th style={styles.th}>Goods Receipt Conditions</th>
                    <th style={styles.th}>Quality Rate</th>
                    <th style={styles.th}>Overall Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPerf.map((v, idx) => {
                    const scores  = [v.onTimeRate, v.grQualityRate].filter(s => s !== null);
                    const overall = scores.length > 0
                      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                    const stars   = overall === null ? 0
                      : overall >= 80 ? 5 : overall >= 60 ? 4 : overall >= 40 ? 3 : overall >= 20 ? 2 : 1;

                    return (
                      <tr key={idx} style={styles.tableRow}>
                        {/* Vendor */}
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600', color: '#1E293B' }}>{v.name}</div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{v.code}</div>
                        </td>

                        {/* Total POs */}
                        <td style={styles.td}>
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>{v.totalPOs}</span>
                        </td>

                        {/* Delivered */}
                        <td style={styles.td}>
                          <span style={{ fontWeight: '600', color: '#059669' }}>{v.deliveredPOs}</span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '4px' }}>
                            / {v.totalPOs}
                          </span>
                        </td>

                        {/* On-time rate */}
                        <td style={styles.td}>
                          {v.onTimeRate !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ height: '8px', width: '80px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${v.onTimeRate}%`,
                                  backgroundColor: v.onTimeRate >= 75 ? '#10B981' : v.onTimeRate >= 50 ? '#F59E0B' : '#EF4444',
                                  borderRadius: '4px',
                                }} />
                              </div>
                              <span style={{
                                fontSize: '13px', fontWeight: '700',
                                color: v.onTimeRate >= 75 ? '#059669' : v.onTimeRate >= 50 ? '#92400E' : '#991B1B',
                              }}>
                                {v.onTimeRate}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                              No delivery dates set
                            </span>
                          )}
                        </td>

                        {/* Condition pills */}
                        <td style={styles.td}>
                          {v.grTotal > 0 ? (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {v.grGood     > 0 && <ConditionPill count={v.grGood}     color="#065F46" bg="#D1FAE5" label="Good"     />}
                              {v.grDamaged  > 0 && <ConditionPill count={v.grDamaged}  color="#991B1B" bg="#FEE2E2" label="Damaged"  />}
                              {v.grShortage > 0 && <ConditionPill count={v.grShortage} color="#9A3412" bg="#FED7AA" label="Shortage" />}
                              {v.grPartial  > 0 && <ConditionPill count={v.grPartial}  color="#92400E" bg="#FEF3C7" label="Partial"  />}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>No receipts</span>
                          )}
                        </td>

                        {/* Quality rate */}
                        <td style={styles.td}>
                          {v.grQualityRate !== null ? (
                            <span style={{
                              padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                              backgroundColor: v.grQualityRate >= 75 ? '#D1FAE5' : v.grQualityRate >= 50 ? '#FEF3C7' : '#FEE2E2',
                              color:           v.grQualityRate >= 75 ? '#065F46' : v.grQualityRate >= 50 ? '#92400E' : '#991B1B',
                            }}>
                              {v.grQualityRate}%
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>

                        {/* Star rating */}
                        <td style={styles.td}>
                          {overall !== null ? (
                            <div>
                              <div style={{ fontSize: '15px', letterSpacing: '1px' }}>
                                <span style={{ color: stars >= 4 ? '#10B981' : stars >= 3 ? '#F59E0B' : '#EF4444' }}>
                                  {'★'.repeat(stars)}
                                </span>
                                <span style={{ color: '#E5E7EB' }}>{'★'.repeat(5 - stars)}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{overall}% avg</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #F3F4F6', backgroundColor: '#F9FAFB', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>⭐ Rating = avg of on-time delivery % + goods quality %</span>
              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>🟢 ≥75% Good</span>
              <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600' }}>🟡 50–74% Average</span>
              <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>🔴 &lt;50% Needs Improvement</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// Styles
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    backgroundColor: '#1E293B',
    color: 'white',
    transition: 'width 0.3s ease',
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e3ebf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '600',
  },
  nav: {
    padding: '20px 0',
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '15px',
    textAlign: 'left',
  },
  navItemActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    color: '#f0f1f3',
    borderLeft: '3px solid #e6e9ed',
  },
  navIcon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
  },
  navLabel: {
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    transition: 'margin-left 0.3s ease',
  },
  topBar: {
    backgroundColor: 'white',
    padding: '20px 32px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: {},
  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0,
  },
  topBarRight: {
    display: 'flex',
    gap: '12px',
  },
  addButton: {
    padding: '10px 24px',
    backgroundColor: '#b1c4d6',
    color: 'black',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  logoutButton: {
    padding: '10px 24px',
    backgroundColor: '#1c0101',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  contentArea: {
    padding: '32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s',
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  statSubtitle: {
    fontSize: '14px',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    padding: '20px 24px',
    margin: 0,
    borderBottom: '1px solid #E5E7EB',
  },
  activityList: {
    padding: '16px 24px',
  },
  activityItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1E293B',
  },
  activityTime: {
    fontSize: '13px',
    color: '#9CA3AF',
    marginTop: '2px',
  },
  pendingList: {
    padding: '16px 24px',
  },
  pendingItem: {
    padding: '12px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  pendingContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1E293B',
  },
  pendingBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '8px 16px',
    border: '1px solid #E5E7EB',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    padding: '8px 16px',
    border: '1px solid #0a2145',
    backgroundColor: '#dce6f4',
    color: '#1b345c',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  tableWrapper: {
    padding: '0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: '#F9FAFB',
  },
  th: {
    padding: '16px 24px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #E5E7EB',
  },
  tableRow: {
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px 24px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: '14px',
    color: '#374151',
  },
  badgeActive: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    display: 'inline-block',
  },
  badgeInactive: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    display: 'inline-block',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: '15px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '24px',
  },
  errorAlert: {
    padding: '12px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  successAlert: {
    padding: '12px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  formInput: {
    padding: '12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    padding: '12px 24px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px 24px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#6B7280',
  },
};