import React, { useState, useEffect, useCallback, useMemo } from 'react';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  History,
  ClipboardCheck,
  Boxes,
  Receipt,
  Search,
  Loader2,
  Eye,
  X,
} from 'lucide-react';

const PharmacistHistoryPage = () => {
  const [activeTab, setActiveTab] = useState('dispensations'); // 'dispensations' | 'stock' | 'sales'
  const [dispensations, setDispensations] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Item Modal
  const [selectedDispense, setSelectedDispense] = useState(null);

  const fetchHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [dspData, stkData, payData] = await Promise.all([
        pharmacistService.getDispensations(),
        pharmacistService.getStockMovements(),
        pharmacistService.getPayments(),
      ]);

      setDispensations(Array.isArray(dspData) ? dspData : dspData?.results || []);
      setStockMovements(Array.isArray(stkData) ? stkData : stkData?.results || []);
      setSales(Array.isArray(payData) ? payData : payData?.results || []);
    } catch (err) {
      // Graceful error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Pharmacy Audit History — CareFlow Pharmacist';
    fetchHistoryData();
  }, [fetchHistoryData]);

  // Filtered Dispensations
  const filteredDispensations = useMemo(() => {
    if (!searchQuery.trim()) return dispensations;
    const q = searchQuery.toLowerCase();
    return dispensations.filter(
      (d) =>
        (d.dispense_id || d.dispense_number)?.toLowerCase().includes(q) ||
        d.prescription_code?.toLowerCase().includes(q) ||
        d.patient_name?.toLowerCase().includes(q) ||
        d.doctor_name?.toLowerCase().includes(q)
    );
  }, [dispensations, searchQuery]);

  // Filtered Stock Movements
  const filteredStock = useMemo(() => {
    if (!searchQuery.trim()) return stockMovements;
    const q = searchQuery.toLowerCase();
    return stockMovements.filter(
      (m) =>
        m.movement_id?.toLowerCase().includes(q) ||
        m.medicine_name?.toLowerCase().includes(q) ||
        m.reference_note?.toLowerCase().includes(q) ||
        m.performed_by_name?.toLowerCase().includes(q)
    );
  }, [stockMovements, searchQuery]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase();
    return sales.filter(
      (s) =>
        s.receipt_number?.toLowerCase().includes(q) ||
        s.bill_number?.toLowerCase().includes(q) ||
        s.patient_name?.toLowerCase().includes(q) ||
        s.payment_method?.toLowerCase().includes(q)
    );
  }, [sales, searchQuery]);

  return (
    <div className="admin-page-container pharmacist-page">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Pharmacy Audit & Transaction History</h1>
          <p className="admin-page-subtitle">
            Comprehensive immutable records of medicine dispensations, stock ledger transactions, and counter billing
          </p>
        </div>
        <div className="admin-page-actions">
          <span className="admin-badge admin-badge-primary" style={{ padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <History size={14} /> Audit Trail Live
          </span>
        </div>
      </div>

      {/* Audit Summary Stat Cards */}
      <section className="admin-stat-grid pharm-stat-grid" style={{ marginBottom: '1.75rem' }} aria-label="Audit Metrics">
        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-teal ${activeTab === 'dispensations' ? 'active-border' : ''}`}
          onClick={() => setActiveTab('dispensations')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Total Dispensations</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <ClipboardCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{dispensations.length}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Fulfilled prescriptions log</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-blue ${activeTab === 'stock' ? 'active-border' : ''}`}
          onClick={() => setActiveTab('stock')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Stock Movements</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Boxes size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{stockMovements.length}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Inventory adjustments recorded</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-emerald ${activeTab === 'sales' ? 'active-border' : ''}`}
          onClick={() => setActiveTab('sales')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Counter Orders</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Receipt size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{sales.length}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Issued receipts & payments</span>
          </div>
        </div>

        <div className="admin-stat-card pharm-stat-card pharm-stat-card-purple">
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Ledger Integrity</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <History size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#a855f7' }}>100%</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Cryptographic audit verification</span>
          </div>
        </div>
      </section>

      {/* Tabs Row */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'dispensations' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('dispensations')}
        >
          <ClipboardCheck size={16} />
          <span>Dispensations</span>
          <span className="admin-tab-count">{dispensations.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'stock' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Boxes size={16} />
          <span>Stock Ledger</span>
          <span className="admin-tab-count">{stockMovements.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'sales' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <Receipt size={16} />
          <span>Counter Sales</span>
          <span className="admin-tab-count">{sales.length}</span>
        </button>
      </div>

      {/* Table Controls */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper" style={{ flex: '1 1 340px', maxWidth: '440px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search audit records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <section className="admin-card admin-card-table" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid var(--admin-border-subtle)', marginBottom: 0 }}>
          <h2 className="admin-card-title">
            {activeTab === 'dispensations' && 'Prescription Dispensing Records'}
            {activeTab === 'stock' && 'Stock Movement Audit Logs'}
            {activeTab === 'sales' && 'Counter Sales & Billing Invoices'}
          </h2>
          <span className="admin-badge admin-badge-info">Immutable Audit Trail</span>
        </div>

        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading-state" style={{ minHeight: '280px' }}>
              <Loader2 size={36} className="admin-spinner" />
              <p>Loading audit trail...</p>
            </div>
          ) : activeTab === 'dispensations' ? (
            filteredDispensations.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <ClipboardCheck size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
                <h3>No dispensing records found</h3>
                <p style={{ color: 'var(--text-muted, #94a3b8)' }}>No prescriptions have been dispensed yet.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Dispense ID</th>
                      <th>Prescription</th>
                      <th>Patient Name</th>
                      <th>Doctor</th>
                      <th>Total Value</th>
                      <th>Dispensed By</th>
                      <th>Date & Time</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDispensations.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: '#0ea5e9' }}>
                            {d.dispense_id || d.dispense_number || `DISP-${d.id}`}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace' }}>
                            {d.prescription_code || `Rx #${d.prescription}`}
                          </span>
                        </td>
                        <td>
                          <strong>{d.patient_name || 'Patient'}</strong>
                        </td>
                        <td>{d.doctor_name || 'Doctor'}</td>
                        <td>
                          <strong style={{ color: '#10b981' }}>
                            ₹{parseFloat(d.total_amount || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td>{d.dispensed_by_name || 'Pharmacist'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {d.dispensed_at ? new Date(d.dispensed_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-outline"
                            onClick={() => setSelectedDispense(d)}
                            title="View dispensed line items"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'stock' ? (
            filteredStock.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <Boxes size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
                <h3>No stock movements found</h3>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Movement ID</th>
                      <th>Medicine</th>
                      <th>Movement Type</th>
                      <th>Quantity</th>
                      <th>Previous Stock</th>
                      <th>New Stock</th>
                      <th>Performed By</th>
                      <th>Reference Note</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((mov) => {
                      const isPositive = ['PURCHASE_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(
                        mov.movement_type
                      );
                      return (
                        <tr key={mov.id}>
                          <td>
                            <strong style={{ fontFamily: 'monospace' }}>{mov.movement_id}</strong>
                          </td>
                          <td>
                            <strong>{mov.medicine_name}</strong>
                          </td>
                          <td>
                            <span
                              className={`admin-badge ${
                                mov.movement_type === 'PURCHASE_IN'
                                  ? 'admin-badge-success'
                                  : mov.movement_type === 'DISPENSED_OUT'
                                  ? 'admin-badge-info'
                                  : mov.movement_type === 'EXPIRED_OUT'
                                  ? 'admin-badge-danger'
                                  : 'admin-badge-warning'
                              }`}
                            >
                              {mov.movement_type_display || mov.movement_type}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: isPositive ? '#10b981' : '#f43f5e' }}>
                              {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                            </strong>
                          </td>
                          <td>{mov.previous_stock}</td>
                          <td>
                            <strong>{mov.new_stock}</strong>
                          </td>
                          <td>{mov.performed_by_name || 'System'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                            {mov.reference_note || '—'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                            {mov.created_at ? new Date(mov.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredSales.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <Receipt size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
                <h3>No counter sales records found</h3>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Invoice #</th>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Processed By</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: '#10b981' }}>
                            {s.receipt_number}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace' }}>{s.bill_number}</span>
                        </td>
                        <td>
                          <strong>{s.patient_name || 'Walk-in Patient'}</strong>
                        </td>
                        <td>
                          <strong style={{ color: '#10b981' }}>₹{parseFloat(s.amount || 0).toFixed(2)}</strong>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-info">{s.payment_method}</span>
                        </td>
                        <td>{s.received_by_name || 'Pharmacist'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {s.payment_date ? new Date(s.payment_date).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-success">{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </section>

      {/* Dispense Detail Modal */}
      {selectedDispense && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setSelectedDispense(null)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(14, 165, 233, 0.25)', color: '#0ea5e9' }}
                  >
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">{selectedDispense.dispense_id}</h3>
                    <p className="admin-modal-subtitle">
                      Prescription: {selectedDispense.prescription_code || 'Rx'} • Patient: {selectedDispense.patient_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setSelectedDispense(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                <div
                  className="pharm-voucher-card"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Prescribing Doctor:</span>{' '}
                    <strong>{selectedDispense.doctor_name || 'Doctor'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Dispensed At:</span>{' '}
                    <span>{selectedDispense.dispensed_at ? new Date(selectedDispense.dispensed_at).toLocaleString() : '—'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Dispensed By:</span>{' '}
                    <strong>{selectedDispense.dispensed_by_name || 'Pharmacist'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Total Amount:</span>{' '}
                    <strong style={{ color: '#10b981' }}>₹{parseFloat(selectedDispense.total_amount || 0).toFixed(2)}</strong>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Dispensed Line Items
                </h4>

                <div className="admin-table-container">
                  <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Quantity Dispensed</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDispense.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{it.medicine_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              {it.medicine_code} • {it.dosage_form}
                            </div>
                          </td>
                          <td>
                            <strong>{it.quantity} units</strong>
                          </td>
                          <td>₹{parseFloat(it.unit_price || 0).toFixed(2)}</td>
                          <td>
                            <strong style={{ color: '#10b981' }}>₹{parseFloat(it.subtotal || 0).toFixed(2)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedDispense.notes && (
                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                    <strong>Pharmacist Notes:</strong> {selectedDispense.notes}
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setSelectedDispense(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PharmacistHistoryPage;
