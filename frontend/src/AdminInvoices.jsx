import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (invoiceId) => {
    if (!window.confirm('Approve this invoice?')) return;

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });

      if (res.ok) {
        alert('Invoice approved!');
        fetchInvoices();
      }
    } catch (err) {
      console.error('Error approving invoice:', err);
    }
  };

  const handleMarkPaid = async (invoiceId, totalAmount) => {
    if (!window.confirm('Mark this invoice as paid?')) return;

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'paid',
          paid_amount: totalAmount,
        }),
      });

      if (res.ok) {
        alert('Invoice marked as paid!');
        fetchInvoices();
      }
    } catch (err) {
      console.error('Error marking paid:', err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  if (loading) return <div style={styles.loading}>Loading invoices...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Invoice Management</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Invoices</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div style={styles.grid}>
        {filteredInvoices.map((inv) => (
          <div key={inv.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3>{inv.invoice_number}</h3>
                <p style={styles.vendorName}>{inv.vendor_name}</p>
              </div>
              <span
                style={{
                  ...styles.badge,
                  backgroundColor:
                    inv.status === 'paid'
                      ? '#10B981'
                      : inv.status === 'approved'
                      ? '#3B82F6'
                      : '#F59E0B',
                }}
              >
                {inv.status.toUpperCase()}
              </span>
            </div>

            <div style={styles.cardBody}>
              <p>
                <strong>PO:</strong> {inv.po_number || 'N/A'}
              </p>
              <p>
                <strong>Amount:</strong> ₹{parseFloat(inv.total_amount).toLocaleString()}
              </p>
              <p>
                <strong>Due:</strong> {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
              </p>

              {inv.invoice_file && (
                <a
                  href={`${API_BASE_URL.replace('/api', '')}${inv.invoice_file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.fileLink}
                >
                  📎 View Uploaded File
                </a>
              )}
            </div>

            <div style={styles.cardFooter}>
              {inv.status === 'pending' && (
                <button
                  onClick={() => handleApprove(inv.id)}
                  style={{ ...styles.btn, backgroundColor: '#3B82F6' }}
                >
                  ✅ Approve
                </button>
              )}
              {inv.status === 'approved' && (
                <button
                  onClick={() => handleMarkPaid(inv.id, inv.total_amount)}
                  style={{ ...styles.btn, backgroundColor: '#10B981' }}
                >
                  💰 Mark as Paid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCsrfToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const styles = {
  container: { padding: '40px', backgroundColor: '#F9FAFB', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  filterSelect: { padding: '10px 15px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' },
  vendorName: { color: '#6B7280', fontSize: '13px', marginTop: '4px' },
  badge: { padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: 'white' },
  cardBody: { marginBottom: '15px', fontSize: '14px', lineHeight: '1.8' },
  fileLink: { color: '#3B82F6', textDecoration: 'none', fontWeight: '500', display: 'block', marginTop: '10px' },
  cardFooter: { display: 'flex', gap: '10px' },
  btn: { flex: 1, padding: '10px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px' },
};