import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api';

const ValidationRules = {
  name: {
    pattern: /^[a-zA-Z\s]*$/,
    message: 'Name can only contain letters and spaces',
    test: (value) => /^[a-zA-Z\s]+$/.test(value) && value.trim().length > 0
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
    test: (value) => {
      const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(value);
    }
  },
  phone: {
    pattern: /^[0-9+\-\s()]*$/,
    message: 'Phone can only contain numbers, +, -, spaces, and parentheses',
    test: (value) => {
      if (value.trim() === '') return true;
      const cleanPhone = value.replace(/[\s\-()]/g, '');
      return /^\+?[0-9]{7,15}$/.test(cleanPhone);
    }
  },
  department: {
    pattern: /^[a-zA-Z0-9\s&-]*$/,
    message: 'Department can only contain letters, numbers, spaces, & and -',
    test: (value) => {
      if (value.trim() === '') return true;
      return /^[a-zA-Z0-9\s&-]+$/.test(value);
    }
  },
  position: {
    pattern: /^[a-zA-Z0-9\s&-]*$/,
    message: 'Position can only contain letters, numbers, spaces, & and -',
    test: (value) => {
      if (value.trim() === '') return true;
      return /^[a-zA-Z0-9\s&-]+$/.test(value);
    }
  },
  password: {
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
    test: (value) => {
      if (value.length < 8) return false;
      return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
    }
  },
  quantity: {
    message: 'Quantity must be a positive number',
    test: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0;
    }
  },
  username: {
    pattern: /^[a-zA-Z0-9_-]*$/,
    message: 'Username can only contain letters, numbers, underscore, and hyphen',
    test: (value) => /^[a-zA-Z0-9_-]{3,}$/.test(value)
  }
};

const validateField = (fieldName, value) => {
  if (!ValidationRules[fieldName]) {
    return { isValid: true, message: '' };
  }
  const rule = ValidationRules[fieldName];
  const isValid = rule.test(value);
  return { isValid, message: isValid ? '' : rule.message };
};

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
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.method && options.method !== 'GET') {
    headers['X-CSRFToken'] = csrfToken;
  }
  return fetch(url, { credentials: 'include', ...options, headers });
}

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [myRequests, setMyRequests] = useState([]);
  const [assignedPOs, setAssignedPOs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGoodsReceiptForm, setShowGoodsReceiptForm] = useState(false);
  const [showDeliveryStatusForm, setShowDeliveryStatusForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const requestsRes = await apiFetch(`${API_BASE_URL}/purchase-requests/`);
      if (requestsRes.ok) {
        setMyRequests(await requestsRes.json());
      } else {
        setMyRequests([]);
      }
      const posRes = await apiFetch(`${API_BASE_URL}/purchase-orders/assigned/`);
      if (posRes.ok) {
        setAssignedPOs(await posRes.json());
      } else {
        setAssignedPOs([]);
      }
      const productsRes = await apiFetch(`${API_BASE_URL}/products/`);
      if (productsRes.ok) setProducts(await productsRes.json());
      const vendorsRes = await apiFetch(`${API_BASE_URL}/vendors/`);
      if (vendorsRes.ok) setVendors(await vendorsRes.json());
      const notifRes = await apiFetch(`${API_BASE_URL}/notifications/`);
      if (notifRes.ok) setNotifications(await notifRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
      setMyRequests([]);
      setAssignedPOs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await fetch(`${API_BASE_URL}/auth/csrf/`, { credentials: 'include' });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    };
    if (user) {
      fetchCsrfToken().then(() => { fetchDashboardData(); });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-requests' && user) {
      fetchDashboardData();
    }
  }, [activeTab, user]);

  const handleLogout = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout/`, { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleOpenGoodsReceipt = (po) => { setSelectedPO(po); setShowGoodsReceiptForm(true); };
  const handleOpenDeliveryStatus = (po) => { setSelectedPO(po); setShowDeliveryStatusForm(true); };
  const handleProfileUpdate = async (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      try {
        await apiFetch(`${API_BASE_URL}/notifications/mark-all-read/`, { method: 'POST' });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  };

  if (!user || (loading && activeTab === 'dashboard')) {
    return <div style={styles.loading}>Loading...</div>;
  }

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'create-request', icon: '➕', label: 'Create Purchase Request' },
    { id: 'my-requests', icon: '📋', label: 'Requests' },
    { id: 'assigned-pos', icon: '📦', label: 'Assigned Purchase Orders' },
    { id: 'goods-receipt', icon: '📥', label: 'Goods Receipt Entry' },
    { id: 'delivery-status', icon: '🚚', label: 'Delivery Status Update' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>👨‍💼</div>
            <span style={styles.logoText}>Employee</span>
          </div>
        </div>
        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ ...styles.navItem, ...(activeTab === item.id ? styles.navItemActive : {}) }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.topBar}>
          <h1 style={styles.pageTitle}>
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'create-request' && 'Create Purchase Request'}
            {activeTab === 'my-requests' && 'Requests'}
            {activeTab === 'assigned-pos' && 'Assigned Purchase Orders'}
            {activeTab === 'goods-receipt' && 'Goods Receipt Entry'}
            {activeTab === 'delivery-status' && 'Delivery Status Update'}
            {activeTab === 'profile' && 'My Profile'}
          </h1>
          <div style={styles.topBarRight}>
            <div style={styles.notificationContainer}>
              <button style={styles.notificationBtn} onClick={handleNotificationClick}>
                🔔
                {unreadNotifications > 0 && (
                  <span style={styles.notificationBadge}>{unreadNotifications}</span>
                )}
              </button>
              {showNotifications && (
                <NotificationsDropdown
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.username}</span>
            </div>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        </div>

        <div style={styles.contentArea}>
          {activeTab === 'dashboard' && (
            <DashboardOverview
              myRequests={myRequests}
              assignedPOs={assignedPOs}
              onCreateRequest={() => setActiveTab('create-request')}
              onViewRequests={() => setActiveTab('my-requests')}
              onViewPOs={() => setActiveTab('assigned-pos')}
            />
          )}
          {activeTab === 'create-request' && (
            <CreateRequestView
              products={products}
              user={user}
              onSuccess={() => { fetchDashboardData(); setActiveTab('my-requests'); }}
            />
          )}
          {activeTab === 'my-requests' && (
            <MyRequestsView requests={myRequests} onRefresh={fetchDashboardData} loading={loading} />
          )}
          {activeTab === 'assigned-pos' && (
            <AssignedPOsView
              pos={assignedPOs}
              onGoodsReceipt={handleOpenGoodsReceipt}
              onDeliveryStatus={handleOpenDeliveryStatus}
            />
          )}
          {activeTab === 'goods-receipt' && (
            <GoodsReceiptView pos={assignedPOs} onSubmit={fetchDashboardData} />
          )}
          {activeTab === 'delivery-status' && <DeliveryStatusView />}
          {activeTab === 'profile' && (
            <ProfileView user={user} onUpdate={handleProfileUpdate} />
          )}
        </div>
      </div>

      {showGoodsReceiptForm && selectedPO && (
        <GoodsReceiptModal
          po={selectedPO}
          onClose={() => { setShowGoodsReceiptForm(false); setSelectedPO(null); }}
          onSuccess={() => { setShowGoodsReceiptForm(false); setSelectedPO(null); fetchDashboardData(); }}
        />
      )}
      {showDeliveryStatusForm && selectedPO && (
        <DeliveryStatusModal
          po={selectedPO}
          onClose={() => { setShowDeliveryStatusForm(false); setSelectedPO(null); }}
          onSuccess={() => { setShowDeliveryStatusForm(false); setSelectedPO(null); fetchDashboardData(); }}
        />
      )}
    </div>
  );
}

// ============================================
// PROFILE VIEW
// ============================================

function ProfileView({ user, onUpdate }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [fullUser, setFullUser] = useState(user);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/employees/${user.id}/`);
        if (res.ok) {
          const data = await res.json();
          setFullUser({ ...user, ...data });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchFullProfile();
  }, [user.id]);

  if (loadingProfile) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>Loading profile...</div>;
  }

  return (
    <div>
      <div style={styles.profileTabsContainer}>
        <button
          style={activeSection === 'profile' ? styles.profileTabActive : styles.profileTab}
          onClick={() => setActiveSection('profile')}
        >📝 Edit Profile</button>
        <button
          style={activeSection === 'password' ? styles.profileTabActive : styles.profileTab}
          onClick={() => setActiveSection('password')}
        >🔒 Change Password</button>
      </div>
      {activeSection === 'profile' && <EditProfileForm user={fullUser} onUpdate={onUpdate} />}
      {activeSection === 'password' && <ChangePasswordForm user={fullUser} />}
    </div>
  );
}

