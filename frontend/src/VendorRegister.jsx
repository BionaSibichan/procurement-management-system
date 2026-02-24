import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api';
const RequiredLabel = ({ children }) => (
  <label style={{
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  }}>
    {children} <span style={{ color: '#EF4444' }}>*</span>
  </label>
);

export default function VendorRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    username: '',
    email: '',
    phone: '',
    password: '',          // ADD THIS
    confirm_password: '', // ADD THIS
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    tax_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // ADD PASSWORD VALIDATION
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      // Remove confirm_password before sending
      const { confirm_password, ...dataToSend } = formData;
      
      const res = await fetch(`${API_BASE_URL}/vendor/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Vendor Registration</h1>
          <p style={styles.subtitle}>Register your company to become an approved vendor</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>

            <div style={styles.formGroup}>
              <RequiredLabel>Company Name</RequiredLabel>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <RequiredLabel>Contact Person</RequiredLabel>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                style={styles.input}
                required
              />
            </div>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
  < RequiredLabel>Username</RequiredLabel>
  <input
    type="text"
    value={formData.username}
    onChange={(e) => setFormData({...formData, username: e.target.value})}
    style={styles.input}
    placeholder="Choose a username for login"
    required
  />
  <p style={{fontSize: '12px', color: '#64748B', marginTop: '4px'}}>
    This username will be used to log in to the vendor portal
  </p>
</div>

            <div style={styles.formGroup}>
              <RequiredLabel>Email</RequiredLabel>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <RequiredLabel>Phone</RequiredLabel>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                style={styles.input}
                required
              />
            </div>

            {/* ADD PASSWORD FIELDS */}
            <div style={styles.formGroup}>
              <RequiredLabel>Password</RequiredLabel>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={styles.input}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <div style={styles.formGroup}>
              <RequiredLabel>Confirm Password</RequiredLabel>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                style={styles.input}
                placeholder="Re-enter password"
                required
                minLength={8}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tax ID</label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                style={{...styles.input, minHeight: '80px'}}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button 
              type="submit" 
              style={styles.submitBtn} 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Register'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/')}
              style={styles.cancelBtn}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '900px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748B',
  },
  errorAlert: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  successAlert: {
    padding: '12px 16px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  form: {},
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  formGroup: {},
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  submitBtn: {
    padding: '12px 32px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '12px 32px',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};