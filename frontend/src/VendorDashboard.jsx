import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api';

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState('rfqs');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceCreate, setShowInvoiceCreate] = useState(null);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInvoiceUpload, setShowInvoiceUpload] = useState(null);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const vendorCompany = user.company_name || null;  

  useEffect(() => {
    if (!user || !user.username) {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching vendor dashboard data...');
      
      const rfqRes = await fetch(
        `${API_BASE_URL}/vendor-dashboard/my_rfqs/`,
        { credentials: 'include' }
      );
      
      if (rfqRes.ok) {
        const rfqData = await rfqRes.json();
        console.log('✅ RFQs received:', rfqData);
        setRfqs(rfqData);
      } else {
        console.error('❌ Failed to fetch RFQs:', rfqRes.status);
      }

      const quotRes = await fetch(
        `${API_BASE_URL}/vendor-dashboard/my_quotations/`,
        { credentials: 'include' }
      );
      if (quotRes.ok) {
        const quotData = await quotRes.json();
        console.log('Quotations:', quotData);
        setQuotations(quotData);
      }

      const poRes = await fetch(
        `${API_BASE_URL}/vendor-dashboard/my_purchase_orders/`,
        { credentials: 'include' }
      );
      if (poRes.ok) {
        const poData = await poRes.json();
        console.log('✅ Purchase Orders received:', poData);
        setPurchaseOrders(poData);
      }

      const invRes = await fetch(
        `${API_BASE_URL}/vendor-dashboard/my_invoices/`,
        { credentials: 'include' }
      );
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSubmitQuotation = (rfq) => {
    setSelectedRfq(rfq);
    setShowQuotationModal(true);
  };

  const handleUpdateStatus = (po) => {
    setSelectedRfq(po);
    setShowStatusModal(true);
  };

  const handleCreateInvoice = (po) => {
    setShowInvoiceCreate(po);
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
  <div style={{ flex: 1, textAlign: 'center' }}>
    <h1 style={styles.title}>Vendor Portal</h1>
    {vendorCompany && (
      <p style={{
        margin: '0 0 2px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e3a5f',
      }}>
        🏢 {vendorCompany}
      </p>
    )}
    <p style={styles.subtitle}>
      Welcome, {user.first_name || user.username}!
    </p>
  </div>
  <button onClick={handleLogout} style={styles.logoutBtn}>
    Logout
  </button>
</div>

      <div style={styles.statsContainer}>
        <StatCard
          title="Pending RFQs"
          value={stats?.pending_rfqs || 0}
          icon="📨"
        />
        <StatCard
          title="Submitted Quotations"
          value={stats?.submitted_quotations || 0}
          icon="📝"
        />
        <StatCard
          title="Total Orders"
          value={purchaseOrders.length || 0}
          icon="📦"
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pending_payments || 0}
          icon="💰"
        />
      </div>

      <div style={styles.tabs}>
        {['rfqs', 'quotations', 'orders', 'invoices'].map((tab) => (
          <button
            key={tab}
            style={activeTab === tab ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'rfqs' && '📨 RFQs'}
            {tab === 'quotations' && '📝 Quotations'}
            {tab === 'orders' && '📋 Purchase Orders'}
            {tab === 'invoices' && '📄 Invoices'}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'rfqs' && (
          <RFQTab
            rfqs={rfqs}
            onSubmitQuotation={handleSubmitQuotation}
            onRefresh={fetchDashboardData}
          />
        )}
        {activeTab === 'quotations' && (
          <QuotationsTab quotations={quotations} />
        )}
        {activeTab === 'orders' && (
          <PurchaseOrdersTab
            orders={purchaseOrders}
            onUpdateStatus={handleUpdateStatus}
            onCreateInvoice={handleCreateInvoice}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoicesTab
            invoices={invoices}
            onUpload={(inv) => setShowInvoiceUpload(inv)}
          />
        )}
      </div>

      {showInvoiceCreate && (
        <InvoiceCreateModal
          po={showInvoiceCreate}
          onClose={() => setShowInvoiceCreate(null)}
          onSuccess={() => {
            setShowInvoiceCreate(null);
            fetchDashboardData();
          }}
        />
      )}
      {showQuotationModal && (
        <QuotationModal
          rfq={selectedRfq}
          onClose={() => {
            setShowQuotationModal(false);
            setSelectedRfq(null);
          }}
          onSuccess={() => {
            setShowQuotationModal(false);
            setSelectedRfq(null);
            fetchDashboardData();
          }}
        />
      )}

      {showStatusModal && (
        <DeliveryStatusModal
          po={selectedRfq}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedRfq(null);
          }}
          onSuccess={() => {
            setShowStatusModal(false);
            setSelectedRfq(null);
            fetchDashboardData();
          }}
        />
      )}

      {showInvoiceUpload && (
        <InvoiceUploadModal
          invoice={showInvoiceUpload}
          onClose={() => setShowInvoiceUpload(null)}
          onSuccess={() => {
            setShowInvoiceUpload(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}

// ✅ CSRF Token Helper Function
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

function StatCard({ title, value, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <h3 style={styles.statTitle}>{title}</h3>
        <p style={styles.statValue}>{value}</p>
      </div>
    </div>
  );
}

function RFQTab({ rfqs, onSubmitQuotation, onRefresh }) {
  const [filter, setFilter] = useState('all');

  const filteredRfqs = rfqs.filter((rfq) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return rfq.status === 'sent';
    if (filter === 'responded') return rfq.status === 'received';
    return true;
  });

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2>Requests for Quotation (RFQs)</h2>
        <div style={{display: 'flex', gap: '12px'}}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All RFQs</option>
            <option value="pending">Pending Response</option>
            <option value="responded">Responded</option>
          </select>
          <button onClick={onRefresh} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={styles.ordersGrid}>
        {filteredRfqs.map((rfq) => (
          <RFQCard
            key={rfq.id}
            rfq={rfq}
            onSubmitQuotation={onSubmitQuotation}
          />
        ))}
      </div>

      {filteredRfqs.length === 0 && (
        <p style={styles.noData}>
          {filter === 'all' 
            ? 'No RFQs found. New quotation requests will appear here.' 
            : `No ${filter === 'pending' ? 'pending' : 'responded'} RFQs found.`}
        </p>
      )}
    </div>
  );
}

function RFQCard({ rfq, onSubmitQuotation }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      sent: '#ffc107',
      received: '#17a2b8',
      accepted: '#28a745',
      rejected: '#dc3545',
      expired: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  const requestDetails = rfq.purchase_request_details || {};
  const itemName = requestDetails.item_name || rfq.purchase_request?.item_name || 'N/A';
  const quantity = requestDetails.quantity || rfq.purchase_request?.quantity || 'N/A';
  const department = requestDetails.department || rfq.purchase_request?.department || 'N/A';
  const justification = requestDetails.justification || rfq.purchase_request?.justification || '';
  const urgency = requestDetails.urgency_level || rfq.purchase_request?.urgency_level || 'N/A';

  return (
    <div style={styles.poCard}>
      <div style={styles.poHeader}>
        <div>
          <h3 style={styles.poNumber}>RFQ #{rfq.rfq_number}</h3>
          <p style={styles.poDate}>
            Sent: {new Date(rfq.sent_date).toLocaleDateString()}
          </p>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: getStatusColor(rfq.status),
          }}
        >
          {rfq.status?.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div style={styles.poBody}>
        <div style={styles.poInfo}>
          <p style={styles.infoRow}>
            <strong>Item Required:</strong> {itemName}
          </p>
          <p style={styles.infoRow}>
            <strong>Quantity:</strong> {quantity}
          </p>
          <p style={styles.infoRow}>
            <strong>Department:</strong> {department}
          </p>
          <p style={styles.infoRow}>
            <strong>Urgency:</strong> <span style={getUrgencyStyle(urgency)}>{urgency}</span>
          </p>
          {rfq.response_deadline && (
            <p style={styles.infoRow}>
              <strong>Response Deadline:</strong>{' '}
              <span style={{color: '#EF4444', fontWeight: '600'}}>
                {new Date(rfq.response_deadline).toLocaleDateString()}
              </span>
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={styles.expandBtn}
        >
          {expanded ? '▲ Hide Details' : '▼ Show Full Details'}
        </button>

        {expanded && (
          <div style={styles.itemsList}>
            <h4 style={styles.itemsTitle}>Complete Request Information:</h4>
            
            {justification && (
              <div style={styles.detailSection}>
                <strong>Justification:</strong>
                <p style={styles.detailText}>{justification}</p>
              </div>
            )}

            {rfq.admin_notes && (
              <div style={styles.detailSection}>
                <strong>Admin Notes:</strong>
                <p style={styles.detailText}>{rfq.admin_notes}</p>
              </div>
            )}

            <div style={styles.detailSection}>
              <strong>Request ID:</strong> #{requestDetails.id || rfq.purchase_request}
            </div>
          </div>
        )}

        {rfq.has_quotation && rfq.quotation && (
          <div style={styles.quotationInfo}>
            <strong>📝 Your Quotation:</strong>
            <p>Status: <span style={getQuotationStatusStyle(rfq.quotation.status)}>{rfq.quotation.status}</span></p>
            <p>Amount: <strong>₹{rfq.quotation.total_amount}</strong></p>
            {rfq.quotation.submitted_date && (
              <p>Submitted: {new Date(rfq.quotation.submitted_date).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </div>

      <div style={styles.poFooter}>
        {rfq.status === 'sent' && !rfq.has_quotation ? (
          <button
            onClick={() => onSubmitQuotation(rfq)}
            style={styles.submitQuoteBtn}
          >
            📨 Submit Quotation
          </button>
        ) : rfq.has_quotation ? (
          <button style={{ ...styles.updateBtn, opacity: 0.6 }} disabled>
            ✅ Quotation Submitted
          </button>
        ) : (
          <button style={{ ...styles.updateBtn, opacity: 0.5 }} disabled>
            {rfq.status === 'accepted' ? '✅ Accepted' : 
             rfq.status === 'rejected' ? '❌ Rejected' : 
             'Response Sent'}
          </button>
        )}
      </div>
    </div>
  );
}

function getUrgencyStyle(urgency) {
  const styles = {
    low: { color: '#3B82F6', fontWeight: '600' },
    medium: { color: '#F59E0B', fontWeight: '600' },
    high: { color: '#EF4444', fontWeight: '600' },
    urgent: { color: '#DC2626', fontWeight: '700', textTransform: 'uppercase' },
  };
  return styles[urgency?.toLowerCase()] || {};
}

function getQuotationStatusStyle(status) {
  const styles = {
    submitted: { color: '#3B82F6', fontWeight: '600' },
    accepted: { color: '#10B981', fontWeight: '600' },
    rejected: { color: '#EF4444', fontWeight: '600' },
  };
  return styles[status] || {};
}

function QuotationsTab({ quotations }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>My Quotations</h2>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Quote #</th>
              <th style={styles.th}>RFQ #</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quot) => (
              <tr key={quot.id}>
                <td style={styles.td}>{quot.quotation_number}</td>
                <td style={styles.td}>{quot.rfq_number}</td>
                <td style={styles.td}>{quot.item_name}</td>
                <td style={styles.td}>₹{quot.total_amount}</td>
                <td style={styles.td}>
                  <span
                    style={
                      quot.status === 'accepted'
                        ? styles.statusPaid
                        : quot.status === 'rejected'
                        ? { ...styles.statusPending, background: '#f8d7da', color: '#721c24' }
                        : styles.statusPending
                    }
                  >
                    {quot.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {quot.submitted_date
                    ? new Date(quot.submitted_date).toLocaleDateString()
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotations.length === 0 && (
          <p style={styles.noData}>No quotations found.</p>
        )}
      </div>
    </div>
  );
}

function PurchaseOrdersTab({ orders, onUpdateStatus, onCreateInvoice }) {
  const [filter, setFilter] = useState('all');

  const filteredOrders = orders.filter((po) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'shipped', 'in_transit'].includes(po.delivery_status);
    if (filter === 'delivered') return po.delivery_status === 'delivered';
    return true;
  });

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2>Purchase Orders ({orders.length})</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div style={styles.ordersGrid}>
        {filteredOrders.map((po) => (
          <PurchaseOrderCard
            key={po.id}
            po={po}
            onUpdateStatus={onUpdateStatus}
            onCreateInvoice={onCreateInvoice}
          />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <p style={styles.noData}>No purchase orders found.</p>
      )}
    </div>
  );
}

function PurchaseOrderCard({ po, onUpdateStatus, onCreateInvoice }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#3B82F6',
      shipped: '#17a2b8',
      in_transit: '#007bff',
      delivered: '#28a745',
      delayed: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const getDaysUntilText = (days) => {
    if (days === null) return '';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    return `${days} days remaining`;
  };

  return (
    <div style={styles.poCard}>
      <div style={styles.poHeader}>
        <div>
          <h3 style={styles.poNumber}>PO #{po.po_number}</h3>
          <p style={styles.poDate}>
            Order Date: {new Date(po.order_date).toLocaleDateString()}
          </p>
        </div>
         <span
  style={{
    ...styles.statusBadge,
    backgroundColor: getStatusColor(po.status || po.delivery_status),
  }}
>
  {(po.status || po.delivery_status)?.replace('_', ' ').toUpperCase()}
</span>
      </div>

      <div style={styles.poBody}>
        <div style={styles.poInfo}>
          <p style={styles.infoRow}>
            <strong>Expected Delivery:</strong>{' '}
            {po.expected_delivery_date 
              ? new Date(po.expected_delivery_date).toLocaleDateString()
              : 'Not set'}
          </p>
          <p style={styles.infoRow}>
            <strong>Total Amount:</strong> ₹{parseFloat(po.total_amount || 0).toFixed(2)}
          </p>
          {po.days_until_delivery !== null && (
            <p style={{ ...styles.infoRow, color: po.days_until_delivery < 0 ? '#dc3545' : '#666' }}>
              {getDaysUntilText(po.days_until_delivery)}
            </p>
          )}
          {po.tracking_number && (
            <p style={styles.infoRow}>
              <strong>Tracking:</strong> {po.tracking_number}
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={styles.expandBtn}
        >
          {expanded ? '▲ Hide Items' : '▼ Show Items'}
        </button>

        {expanded && po.items && po.items.length > 0 && (
          <div style={styles.itemsList}>
            <h4 style={styles.itemsTitle}>Order Items:</h4>
            {po.items.map((item, idx) => (
              <div key={idx} style={styles.item}>
                <div style={{flex: 1}}>
                  <strong>{item.product_name || item.name || 'N/A'}</strong>
                  <div style={{fontSize: '12px', color: '#6B7280', marginTop: '4px'}}>
                    Qty: {item.quantity} × ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{textAlign: 'right', fontWeight: '600', color: '#059669'}}>
                  ₹{parseFloat(item.line_total || 0).toFixed(2)}
                </div>
              </div>
            ))}
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '2px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: '700'
            }}>
              <span>Total:</span>
              <span style={{color: '#059669', fontSize: '16px'}}>
                ₹{parseFloat(po.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {po.delivery_notes && (
          <div style={styles.notes}>
            <strong>Notes:</strong> {po.delivery_notes}
          </div>
        )}
      </div>

      <div style={styles.poFooter}>
        {!po.has_invoice && (
          <button
            onClick={() => onCreateInvoice(po)}
            style={{...styles.submitQuoteBtn, backgroundColor: '#10B981'}}
          >
            📄 Create Invoice
          </button>
        )}
        <button
          onClick={() => onUpdateStatus(po)}
          style={styles.updateBtn}
          disabled={po.delivery_status === 'delivered'}
        >
          Update Delivery Status
        </button>
      </div>
    </div>
  );
}

function InvoicesTab({ invoices, onUpload }) {
  const [filter, setFilter] = useState('all');

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return inv.status === 'pending';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const handleDownloadInvoice = (invoice) => {
    window.open(`${API_BASE_URL}/invoices/${invoice.id}/download/`, '_blank');
  };

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2>Invoices ({invoices.length})</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Invoices</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div style={styles.invoicesGrid}>
        {filteredInvoices.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            onUpload={onUpload}
            onDownload={handleDownloadInvoice}
          />
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <p style={styles.noData}>No invoices found.</p>
      )}
    </div>
  );
}


function QuotationModal({ rfq, onClose, onSuccess }) {
  const requestDetails = rfq.purchase_request_details || {};
  
  const [formData, setFormData] = useState({
    unit_price: '',
    quantity: requestDetails.quantity || 1,
    tax_rate: 18,
    shipping_cost: 0,
    estimated_delivery_days: 7,
    quotation_valid_until: '',
    payment_terms: 'Net 30',
    warranty_terms: '',
    additional_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const csrfToken = getCsrfToken();
      
      const res = await fetch(
        `${API_BASE_URL}/vendor-dashboard/${rfq.id}/submit_quotation/`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        alert('Quotation submitted successfully!');
        onSuccess();
      } else {
        const data = await res.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to submit quotation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Submit Quotation</h2>
        <p style={styles.modalSubtitle}>
          RFQ #{rfq.rfq_number} - {requestDetails.item_name}
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Unit Price * (₹)
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: e.target.value })
                }
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Quantity *
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                style={styles.input}
                required
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>
              Tax Rate (%)
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) =>
                  setFormData({ ...formData, tax_rate: e.target.value })
                }
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Shipping Cost (₹)
              <input
                type="number"
                step="0.01"
                value={formData.shipping_cost}
                onChange={(e) =>
                  setFormData({ ...formData, shipping_cost: e.target.value })
                }
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>
              Delivery Days *
              <input
                type="number"
                value={formData.estimated_delivery_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_delivery_days: e.target.value,
                  })
                }
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Valid Until *
              <input
                type="date"
                value={formData.quotation_valid_until}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quotation_valid_until: e.target.value,
                  })
                }
                style={styles.input}
                required
              />
            </label>
          </div>

          <label style={styles.label}>
            Payment Terms
            <input
              type="text"
              value={formData.payment_terms}
              onChange={(e) =>
                setFormData({ ...formData, payment_terms: e.target.value })
              }
              style={styles.input}
              placeholder="e.g., Net 30"
            />
          </label>

          <label style={styles.label}>
            Warranty Terms
            <textarea
              value={formData.warranty_terms}
              onChange={(e) =>
                setFormData({ ...formData, warranty_terms: e.target.value })
              }
              style={{ ...styles.input, minHeight: '60px' }}
              placeholder="Optional warranty information"
            />
          </label>

          <label style={styles.label}>
            Additional Notes
            <textarea
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData({ ...formData, additional_notes: e.target.value })
              }
              style={{ ...styles.input, minHeight: '60px' }}
              placeholder="Any additional information"
            />
          </label>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Quotation'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryStatusModal({ po, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    delivery_status: po.delivery_status || 'pending',
    shipment_date: po.shipment_date || '',
    tracking_number: po.tracking_number || '',
    delivery_notes: po.delivery_notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const csrfToken = getCsrfToken();
      
      const res = await fetch(
        `${API_BASE_URL}/vendor-dashboard/${po.id}/update_delivery_status/`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        if (formData.delivery_status === 'delivered' && !po.has_invoice) {
          await autoCreateInvoice(po);
        }
        
        alert('Delivery status updated successfully!');
        onSuccess();
      } else {
        const data = await res.json();
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to update status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const autoCreateInvoice = async (purchaseOrder) => {
    try {
      const csrfToken = getCsrfToken();
      
      const invoiceData = {
        invoice_number: `INV-${Date.now()}`,
        purchase_order: purchaseOrder.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: parseFloat(purchaseOrder.subtotal || 0),
        tax_amount: parseFloat(purchaseOrder.tax_amount || 0),
        total_amount: parseFloat(purchaseOrder.total_amount || 0),
        notes: 'Auto-generated invoice upon delivery confirmation',
        status: 'pending'
      };

      const res = await fetch(`${API_BASE_URL}/vendor-dashboard/create_invoice/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(invoiceData),
      });

      if (res.ok) {
        console.log('✅ Invoice auto-created successfully');
      }
    } catch (err) {
      console.error('Failed to auto-create invoice:', err);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Update Delivery Status</h2>
        <p style={styles.modalSubtitle}>PO #{po.po_number}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Delivery Status *
            <select
              value={formData.delivery_status}
              onChange={(e) =>
                setFormData({ ...formData, delivery_status: e.target.value })
              }
              style={styles.input}
              required
            >
              <option value="pending">Pending Shipment</option>
              <option value="shipped">Shipped</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
            </select>
          </label>

          <label style={styles.label}>
            Shipment Date
            <input
              type="date"
              value={formData.shipment_date}
              onChange={(e) =>
                setFormData({ ...formData, shipment_date: e.target.value })
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Tracking Number
            <input
              type="text"
              value={formData.tracking_number}
              onChange={(e) =>
                setFormData({ ...formData, tracking_number: e.target.value })
              }
              style={styles.input}
              placeholder="Enter tracking number"
            />
          </label>

          <label style={styles.label}>
            Delivery Notes
            <textarea
              value={formData.delivery_notes}
              onChange={(e) =>
                setFormData({ ...formData, delivery_notes: e.target.value })
              }
              style={{ ...styles.input, minHeight: '80px' }}
              placeholder="Add any notes about the delivery..."
            />
          </label>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Updating...' : 'Update Status'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ FIXED: Invoice Upload Modal with CSRF Token
function InvoiceUploadModal({ invoice, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('invoice_file', file);

      // ✅ Get CSRF token from cookie
      const csrfToken = getCsrfToken();

      const res = await fetch(
        `${API_BASE_URL}/vendor-dashboard/${invoice.id}/upload_invoice/`,
        {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken, // ✅ Add CSRF token
          },
          body: formData,
          credentials: 'include',
        }
      );

      if (res.ok) {
        alert('Invoice uploaded successfully!');
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || JSON.stringify(data));
      }
    } catch (err) {
      setError('Failed to upload invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Upload Invoice</h2>
        <p style={styles.modalSubtitle}>Invoice #{invoice.invoice_number}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Select Invoice File (PDF/Excel) *
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files[0])}
              style={styles.fileInput}
              required
            />
          </label>

          {file && (
            <p style={styles.fileName}>
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Invoice'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceCreateModal({ po, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    invoice_number: `INV-${Date.now()}`,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const csrfToken = getCsrfToken();
      
      const payload = {
        invoice_number: formData.invoice_number,
        purchase_order: po.id,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        subtotal: parseFloat(po.subtotal || 0),
        tax_amount: parseFloat(po.tax_amount || 0),
        total_amount: parseFloat(po.total_amount || 0),
        notes: formData.notes,
        status: 'pending'
      };

      console.log('Sending invoice payload:', payload);

      const res = await fetch(`${API_BASE_URL}/vendor-dashboard/create_invoice/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (res.ok) {
        alert('Invoice created successfully!');
        onSuccess();
      } else {
        console.error('Server error response:', data);
        setError(data.error || JSON.stringify(data));
      }
    } catch (err) {
      console.error('Exception:', err);
      setError('Failed to create invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.invoice_date) {
      const invoiceDate = new Date(formData.invoice_date);
      invoiceDate.setDate(invoiceDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        due_date: invoiceDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.invoice_date]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Create Invoice</h2>
        <p style={styles.modalSubtitle}>
          PO #{po.po_number} - ₹{parseFloat(po.total_amount || 0).toFixed(2)}
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Invoice Number *
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              style={styles.input}
              required
            />
          </label>

          <div style={styles.formRow}>
            <label style={styles.label}>
              Invoice Date *
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Due Date *
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={styles.input}
                required
              />
            </label>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#F0F9FF',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h4 style={{margin: '0 0 12px 0', fontSize: '14px'}}>Invoice Summary</h4>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
              <span>Subtotal:</span>
              <span>₹{parseFloat(po.subtotal || 0).toFixed(2)}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
              <span>Tax:</span>
              <span>₹{parseFloat(po.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #0369A1'}}>
              <strong>Total:</strong>
              <strong style={{color: '#059669'}}>₹{parseFloat(po.total_amount || 0).toFixed(2)}</strong>
            </div>
          </div>

          <label style={styles.label}>
            Notes
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{...styles.input, minHeight: '80px'}}
              placeholder="Add any notes about this invoice..."
            />
          </label>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceCard({ invoice, onUpload, onDownload }) {
  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (showPayments && invoice.id) {
      fetchPayments();
    }
  }, [showPayments, invoice.id]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/payments/?invoice=${invoice.id}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      approved: '#3B82F6',
      paid: '#10B981',
      overdue: '#EF4444',
      cancelled: '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const isOverdue = () => {
    if (invoice.status === 'paid') return false;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    return dueDate < today;
  };

  return (
    <div style={styles.invoiceCard}>
      <div style={styles.invoiceHeader}>
        <div>
          <h3 style={styles.invoiceNumber}>
            {invoice.invoice_number}
          </h3>
          <p style={styles.invoiceDate}>
            Created: {new Date(invoice.invoice_date).toLocaleDateString()}
          </p>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: getStatusColor(
              isOverdue() && invoice.status === 'pending' ? 'overdue' : invoice.status
            ),
          }}
        >
          {isOverdue() && invoice.status === 'pending' ? 'OVERDUE' : invoice.status.toUpperCase()}
        </span>
      </div>

      <div style={styles.invoiceBody}>
        <div style={styles.invoiceInfo}>
          <p style={styles.infoRow}>
  <strong>PO Number:</strong>{' '}
  {invoice.po_number || invoice.purchase_order?.po_number || invoice.po_number_display || 'N/A'}
</p>
          <p style={styles.infoRow}>
            <strong>Amount:</strong>{' '}
            <span style={{ fontSize: '20px', color: '#059669', fontWeight: '700' }}>
              ₹{parseFloat(invoice.total_amount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
          <p style={styles.infoRow}>
            <strong>Due Date:</strong>{' '}
            <span style={{ color: isOverdue() ? '#EF4444' : '#374151', fontWeight: '600' }}>
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
          </p>
          {invoice.paid_amount > 0 && (
            <>
              <p style={styles.infoRow}>
                <strong>Paid Amount:</strong>{' '}
                <span style={{color: '#10B981', fontWeight: '600'}}>
                  ₹{parseFloat(invoice.paid_amount).toLocaleString('en-IN')}
                </span>
              </p>
              <p style={styles.infoRow}>
                <strong>Balance Due:</strong>{' '}
                <span style={{color: '#EF4444', fontWeight: '600'}}>
                  ₹{(parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount)).toLocaleString('en-IN')}
                </span>
              </p>
            </>
          )}
        </div>

        {/* Payment History Button */}
        <button
          onClick={() => setShowPayments(!showPayments)}
          style={{
            ...styles.expandBtn,
            marginTop: '12px',
            color: '#059669'
          }}
        >
          {showPayments ? '▲ Hide Payment History' : '▼ Show Payment History'}
        </button>

        {/* Payment History */}
        {showPayments && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px'
          }}>
            <h4 style={{margin: '0 0 12px 0', fontSize: '14px', color: '#374151'}}>
              💰 Payment History
            </h4>
            {payments.length === 0 ? (
              <p style={{fontSize: '13px', color: '#9CA3AF', margin: 0}}>
                No payments recorded yet
              </p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB'
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                    <span style={{fontWeight: '600', color: '#059669'}}>
                      ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                    </span>
                    <span style={{fontSize: '12px', color: '#6B7280'}}>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{fontSize: '13px', color: '#6B7280'}}>
                    <strong>Method:</strong> {payment.payment_method === 'razorpay' ? '💳 Razorpay Online' : payment.payment_method.replace('_', ' ')}
                  </div>
                  {payment.transaction_reference && (
                    <div style={{fontSize: '12px', color: '#9CA3AF', marginTop: '4px'}}>
                      Ref: {payment.transaction_reference}
                    </div>
                  )}
                  {payment.notes && (
                    <div style={{fontSize: '12px', color: '#9CA3AF', marginTop: '4px'}}>
                      {payment.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {invoice.notes && (
          <div style={styles.invoiceNotes}>
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: invoice.invoice_file ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '6px',
          fontSize: '13px',
        }}>
          {invoice.invoice_file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#065F46' }}>✅ Invoice Uploaded</span>
              <a
                href={`http://localhost:8000${invoice.invoice_file}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#059669', textDecoration: 'none', fontWeight: '600' }}
              >
                View File
              </a>
            </div>
          ) : (
            <span style={{ color: '#92400E' }}>⚠️ Invoice file not uploaded</span>
          )}
        </div>
      </div>

      <div style={styles.invoiceFooter}>
        <button
          onClick={() => onDownload(invoice)}
          style={{
            ...styles.actionBtn,
            backgroundColor: '#3B82F6',
            flex: 1,
          }}
        >
          📥 Download PDF
        </button>
        {!invoice.invoice_file && (
          <button
            onClick={() => onUpload(invoice)}
            style={{
              ...styles.actionBtn,  
              backgroundColor: '#10B981',
              flex: 1,
            }}
          >
            📤 Upload File
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f7fa' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px' },
  header: { backgroundColor: 'white', padding: '20px 40px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  title: { fontSize: '24px', margin: '0 0 5px 0', color: '#333' },
  subtitle: { margin: 0, color: '#666', fontSize: '14px' },
  logoutBtn: { padding: '10px 24px', backgroundColor: '#4b0f09', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', position: 'absolute', right: '40px' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', padding: '30px 40px' },
  statCard: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', gap: '15px', alignItems: 'center' },
  statIcon: { fontSize: '36px' },
  statTitle: { fontSize: '14px', color: '#373535', margin: '0 0 8px 0', textTransform: 'uppercase' },
  statValue: { fontSize: '32px', fontWeight: 'bold', color: '#0a1547', margin: 0 },
  tabs: { backgroundColor: 'white', padding: '0 40px', display: 'flex', gap: '20px', borderBottom: '1px solid #eee' },
  tab: { padding: '15px 20px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontWeight: '500', color: '#666' },
  tabActive: { padding: '15px 20px', background: 'none', border: 'none', borderBottom: '3px solid #13246d', cursor: 'pointer', fontWeight: '500', color: '#1e2d6f' },
  content: { padding: '40px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#333', margin: 0 },
  filterSelect: { padding: '10px 15px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  refreshBtn: { padding: '10px 20px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' },
  poCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  poHeader: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'start' },
  poNumber: { fontSize: '18px', fontWeight: '600', margin: '0 0 5px 0', color: '#333' },
  poDate: { margin: 0, fontSize: '13px', color: '#999' },
  statusBadge: { padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: 'white', textTransform: 'uppercase' },
  poBody: { padding: '20px' },
  poInfo: { marginBottom: '15px' },
  infoRow: { margin: '8px 0', fontSize: '14px', color: '#374151' },
  expandBtn: { width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#667eea', marginTop: '10px' },
  itemsList: { marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' },
  itemsTitle: { fontSize: '14px', margin: '0 0 10px 0', color: '#666', textTransform: 'uppercase' },
  detailSection: { marginTop: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', fontSize: '14px' },
  detailText: { margin: '6px 0 0 0', color: '#6B7280', lineHeight: '1.5' },
  quotationInfo: { marginTop: '15px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', fontSize: '13px', color: '#1E40AF' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' },
  notes: { marginTop: '15px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '13px', color: '#856404' },
  poFooter: { padding: '15px 20px', borderTop: '1px solid #eee', backgroundColor: '#f8f9fa' },
  submitQuoteBtn: { width: '100%', padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '15px' },
  updateBtn: { width: '100%', padding: '12px', backgroundColor: '#263266', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  tableContainer: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333', fontSize: '13px', textTransform: 'uppercase', backgroundColor: '#f8f9fa', whiteSpace: 'nowrap' },
  td: { padding: '15px', borderTop: '1px solid #eee', fontSize: '14px', color: '#666' },
  statusPaid: { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: '#d4edda', color: '#155724', textTransform: 'uppercase' },
  statusPending: { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: '#fff3cd', color: '#856404', textTransform: 'uppercase' },
  fileLink: { color: '#242f61', textDecoration: 'none', fontWeight: '500' },
  uploadBtn: { padding: '8px 16px', backgroundColor: '#212a53', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  noData: { textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' },
  modalSubtitle: { fontSize: '14px', color: '#999', margin: '5px 0 20px 0' },
  label: { display: 'block', marginBottom: '20px', fontSize: '14px', fontWeight: '500', color: '#333' },
  input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', marginTop: '8px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  fileInput: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', marginTop: '8px' },
  fileName: { fontSize: '13px', color: '#362f2f', marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' },
  formActions: { display: 'flex', gap: '10px', marginTop: '25px' },
  submitBtn: { flex: 1, padding: '12px', background: '#1c223d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  cancelBtn: { flex: 1, padding: '12px', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  error: { padding: '12px', background: '#fee', color: '#c33', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' },
  invoicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' },
  invoiceCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' },
  invoiceHeader: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'start' },
  invoiceNumber: { fontSize: '18px', fontWeight: '600', margin: '0 0 5px 0', color: '#333' },
  invoiceDate: { margin: 0, fontSize: '13px', color: '#999' },
  invoiceBody: { padding: '20px' },
  invoiceInfo: { marginBottom: '15px' },
  invoiceNotes: { marginTop: '12px', padding: '12px', backgroundColor: '#F3F4F6', borderRadius: '6px', fontSize: '13px', color: '#374151' },
  invoiceFooter: { padding: '15px 20px', borderTop: '1px solid #eee', backgroundColor: '#F9FAFB', display: 'flex', gap: '10px' },
  actionBtn: { padding: '12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
};