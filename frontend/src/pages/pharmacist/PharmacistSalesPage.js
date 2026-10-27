import React, { useState, useEffect, useCallback, useMemo } from 'react';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Printer,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'INSURANCE', label: 'Insurance' },
];

const PharmacistSalesPage = () => {
  const [payments, setPayments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Sale Modal
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [salePatientId, setSalePatientId] = useState('');
  const [saleMedicineId, setSaleMedicineId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [salePaymentMethod, setSalePaymentMethod] = useState('CASH');
  const [saleNotes, setSaleNotes] = useState('Counter OTC purchase');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleErrors, setSaleErrors] = useState({});

  // Receipt View Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);


  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payData, medData, ptData] = await Promise.all([
        pharmacistService.getPayments(),
        pharmacistService.getMedicines({ is_active: true }),
        pharmacistService.getPatients(),
      ]);

      const payList = Array.isArray(payData) ? payData : payData?.results || [];
      const rawMedList = Array.isArray(medData) ? medData : medData?.results || [];
      const medList = rawMedList.filter((m) => m.is_active !== false);
      const ptList = Array.isArray(ptData) ? ptData : ptData?.results || [];

      // Filter to payments that have medicine items or pharmacy purchases
      setPayments(payList);
      setMedicines(medList);
      setPatients(ptList);

      if (medList.length > 0 && !saleMedicineId) {
        setSaleMedicineId(String(medList[0].id));
      }
      if (ptList.length > 0 && !salePatientId) {
        setSalePatientId(String(ptList[0].id));
      }
    } catch (err) {
      let msg = 'Failed to load pharmacy sales & receipt records.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [saleMedicineId, salePatientId]);

  useEffect(() => {
    document.title = 'Pharmacy Sales & Receipts — CareFlow Pharmacist';
    fetchSalesData();
  }, [fetchSalesData]);

  const selectedMed = useMemo(() => {
    return medicines.find((m) => String(m.id) === String(saleMedicineId)) || null;
  }, [medicines, saleMedicineId]);

  const saleTotal = useMemo(() => {
    if (!selectedMed) return 0;
    const qty = parseInt(saleQuantity, 10) || 0;
    return parseFloat(selectedMed.unit_price || 0) * qty;
  }, [selectedMed, saleQuantity]);

  // Handle New Sale Submit
  const handleNewSaleSubmit = async (e) => {
    e.preventDefault();
    setSaleErrors({});

    const errors = {};
    if (!salePatientId) errors.patient = 'Please select a patient.';
    if (!saleMedicineId) errors.medicine = 'Please select a medicine.';
    const qty = parseInt(saleQuantity, 10);
    if (!qty || qty <= 0) errors.quantity = 'Quantity must be greater than zero.';

    if (selectedMed && qty > selectedMed.stock_quantity) {
      errors.quantity = `Insufficient stock for ${selectedMed.name}. Only ${selectedMed.stock_quantity} units available.`;
    }

    if (Object.keys(errors).length > 0) {
      setSaleErrors(errors);
      return;
    }

    setIsSubmittingSale(true);
    try {
      const payload = {
        patient_id: salePatientId,
        medicine_id: saleMedicineId,
        quantity: qty,
        payment_method: salePaymentMethod,
        notes: saleNotes.trim() || 'Pharmacy Counter Sale',
      };

      const result = await pharmacistService.checkoutPurchase(payload);
      toast.success(`Sale completed! Receipt #${result.receipt?.receipt_number || ''} generated.`, 'Sale Completed');
      setIsNewSaleOpen(false);

      if (result.receipt) {
        setSelectedReceipt(result.receipt);
        setIsReceiptModalOpen(true);
      }

      await fetchSalesData();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to process sale. Please check available stock.';
      setSaleErrors({ general: errMsg });
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Method filter
      if (methodFilter !== 'ALL' && p.payment_method !== methodFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.receipt_number?.toLowerCase().includes(q) ||
          p.bill_number?.toLowerCase().includes(q) ||
          p.patient_name?.toLowerCase().includes(q) ||
          p.transaction_reference?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, searchQuery]);

  const salesStats = useMemo(() => {
    let totalRevenue = 0;
    let cashCount = 0;
    let digitalCount = 0;

    payments.forEach((p) => {
      const amt = parseFloat(p.paid_amount || p.amount || 0);
      totalRevenue += amt;
      if (p.payment_method === 'CASH') cashCount += 1;
      else digitalCount += 1;
    });

    return {
      totalRevenue,
      totalCount: payments.length,
      cashCount,
      digitalCount,
    };
  }, [payments]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-page-container pharmacist-page">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Pharmacy Sales, Billing & Receipts</h1>
          <p className="admin-page-subtitle">
            Manage pharmacy counter transactions, generate official receipts, and review billing records
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setSaleErrors({});
              setIsNewSaleOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Counter Sale</span>
          </button>
        </div>
      </div>



      {error && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Sales Summary Stat Cards */}
      <section className="admin-stat-grid pharm-stat-grid" style={{ marginBottom: '1.75rem' }} aria-label="Sales Metrics">
        <div className="admin-stat-card pharm-stat-card pharm-stat-card-teal">
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Total Sales</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Receipt size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{salesStats.totalCount}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Counter billing transactions</span>
          </div>
        </div>

        <div className="admin-stat-card pharm-stat-card pharm-stat-card-emerald">
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Total Revenue</span>
            <div className="admin-stat-icon-box pharm-stat-icon" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
              ₹
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#10b981' }}>
            <span>₹ </span>{salesStats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Validated payments collected</span>
          </div>
        </div>

        <div className="admin-stat-card pharm-stat-card pharm-stat-card-cyan">
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Cash Orders</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Receipt size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{salesStats.cashCount}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Over-the-counter currency</span>
          </div>
        </div>

        <div className="admin-stat-card pharm-stat-card pharm-stat-card-purple">
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">Digital & UPI</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Receipt size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{salesStats.digitalCount}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>UPI, card & bank transactions</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="admin-search-wrapper" style={{ flex: '1 1 320px', maxWidth: '440px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search receipts by receipt #, invoice #, patient..."
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Method:</span>
            <select
              className="admin-select"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ minWidth: '130px' }}
            >
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Status:</span>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '120px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <section className="admin-card admin-card-table" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid var(--admin-border-subtle)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={18} style={{ color: '#10b981' }} />
            <h2 className="admin-card-title">Pharmacy Transactions & Invoices</h2>
          </div>
          <span className="admin-badge admin-badge-info">{filteredPayments.length} Records</span>
        </div>

        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading-state" style={{ minHeight: '260px' }}>
              <Loader2 size={36} className="admin-spinner" />
              <p>Loading pharmacy billing transactions...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: '3rem' }}>
              <Receipt size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
              <h3>No transactions found</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)' }}>
                {searchQuery || methodFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No receipts match the search filters.'
                  : 'No pharmacy transactions have been recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Invoice / Bill #</th>
                    <th>Patient Name</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Date & Time</th>
                    <th>Processed By</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#10b981' }}>
                          {pay.receipt_number}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace' }}>{pay.bill_number}</span>
                      </td>
                      <td>
                        <strong>{pay.patient_name || 'Walk-in Patient'}</strong>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary, #f1f5f9)' }}>
                          ₹{parseFloat(pay.amount || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-info">{pay.payment_method}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                        {pay.payment_date ? new Date(pay.payment_date).toLocaleString() : '—'}
                      </td>
                      <td>
                        <span>{pay.received_by_name || 'Pharmacist'}</span>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            pay.status === 'SUCCESS' ? 'admin-badge-success' : 'admin-badge-danger'
                          }`}
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-outline"
                          onClick={() => {
                            setSelectedReceipt(pay);
                            setIsReceiptModalOpen(true);
                          }}
                          title="View Official Receipt"
                        >
                          <Eye size={14} />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── NEW COUNTER SALE MODAL ─────────────────────────────────── */}
      {isNewSaleOpen && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsNewSaleOpen(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                  >
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">New Pharmacy Counter Sale</h3>
                    <p className="admin-modal-subtitle">
                      Process OTC or prescription medicine checkout and collect payment
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsNewSaleOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleNewSaleSubmit} noValidate>
                <div className="admin-modal-body">
                  {saleErrors.general && (
                    <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
                      <AlertCircle size={18} className="status-alert-icon" />
                      <span>{saleErrors.general}</span>
                    </div>
                  )}

                  {/* Patient Selection */}
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label className="form-label">Select Patient *</label>
                    <select
                      className="admin-select"
                      value={salePatientId}
                      onChange={(e) => setSalePatientId(e.target.value)}
                      required
                    >
                      {patients.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.full_name} ({pt.patient_id}) • Phone: {pt.phone_number || 'None'}
                        </option>
                      ))}
                    </select>
                    {saleErrors.patient && <p className="field-error-msg">{saleErrors.patient}</p>}
                  </div>

                  {/* Medicine Selection */}
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label className="form-label">Select Medicine *</label>
                    <select
                      className="admin-select"
                      value={saleMedicineId}
                      onChange={(e) => setSaleMedicineId(e.target.value)}
                      required
                    >
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.medicine_code}) — ₹{parseFloat(m.unit_price || 0).toFixed(2)} | Stock: {m.stock_quantity}
                        </option>
                      ))}
                    </select>
                    {saleErrors.medicine && <p className="field-error-msg">{saleErrors.medicine}</p>}
                  </div>

                  <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.2rem' }}>
                    {/* Quantity */}
                    <div className="form-group">
                      <label className="form-label">Quantity to Purchase *</label>
                      <input
                        type="number"
                        min="1"
                        className={`form-input ${saleErrors.quantity ? 'form-input-error' : ''}`}
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(e.target.value)}
                        required
                      />
                      {saleErrors.quantity && <p className="field-error-msg">{saleErrors.quantity}</p>}
                    </div>

                    {/* Payment Method */}
                    <div className="form-group">
                      <label className="form-label">Payment Method *</label>
                      <select
                        className="admin-select"
                        value={salePaymentMethod}
                        onChange={(e) => setSalePaymentMethod(e.target.value)}
                        required
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm.value} value={pm.value}>
                            {pm.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Transaction Reference / Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      value={saleNotes}
                      onChange={(e) => setSaleNotes(e.target.value)}
                      placeholder="e.g. Counter sale, UPI reference number"
                    />
                  </div>

                  {/* Pricing Impact Preview */}
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Calculated Total:</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                        ₹{saleTotal.toFixed(2)}
                      </div>
                    </div>
                    {selectedMed && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Remaining Stock:</span>
                        <div style={{ fontWeight: 600 }}>
                          {(parseInt(selectedMed.stock_quantity, 10) || 0) - (parseInt(saleQuantity, 10) || 0)} units
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={() => setIsNewSaleOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmittingSale}
                  >
                    {isSubmittingSale ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Processing Sale...</span>
                      </>
                    ) : (
                      <span>Complete Sale & Issue Receipt</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── RECEIPT DISPLAY MODAL ──────────────────────────────────── */}
      {isReceiptModalOpen && selectedReceipt && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsReceiptModalOpen(false)}>
            <div
              className="admin-modal-container"
              style={{ maxWidth: '580px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header no-print">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                  >
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Payment Receipt #{selectedReceipt.receipt_number}</h3>
                    <p className="admin-modal-subtitle">Official CareFlow HMS Billing Document</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsReceiptModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body printable-receipt-area" id="official-printable-receipt">
                <div className="pharm-receipt-card">
                  {/* Brand Header */}
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px dashed var(--admin-border-subtle)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
                      CareFlow Hospital Management System
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
                      Main Pharmacy & Outpatient Services • Official Cash Receipt
                    </p>
                  </div>

                  {/* Transaction Metadata */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Receipt Number:</span>{' '}
                      <strong style={{ color: '#10b981' }}>{selectedReceipt.receipt_number}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Invoice / Bill:</span>{' '}
                      <strong>{selectedReceipt.bill_number}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Patient Name:</span>{' '}
                      <strong>{selectedReceipt.patient_name || 'Walk-in Patient'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Date & Time:</span>{' '}
                      <span>{selectedReceipt.payment_date ? new Date(selectedReceipt.payment_date).toLocaleString() : ''}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Payment Method:</span>{' '}
                      <strong>{selectedReceipt.payment_method}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Payment Status:</span>{' '}
                      <span className="admin-badge admin-badge-success">{selectedReceipt.status}</span>
                    </div>
                  </div>

                  {/* Line Items if available */}
                  {selectedReceipt.bill_items && selectedReceipt.bill_items.length > 0 && (
                    <div className="admin-table-container" style={{ marginBottom: '1.25rem' }}>
                      <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.bill_items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.description}</td>
                              <td>{it.quantity}</td>
                              <td>₹{parseFloat(it.unit_price || 0).toFixed(2)}</td>
                              <td>₹{parseFloat(it.subtotal || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.15))',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Total Amount Paid:</span>
                    <strong style={{ fontSize: '1.35rem', color: '#10b981' }}>
                      ₹{parseFloat(selectedReceipt.amount || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer no-print">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setIsReceiptModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handlePrint}
                >
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PharmacistSalesPage;