function EditProfileForm({ user, onUpdate }) {
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    department: user.department || '',
    position: user.position || '',
    phone: user.phone || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    else { const v = validateField('name', formData.first_name); if (!v.isValid) newErrors.first_name = v.message; }
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    else { const v = validateField('name', formData.last_name); if (!v.isValid) newErrors.last_name = v.message; }
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else { const v = validateField('email', formData.email); if (!v.isValid) newErrors.email = v.message; }
    if (formData.department.trim()) { const v = validateField('department', formData.department); if (!v.isValid) newErrors.department = v.message; }
    if (formData.position.trim()) { const v = validateField('position', formData.position); if (!v.isValid) newErrors.position = v.message; }
    if (formData.phone.trim()) { const v = validateField('phone', formData.phone); if (!v.isValid) newErrors.phone = v.message; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!validateForm()) { setError('Please fix the errors below'); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/employees/${user.id}/`, { method: 'PATCH', body: JSON.stringify(formData) });
      if (res.ok) {
        const updatedUser = await res.json();
        setSuccess('Profile updated successfully!');
        onUpdate({ ...user, ...updatedUser });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await res.json();
        setError(JSON.stringify(errorData));
      }
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Edit Profile Information</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}
        <div style={styles.profileFormGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input type="text" value={user.username} style={{ ...styles.input, backgroundColor: '#F3F4F6', cursor: 'not-allowed' }} disabled />
            <span style={styles.helpText}>Username cannot be changed</span>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address *</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }} placeholder="example@email.com" required />
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name *</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ ...styles.input, ...(errors.first_name ? styles.inputError : {}) }} placeholder="Enter first name" required />
            {errors.first_name && <span style={styles.errorText}>{errors.first_name}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name *</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ ...styles.input, ...(errors.last_name ? styles.inputError : {}) }} placeholder="Enter last name" required />
            {errors.last_name && <span style={styles.errorText}>{errors.last_name}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Department</label>
            <input type="text" name="department" value={formData.department} onChange={handleInputChange} style={{ ...styles.input, ...(errors.department ? styles.inputError : {}) }} placeholder={user.department || 'e.g., IT, HR, Finance'} />
            {errors.department && <span style={styles.errorText}>{errors.department}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Position</label>
            <input type="text" name="position" value={formData.position} onChange={handleInputChange} style={{ ...styles.input, ...(errors.position ? styles.inputError : {}) }} placeholder={user.position || 'e.g., Software Engineer, Manager'} />
            {errors.position && <span style={styles.errorText}>{errors.position}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{ ...styles.input, ...(errors.phone ? styles.inputError : {}) }} placeholder="+1 (555) 123-4567" />
            {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
          </div>
        </div>
        <div style={styles.formActions}>
          <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Updating...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
}

function ChangePasswordForm({ user }) {
  const [formData, setFormData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  const checkPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 'strong';
    return 'medium';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'new_password') setPasswordStrength(checkPasswordStrength(value));
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validatePasswords = () => {
    const newErrors = {};
    if (!formData.current_password) newErrors.current_password = 'Current password is required';
    if (!formData.new_password) newErrors.new_password = 'New password is required';
    else if (formData.new_password.length < 8) newErrors.new_password = 'Password must be at least 8 characters long';
    else { const v = validateField('password', formData.new_password); if (!v.isValid) newErrors.new_password = v.message; }
    if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password';
    else if (formData.new_password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!validatePasswords()) { setError('Please fix the errors below'); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/employees/${user.id}/change-password/`, {
        method: 'POST',
        body: JSON.stringify({ current_password: formData.current_password, new_password: formData.new_password })
      });
      if (res.ok) {
        setSuccess('Password changed successfully!');
        setFormData({ current_password: '', new_password: '', confirm_password: '' });
        setPasswordStrength('');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthStyle = () => {
    const base = { height: '4px', borderRadius: '2px', transition: 'all 0.3s', marginTop: '8px' };
    switch (passwordStrength) {
      case 'weak': return { ...base, width: '33%', backgroundColor: '#EF4444' };
      case 'medium': return { ...base, width: '66%', backgroundColor: '#F59E0B' };
      case 'strong': return { ...base, width: '100%', backgroundColor: '#10B981' };
      default: return { ...base, width: '0%', backgroundColor: '#E5E7EB' };
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Change Password</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}
        <div style={styles.passwordFormContainer}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Current Password *</label>
            <input type="password" name="current_password" value={formData.current_password} onChange={handleInputChange} style={{ ...styles.input, ...(errors.current_password ? styles.inputError : {}) }} placeholder="Enter your current password" required />
            {errors.current_password && <span style={styles.errorText}>{errors.current_password}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password *</label>
            <input type="password" name="new_password" value={formData.new_password} onChange={handleInputChange} style={{ ...styles.input, ...(errors.new_password ? styles.inputError : {}) }} placeholder="Enter your new password" minLength={8} required />
            {errors.new_password && <span style={styles.errorText}>{errors.new_password}</span>}
            {formData.new_password && (
              <div>
                <div style={getPasswordStrengthStyle()}></div>
                <span style={{ ...styles.helpText, textTransform: 'capitalize', color: passwordStrength === 'strong' ? '#10B981' : passwordStrength === 'medium' ? '#F59E0B' : '#EF4444' }}>
                  {passwordStrength && `Password strength: ${passwordStrength}`}
                </span>
              </div>
            )}
            <span style={styles.helpText}>Password must be at least 8 characters with uppercase, lowercase, number, and special character</span>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm New Password *</label>
            <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleInputChange} style={{ ...styles.input, ...(errors.confirm_password ? styles.inputError : {}) }} placeholder="Confirm your new password" required />
            {errors.confirm_password && <span style={styles.errorText}>{errors.confirm_password}</span>}
          </div>
        </div>
        <div style={styles.passwordRequirements}>
          <h4 style={styles.requirementsTitle}>Password Requirements:</h4>
          <ul style={styles.requirementsList}>
            <li style={formData.new_password.length >= 8 ? styles.requirementMet : styles.requirement}>At least 8 characters long</li>
            <li style={/[A-Z]/.test(formData.new_password) ? styles.requirementMet : styles.requirement}>Contains uppercase letter</li>
            <li style={/[a-z]/.test(formData.new_password) ? styles.requirementMet : styles.requirement}>Contains lowercase letter</li>
            <li style={/[0-9]/.test(formData.new_password) ? styles.requirementMet : styles.requirement}>Contains number</li>
            <li style={/[^A-Za-z0-9]/.test(formData.new_password) ? styles.requirementMet : styles.requirement}>Contains special character</li>
          </ul>
        </div>
        <div style={styles.formActions}>
          <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Changing Password...' : 'Change Password'}</button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// CREATE REQUEST VIEW
// ============================================

function CreateRequestView({ products, user, onSuccess }) {
  const [useCustomItem, setUseCustomItem] = React.useState(false);
  const [formData, setFormData] = React.useState({
    item_name: '', product: null, estimated_unit_price: '',
    quantity: '', department: user?.department || '',
    urgency_level: 'medium', justification: '',
  });
  const [errors, setErrors] = React.useState({});
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const activeProducts = (products || []).filter(p => p.is_active);

  const handleProductSelect = (e) => {
    const val = e.target.value;
    if (val === '__custom__') { setUseCustomItem(true); setFormData({ ...formData, product: null, item_name: '', estimated_unit_price: '' }); return; }
    if (val === '') { setFormData({ ...formData, product: null, item_name: '', estimated_unit_price: '' }); return; }
    const selected = activeProducts.find(p => p.id === parseInt(val));
    if (selected) setFormData({ ...formData, product: selected.id, item_name: selected.name, estimated_unit_price: selected.unit_price });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.item_name.trim()) newErrors.item_name = 'Item name is required';
    if (!formData.quantity) newErrors.quantity = 'Quantity is required';
    else if (parseInt(formData.quantity) < 1) newErrors.quantity = 'Quantity must be at least 1';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) { setError('Please fix the errors below'); return; }
    setLoading(true);
    try {
      const requestData = {
        item_name: formData.item_name, product: formData.product || null,
        quantity: parseInt(formData.quantity), department: formData.department,
        urgency_level: formData.urgency_level, justification: formData.justification || '',
        employee: user.id,
      };
      const res = await apiFetch(`${API_BASE_URL}/purchase-requests/`, { method: 'POST', body: JSON.stringify(requestData) });
      if (res.ok) {
        alert('Purchase request submitted successfully!');
        onSuccess();
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

  const selectedProduct = formData.product ? activeProducts.find(p => p.id === formData.product) : null;

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Create New Purchase Request</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        <div style={styles.formGrid}>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Item *</label>
            {!useCustomItem ? (
              <>
                <select value={formData.product || ''} onChange={handleProductSelect} style={{ ...styles.input, ...(errors.item_name ? styles.inputError : {}) }} required={!useCustomItem}>
                  <option value="">— Select a product from catalog —</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.category_name ? ` [${p.category_name}]` : ''}{' — ~₹'}{p.unit_price} ref.{' (Stock: '}{p.current_stock}{p.current_stock <= p.reorder_level ? ' ⚠️ Low' : ''}{')'}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Item not in list — enter manually</option>
                </select>
                {selectedProduct && (
                  <div style={{ marginTop: '10px', padding: '12px 16px', backgroundColor: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
                    <span><strong style={{ color: '#374151' }}>Unit Price: </strong><span style={{ color: '#059669', fontWeight: '700' }}>₹{selectedProduct.unit_price}</span></span>
                    <span><strong style={{ color: '#374151' }}>Current Stock: </strong>
                      <span style={{ fontWeight: '700', color: selectedProduct.current_stock === 0 ? '#991B1B' : selectedProduct.current_stock <= selectedProduct.reorder_level ? '#92400E' : '#065F46' }}>
                        {selectedProduct.current_stock === 0 ? '🚫 Out of Stock' : selectedProduct.current_stock <= selectedProduct.reorder_level ? `⚠️ ${selectedProduct.current_stock} (Low)` : `✅ ${selectedProduct.current_stock}`}
                      </span>
                    </span>
                    {selectedProduct.category_name && <span><strong style={{ color: '#374151' }}>Category: </strong>{selectedProduct.category_name}</span>}
                  </div>
                )}
              </>
            ) : (
              <div>
                <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} style={{ ...styles.input, ...(errors.item_name ? styles.inputError : {}) }} placeholder="Enter item name manually..." required autoFocus />
                <button type="button" onClick={() => { setUseCustomItem(false); setFormData({ ...formData, item_name: '', product: null, estimated_unit_price: '' }); }} style={{ marginTop: '6px', fontSize: '13px', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>← Back to product catalog</button>
              </div>
            )}
            {errors.item_name && <span style={styles.errorText}>{errors.item_name}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Quantity *</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} style={{ ...styles.input, ...(errors.quantity ? styles.inputError : {}) }} placeholder="Enter quantity" required min="1" />
            {errors.quantity && <span style={styles.errorText}>{errors.quantity}</span>}
            {selectedProduct && formData.quantity > 0 && (
              <span style={{ fontSize: '12px', color: '#059669', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                Estimated total: ₹{(parseFloat(selectedProduct.unit_price) * parseInt(formData.quantity || 0)).toFixed(2)}
              </span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Department *</label>
            <input type="text" name="department" value={formData.department} onChange={handleInputChange} style={{ ...styles.input, ...(errors.department ? styles.inputError : {}) }} placeholder="e.g., IT, HR, Finance" required />
            {errors.department && <span style={styles.errorText}>{errors.department}</span>}
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Urgency Level *</label>
            <select name="urgency_level" value={formData.urgency_level} onChange={handleInputChange} style={styles.input} required>
              <option value="low">🔵 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Justification / Notes</label>
          <textarea name="justification" value={formData.justification} onChange={handleInputChange} style={{ ...styles.input, minHeight: '100px' }} placeholder="Explain why this purchase is needed..." />
        </div>
        <button type="submit" style={styles.btnPrimary} disabled={loading || (!formData.product && !formData.item_name.trim())}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

// ============================================
// DASHBOARD OVERVIEW
// ============================================

function DashboardOverview({ myRequests, assignedPOs, onCreateRequest, onViewRequests, onViewPOs }) {
  const pendingRequests = myRequests.filter(r => r.status === 'pending').length;
  const approvedRequests = myRequests.filter(r => r.status === 'approved').length;
  const activePOs = assignedPOs.filter(po => po.status === 'in_progress').length;
  const deliveredPOs = assignedPOs.filter(po => po.status === 'delivered').length;

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard title="Pending Requests" value={pendingRequests} subtitle={`${myRequests.length} total requests`} color="#F59E0B" icon="⏳" />
        <StatCard title="Approved Requests" value={approvedRequests} color="#10B981" icon="✅" />
        <StatCard title="Active POs" value={activePOs} subtitle={`${assignedPOs.length} total assigned`} color="#3B82F6" icon="📦" />
        <StatCard title="Delivered" value={deliveredPOs} color="#8B5CF6" icon="🚚" />
      </div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Quick Actions</h3>
        <div style={styles.quickActionsGrid}>
          <button style={styles.actionCard} onClick={onCreateRequest}><div style={styles.actionIcon}>➕</div><div style={styles.actionLabel}>Create Purchase Request</div></button>
          <button style={styles.actionCard} onClick={onViewRequests}><div style={styles.actionIcon}>📋</div><div style={styles.actionLabel}>View My Requests</div></button>
          <button style={styles.actionCard} onClick={onViewPOs}><div style={styles.actionIcon}>📦</div><div style={styles.actionLabel}>Assigned Purchase Orders</div></button>
        </div>
      </div>
      <div style={styles.dashboardGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Requests</h3>
          <div style={styles.recentList}>
            {myRequests.slice(0, 5).map(req => (
              <div key={req.id} style={styles.recentItem}>
                <div style={styles.recentIcon}>{req.status === 'approved' ? '✅' : req.status === 'rejected' ? '❌' : '⏳'}</div>
                <div style={styles.recentContent}>
                  <div style={styles.recentTitle}>{req.item_name}</div>
                  <div style={styles.recentSubtitle}>Qty: {req.quantity} • {new Date(req.created_at).toLocaleDateString()}</div>
                </div>
                <span style={getStatusBadgeStyle(req.status)}>{req.status}</span>
              </div>
            ))}
            {myRequests.length === 0 && <div style={styles.emptyState}>No requests yet</div>}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Purchase Orders</h3>
          <div style={styles.recentList}>
            {assignedPOs.filter(po => po.status === 'in_progress').slice(0, 5).map(po => (
              <div key={po.id} style={styles.recentItem}>
                <div style={styles.recentIcon}>📦</div>
                <div style={styles.recentContent}>
                  <div style={styles.recentTitle}>PO #{po.po_number}</div>
                  <div style={styles.recentSubtitle}>{po.vendor_name} • Due: {new Date(po.delivery_deadline).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {assignedPOs.filter(po => po.status === 'in_progress').length === 0 && <div style={styles.emptyState}>No active POs</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MY REQUESTS VIEW — "Raised By" column added
// ============================================

function MyRequestsView({ requests, onRefresh, loading }) {
  const [filter, setFilter] = useState('all');

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  /**
   * Resolve the display name of whoever raised the request.
   * The backend PurchaseRequestSerializer now includes:
   *   employee_name     – full name (SerializerMethodField)
   *   employee_username – username (SerializerMethodField)
   * Fallbacks handle older API responses gracefully.
   */
  const getEmployeeName = (req) => {
    if (req.employee_name && req.employee_name.trim()) return req.employee_name.trim();
    const first = req.employee_first_name || '';
    const last  = req.employee_last_name  || '';
    if (first || last) return `${first} ${last}`.trim();
    if (req.employee_username) return req.employee_username;
    if (req.employee) return `Employee #${req.employee}`;
    return '—';
  };

  const getEmployeeUsername = (req) => req.employee_username || null;

  /** Pick a deterministic avatar background based on the first character */
  const avatarColor = (name) => {
    const colors = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#EDE9FE', '#FCE7F3', '#FFEDD5'];
    const textColors = ['#1D4ED8', '#065F46', '#92400E', '#5B21B6', '#9D174D', '#9A3412'];
    const idx = (name.charCodeAt(0) || 0) % colors.length;
    return { bg: colors[idx], text: textColors[idx] };
  };

  return (
    <div style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.cardHeader}>
        <h3 style={{ ...styles.cardTitle, borderBottom: 'none', padding: 0 }}>
          Purchase Requests ({requests.length})
        </h3>
        <div style={styles.filterButtons}>
          {[
            { key: 'all',      label: `All (${requests.length})` },
            { key: 'pending',  label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
            { key: 'approved', label: `Approved (${requests.filter(r => r.status === 'approved').length})` },
            { key: 'rejected', label: `Rejected (${requests.filter(r => r.status === 'rejected').length})` },
          ].map(({ key, label }) => (
            <button key={key} style={filter === key ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
          <button style={styles.filterBtn} onClick={onRefresh} title="Refresh data">🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={styles.emptyState}>Loading requests...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Request ID</th>
                  {/* ── NEW COLUMN HEADER ── */}
                  <th style={styles.th}>Raised By</th>
                  <th style={styles.th}>Item Name</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Urgency</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const name     = getEmployeeName(req);
                  const username = getEmployeeUsername(req);
                  const { bg, text } = avatarColor(name);

                  return (
                    <tr key={req.id} style={styles.tableRow}>
                      <td style={styles.td}>#{req.id}</td>

                      {/* ── NEW CELL: avatar + full name + @username ── */}
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Avatar circle */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: text,
                            flexShrink: 0,
                            border: `1.5px solid ${text}33`,
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>

                          {/* Name + optional @username */}
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B', lineHeight: '1.3' }}>
                              {name}
                            </div>
                            {username && (
                              <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: '1.2' }}>
                                @{username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>{req.item_name}</td>
                      <td style={styles.td}>{req.quantity}</td>
                      <td style={styles.td}>{req.department}</td>
                      <td style={styles.td}>
                        <span style={getUrgencyBadgeStyle(req.urgency_level)}>{req.urgency_level}</span>
                      </td>
                      <td style={styles.td}>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(req.status)}>{req.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'all' ? 'No requests found. Create your first purchase request!' : `No ${filter} requests found.`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// ASSIGNED POs VIEW
// ============================================

function AssignedPOsView({ pos, onGoodsReceipt, onDeliveryStatus }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Assigned Purchase Orders</h3>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeaderRow}>
            <th style={styles.th}>PO Number</th>
            <th style={styles.th}>Vendor</th>
            <th style={styles.th}>Items</th>
            <th style={styles.th}>Quantity</th>
            <th style={styles.th}>Delivery Deadline</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pos.map(po => {
            const itemNames = po.items && po.items.length > 0
              ? po.items.map(item => item.product_name || item.name || 'Unknown').join(', ')
              : 'No items';
            const totalQty = po.items && po.items.length > 0
              ? po.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
              : po.total_quantity || 0;
            return (
              <tr key={po.id} style={styles.tableRow}>
                <td style={styles.td}>#{po.po_number}</td>
                <td style={styles.td}>{po.vendor_name}</td>
                <td style={styles.td}>{itemNames}</td>
                <td style={styles.td}>{totalQty}</td>
                <td style={styles.td}>{po.delivery_deadline ? new Date(po.delivery_deadline).toLocaleDateString() : po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'Not set'}</td>
                <td style={styles.td}><span style={getPOStatusBadgeStyle(po.status)}>{po.status}</span></td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button onClick={() => onGoodsReceipt(po)} style={styles.actionBtn} title="Record Goods Receipt">📥</button>
                    <button onClick={() => onDeliveryStatus(po)} style={styles.actionBtn} title="Update Delivery Status">🚚</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pos.length === 0 && <div style={styles.emptyState}>No purchase orders assigned to you</div>}
    </div>
  );
}

function GoodsReceiptView({ pos, onSubmit }) {
  const [selectedPO, setSelectedPO] = useState('');
  const [deliveredQty, setDeliveredQty] = useState('');
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    if (selectedPO) fetchReceipts(selectedPO);
    else setReceipts([]);
  }, [selectedPO]);

  const fetchReceipts = async (poId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/goods-receipts/?purchase_order=${poId}`);
      if (res.ok) setReceipts(await res.json());
    } catch (err) { console.error('Failed to fetch receipts:', err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${selectedPO}/goods-receipt/`, {
        method: 'POST',
        body: JSON.stringify({ delivered_quantity: deliveredQty, condition, notes })
      });
      if (res.ok) {
        alert('Goods receipt recorded successfully!');
        const poId = selectedPO;
        setSelectedPO(''); setDeliveredQty(''); setCondition('good'); setNotes('');
        fetchReceipts(poId);
        onSubmit();
      } else {
        const errorData = await res.json();
        alert('Failed to record goods receipt:' + JSON.stringify(errorData));
      }
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Record Goods Receipt</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Purchase Order *</label>
            <select value={selectedPO} onChange={(e) => { const sel = pos.find(p => p.id === parseInt(e.target.value)); setSelectedPO(sel ? sel.id : ''); }} style={styles.input} required>
              <option value="">Select PO</option>
              {pos.map(po => (<option key={po.id} value={po.id}>PO #{po.po_number} - {po.vendor_name}</option>))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Delivered Quantity *</label>
            <input type="number" value={deliveredQty} onChange={(e) => setDeliveredQty(e.target.value)} style={styles.input} required min="0" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Condition *</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} style={styles.input} required>
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="shortage">Shortage</option>
            </select>
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} placeholder="Any additional notes about the delivery..." />
        </div>
        <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Recording...' : 'Record Goods Receipt'}</button>
      </form>
      {selectedPO && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Receipt History for this PO</h3>
          {receipts.length === 0 ? (<div style={styles.emptyState}>No receipts recorded yet for this PO</div>) : (
            <table style={styles.table}>
              <thead><tr style={styles.tableHeaderRow}><th style={styles.th}>Receipt ID</th><th style={styles.th}>Quantity Delivered</th><th style={styles.th}>Condition</th><th style={styles.th}>Notes</th><th style={styles.th}>Received At</th></tr></thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} style={styles.tableRow}>
                    <td style={styles.td}>#{r.id}</td>
                    <td style={styles.td}>{r.delivered_quantity}</td>
                    <td style={styles.td}><span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', backgroundColor: r.condition === 'good' ? '#D1FAE5' : '#FEE2E2', color: r.condition === 'good' ? '#065F46' : '#991B1B' }}>{r.condition}</span></td>
                    <td style={styles.td}>{r.notes || '—'}</td>
                    <td style={styles.td}>{new Date(r.received_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function DeliveryStatusView() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchAssignedPOs(); }, []);

  const fetchAssignedPOs = async () => {
    try {
      setLoading(true); setError('');
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/assigned/`);
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data);
        if (data.length === 0) setError('No purchase orders assigned to you');
      } else {
        const errorData = await res.json();
        setError('Failed to load purchase orders: ' + JSON.stringify(errorData));
      }
    } catch (err) { setError('Error loading purchase orders: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedPO) { setError('Please select a purchase order'); return; }
    if (!selectedStatus) { setError('Please select a status'); return; }
    setUpdating(true); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${selectedPO}/update-status/`, { method: 'POST', body: JSON.stringify({ status: selectedStatus }) });
      if (res.ok) {
        setSuccess(`✅ Delivery status updated successfully to: ${selectedStatus}`);
        setSelectedPO(''); setSelectedStatus('');
        await fetchAssignedPOs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await res.json();
        setError('Failed to update status: ' + (errorData.error || JSON.stringify(errorData)));
      }
    } catch (err) { setError('Error updating status: ' + err.message); }
    finally { setUpdating(false); }
  };

  if (loading) return (<div style={styles.container}><div style={styles.card}><h2 style={styles.cardTitle}>Delivery Status Update</h2><div style={styles.emptyState}>Loading your assigned purchase orders...</div></div></div>);

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Delivery Status Update</h3>
      <p style={{ fontSize: '14px', color: '#6B7280', padding: '0 24px 16px', margin: 0 }}>Update delivery status for purchase orders assigned to you</p>
      {error && <div style={{ ...styles.errorAlert, margin: '0 24px 16px' }}>{error}</div>}
      {success && <div style={{ ...styles.successAlert, margin: '0 24px 16px' }}>{success}</div>}
      {purchaseOrders.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
          <h3>No Purchase Orders Assigned</h3>
          <p>You don't have any purchase orders assigned to you yet.</p>
          <button onClick={fetchAssignedPOs} style={{ marginTop: '16px', padding: '12px 24px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>
      ) : (
        <form onSubmit={handleUpdateStatus} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Purchase Order *</label>
              <select value={selectedPO} onChange={(e) => setSelectedPO(e.target.value)} style={styles.input} required>
                <option value="">Select Purchase Order</option>
                {purchaseOrders.map(po => (<option key={po.id} value={po.id}>{po.po_number} - {po.vendor_name} (Current: {po.status})</option>))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>New Status *</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={styles.input} required>
                <option value="">Select Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="received">Received</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>
          {selectedPO && (() => {
            const po = purchaseOrders.find(p => p.id === parseInt(selectedPO));
            if (!po) return null;
            return (
              <div style={{ padding: '20px', backgroundColor: '#F0F9FF', borderRadius: '8px', marginBottom: '24px', border: '1px solid #BAE6FD' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '16px' }}>Purchase Order Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[['PO Number', po.po_number], ['Vendor', po.vendor_name], ['Total Amount', `₹${parseFloat(po.total_amount || 0).toFixed(2)}`]].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{label}:</span>
                      <span style={{ fontSize: '14px', color: '#1E293B', fontWeight: '600' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Current Status:</span>
                    <span style={getPOStatusBadgeStyle(po.status)}>{po.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <button type="submit" style={{ padding: '12px 32px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }} disabled={updating || !selectedPO || !selectedStatus}>
              {updating ? 'Updating...' : '✅ Update Status'}
            </button>
            <button type="button" onClick={() => { setSelectedPO(''); setSelectedStatus(''); setError(''); setSuccess(''); }} style={{ padding: '12px 32px', backgroundColor: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }} disabled={updating}>🔄 Reset</button>
          </div>
        </form>
      )}
      {purchaseOrders.length > 0 && (
        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '16px', padding: '0 24px' }}>Your Assigned Purchase Orders</h3>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #E5E7EB', margin: '0 24px' }}>
            <table style={styles.table}>
              <thead><tr style={styles.tableHeaderRow}><th style={styles.th}>PO Number</th><th style={styles.th}>Vendor</th><th style={styles.th}>Amount</th><th style={styles.th}>Status</th><th style={styles.th}>Expected Delivery</th></tr></thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id} style={styles.tableRow}>
                    <td style={styles.td}>{po.po_number}</td>
                    <td style={styles.td}>{po.vendor_name}</td>
                    <td style={styles.td}>₹{parseFloat(po.total_amount || 0).toFixed(2)}</td>
                    <td style={styles.td}><span style={getPOStatusBadgeStyle(po.status)}>{po.status.replace('_', ' ')}</span></td>
                    <td style={styles.td}>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'Not set'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GoodsReceiptModal({ po, onClose, onSuccess }) {
  const [deliveredQty, setDeliveredQty] = useState('');
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${po.id}/goods-receipt/`, { method: 'POST', body: JSON.stringify({ delivered_quantity: deliveredQty, condition, notes }) });
      if (res.ok) { alert('Goods receipt recorded successfully!'); onSuccess(); }
      else alert('Failed to record goods receipt');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Record Goods Receipt</h2>
        <div style={styles.modalSubtitle}>PO #{po.po_number} - {po.vendor_name}</div>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}><label style={styles.label}>Delivered Quantity *</label><input type="number" value={deliveredQty} onChange={(e) => setDeliveredQty(e.target.value)} style={styles.input} required min="0" placeholder="Enter quantity received" /></div>
          <div style={styles.formGroup}><label style={styles.label}>Condition *</label><select value={condition} onChange={(e) => setCondition(e.target.value)} style={styles.input} required><option value="good">Good Condition</option><option value="damaged">Damaged</option><option value="shortage">Shortage</option></select></div>
          <div style={styles.formGroup}><label style={styles.label}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} placeholder="Any additional notes about the delivery..." /></div>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Recording...' : 'Record Receipt'}</button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryStatusModal({ po, onClose, onSuccess }) {
  const [status, setStatus] = useState(po.status || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/purchase-orders/${po.id}/update-status/`, { method: 'POST', body: JSON.stringify({ status, reason }) });
      if (res.ok) { alert('Delivery status updated successfully!'); onSuccess(); }
      else alert('Failed to update status');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Update Delivery Status</h2>
        <div style={styles.modalSubtitle}>PO #{po.po_number} - {po.vendor_name}</div>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}><label style={styles.label}>Delivery Status *</label><select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input} required><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="received">Received</option><option value="delivered">Delivered</option><option value="delayed">Delayed</option></select></div>
          {status === 'delayed' && (<div style={styles.formGroup}><label style={styles.label}>Reason for Delay *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} placeholder="Explain the reason for delay..." required /></div>)}
          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Updating...' : 'Update Status'}</button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NotificationsDropdown({ notifications, onClose }) {
  return (
    <div style={styles.notificationsDropdown}>
      <div style={styles.notificationsHeader}>
        <h4 style={styles.notificationsTitle}>Notifications</h4>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
      </div>
      <div style={styles.notificationsList}>
        {notifications.slice(0, 10).map(notif => (
          <div key={notif.id} style={{ ...styles.notificationItem, backgroundColor: notif.read ? '#fff' : '#EFF6FF' }}>
            <div style={styles.notificationIcon}>{notif.type === 'approval' ? '✅' : notif.type === 'rejection' ? '❌' : notif.type === 'delivery' ? '🚚' : '📬'}</div>
            <div style={styles.notificationContent}>
              <div style={styles.notificationText}>{notif.message}</div>
              <div style={styles.notificationTime}>{new Date(notif.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <div style={styles.emptyNotifications}>No notifications</div>}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}><span style={{ fontSize: '32px' }}>{icon}</span></div>
      <div style={styles.statContent}>
        <div style={styles.statLabel}>{title}</div>
        <div style={{ ...styles.statValue, color }}>{value}</div>
        {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

function getStatusBadgeStyle(status) {
  const base = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', textTransform: 'capitalize' };
  const colors = { pending: { backgroundColor: '#FEF3C7', color: '#92400E' }, approved: { backgroundColor: '#D1FAE5', color: '#065F46' }, rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' } };
  return { ...base, ...(colors[status] || { backgroundColor: '#F3F4F6', color: '#374151' }) };
}

function getUrgencyBadgeStyle(urgency) {
  const base = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', textTransform: 'capitalize' };
  const colors = { low: { backgroundColor: '#E0E7FF', color: '#3730A3' }, medium: { backgroundColor: '#FEF3C7', color: '#92400E' }, high: { backgroundColor: '#FED7AA', color: '#9A3412' }, urgent: { backgroundColor: '#FEE2E2', color: '#991B1B' } };
  return { ...base, ...(colors[urgency] || {}) };
}

function getPOStatusBadgeStyle(status) {
  const base = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', textTransform: 'capitalize' };
  const colors = { pending: { backgroundColor: '#FEF3C7', color: '#92400E' }, in_progress: { backgroundColor: '#DBEAFE', color: '#1E40AF' }, received: { backgroundColor: '#E0E7FF', color: '#3730A3' }, delivered: { backgroundColor: '#D1FAE5', color: '#065F46' }, delayed: { backgroundColor: '#FEE2E2', color: '#991B1B' } };
  return { ...base, ...(colors[status] || {}) };
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#F5F7FA', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  sidebar: { width: '280px', position: 'fixed', left: 0, top: 0, height: '100vh', backgroundColor: '#1E293B', color: 'white', overflowY: 'auto' },
  sidebarHeader: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e4e7ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  logoText: { fontSize: '20px', fontWeight: '600' },
  nav: { padding: '20px 0' },
  navItem: { width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s', fontSize: '15px', textAlign: 'left' },
  navItemActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#e6e9ed', borderLeft: '3px solid #f6f8fc' },
  navIcon: { fontSize: '20px', width: '24px', textAlign: 'center' },
  navLabel: { fontWeight: '500' },
  mainContent: { flex: 1, marginLeft: '280px' },
  topBar: { backgroundColor: 'white', padding: '20px 32px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: '28px', fontWeight: '600', color: '#1E293B', margin: 0 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  notificationContainer: { position: 'relative' },
  notificationBtn: { fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px' },
  notificationBadge: { position: 'absolute', top: '4px', right: '4px', backgroundColor: '#671a1a', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' },
  notificationsDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '360px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1000 },
  notificationsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' },
  notificationsTitle: { margin: 0, fontSize: '16px', fontWeight: '600' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280' },
  notificationsList: { maxHeight: '400px', overflowY: 'auto' },
  notificationItem: { display: 'flex', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #F3F4F6' },
  notificationIcon: { fontSize: '20px' },
  notificationContent: { flex: 1 },
  notificationText: { fontSize: '14px', color: '#374151', marginBottom: '4px' },
  notificationTime: { fontSize: '12px', color: '#9CA3AF' },
  emptyNotifications: { padding: '32px', textAlign: 'center', color: '#9CA3AF' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  userName: { fontSize: '14px', fontWeight: '500', color: '#374151' },
  logoutButton: { padding: '10px 24px', backgroundColor: '#1b0202', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  contentArea: { padding: '32px' },
  profileTabsContainer: { display: 'flex', gap: '12px', marginBottom: '24px' },
  profileTab: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', color: '#6B7280' },
  profileTabActive: { padding: '12px 24px', backgroundColor: '#051021', border: '1px solid #b9c6de', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: 'white' },
  profileFormGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  passwordFormContainer: { maxWidth: '500px' },
  passwordRequirements: { marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' },
  requirementsTitle: { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' },
  requirementsList: { listStyle: 'none', padding: 0, margin: 0 },
  requirement: { fontSize: '13px', color: '#6B7280', padding: '4px 0', paddingLeft: '24px', position: 'relative' },
  requirementMet: { fontSize: '13px', color: '#056545', padding: '4px 0', paddingLeft: '24px', position: 'relative' },
  helpText: { fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' },
  errorText: { fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block', fontWeight: '500' },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' },
  statIcon: { width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statContent: { flex: 1 },
  statLabel: { fontSize: '13px', color: '#6B7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statValue: { fontSize: '32px', fontWeight: '700', lineHeight: '1.2' },
  statSubtitle: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '24px', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E5E7EB' },
  cardTitle: { fontSize: '18px', fontWeight: '600', padding: '20px 24px', margin: 0, borderBottom: '1px solid #E5E7EB' },
  quickActionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '24px' },
  actionCard: { padding: '24px', backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
  actionIcon: { fontSize: '32px', marginBottom: '12px' },
  actionLabel: { fontSize: '14px', fontWeight: '500', color: '#374151' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  recentList: { padding: '16px 24px' },
  recentItem: { display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3F4F6', alignItems: 'center' },
  recentIcon: { fontSize: '24px' },
  recentContent: { flex: 1 },
  recentTitle: { fontSize: '14px', fontWeight: '500', color: '#1E293B', marginBottom: '4px' },
  recentSubtitle: { fontSize: '13px', color: '#9CA3AF' },
  filterButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  filterBtnActive: { padding: '8px 16px', border: '1px solid #b3ccf5', backgroundColor: '#EFF6FF', color: '#0b182c', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { backgroundColor: '#F9FAFB' },
  th: { padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' },
  tableRow: { transition: 'background-color 0.2s' },
  td: { padding: '14px 20px', borderBottom: '1px solid #F3F4F6', fontSize: '14px', color: '#374151' },
  actionButtons: { display: 'flex', gap: '8px' },
  actionBtn: { padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '18px', borderRadius: '6px', transition: 'background-color 0.2s' },
  emptyState: { padding: '48px', textAlign: 'center', color: '#9CA3AF', fontSize: '15px' },
  form: { padding: '24px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', transition: 'all 0.2s' },
  formActions: { display: 'flex', gap: '12px', marginTop: '24px' },
  btnPrimary: { padding: '12px 24px', backgroundColor: '#071e42', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  btnSecondary: { padding: '12px 24px', backgroundColor: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal: { backgroundColor: 'white', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#1E293B' },
  modalSubtitle: { fontSize: '14px', color: '#6B7280', marginBottom: '24px' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  errorAlert: { padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  successAlert: { padding: '12px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px', color: '#6B7280' },
};