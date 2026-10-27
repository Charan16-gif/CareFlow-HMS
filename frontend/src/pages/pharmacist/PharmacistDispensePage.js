import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  ClipboardCheck,
  Search,
  FileText,
  AlertCircle,
  Loader2,
  Receipt,
  Printer,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PharmacistDispensePage = () => {
  const location = useLocation();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | ALL | DISPENSED

  // Selection
  const [selectedRx, setSelectedRx] = useState(null);
  const [dispenseQuantities, setDispenseQuantities] = useState({});
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [createBill, setCreateBill] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Confirmation & Receipt Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedDispense, setCompletedDispense] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [formError, setFormError] = useState('');

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rxData = await pharmacistService.getPrescriptions();
      const rxList = Array.isArray(rxData) ? rxData : rxData?.results || [];

      setPrescriptions(rxList);

      // Pre-select if URL has prescriptionId
      const params = new URLSearchParams(location.search);
      const urlRxId = params.get('prescriptionId');
      if (urlRxId) {
        const found = rxList.find((r) => String(r.id) === String(urlRxId) || r.prescription_id === urlRxId);
        if (found) {
          selectPrescription(found);
        }
      }
    } catch (err) {
      let msg = 'Failed to load prescriptions for dispensing.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    document.title = 'Dispense Medicines — CareFlow Pharmacist';
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const selectPrescription = (rx) => {
    setSelectedRx(rx);
    setFormError('');

    // Pre-fill default dispense quantities to remaining prescribed
    const initialQtyMap = {};
    if (rx.items && Array.isArray(rx.items)) {
      rx.items.forEach((item) => {
        const remaining = (item.quantity_prescribed || 0) - (item.quantity_dispensed || 0);
        initialQtyMap[item.id] = Math.max(0, remaining);
      });
    }
    setDispenseQuantities(initialQtyMap);
  };

  const handleQtyChange = (itemId, val, maxAllowed) => {
    const parsed = parseInt(val, 10);
    const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, maxAllowed));
    setDispenseQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  // Filtered prescription list
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => {
      // Status filter
      if (statusFilter === 'PENDING' && rx.status === 'DISPENSED') {
        return false;
      }
      if (statusFilter === 'DISPENSED' && rx.status !== 'DISPENSED') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          rx.prescription_id?.toLowerCase().includes(q) ||
          rx.patient_name?.toLowerCase().includes(q) ||
          rx.doctor_name?.toLowerCase().includes(q) ||
          rx.diagnosis?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [prescriptions, statusFilter, searchQuery]);

  // Calculate items summary for dispensing
  const itemsSummary = useMemo(() => {
    if (!selectedRx || !selectedRx.items) return { itemsToDispense: [], grandTotal: 0, hasErrors: false };

    let total = 0;
    let hasStockError = false;
    const items = [];

    selectedRx.items.forEach((item) => {
      const qty = dispenseQuantities[item.id] || 0;
      if (qty > 0) {
        const unitPrice = parseFloat(item.medicine_unit_price || 0);
        const subtotal = unitPrice * qty;
        total += subtotal;

        const availableStock = item.medicine_stock ?? 0;
        const isInsufficient = availableStock < qty;
        if (isInsufficient) hasStockError = true;

        items.push({
          prescription_item: item.id,
          medicine_id: item.medicine,
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          quantity: qty,
          unit_price: unitPrice,
          subtotal,
          available_stock: availableStock,
          is_insufficient: isInsufficient,
        });
      }
    });

    return {
      itemsToDispense: items,
      grandTotal: total,
      hasStockError,
    };
  }, [selectedRx, dispenseQuantities]);

  // Handle open confirm modal
  const handleOpenConfirm = () => {
    setFormError('');
    if (itemsSummary.itemsToDispense.length === 0) {
      setFormError('Please enter a quantity greater than zero for at least one prescribed medicine.');
      return;
    }
    if (itemsSummary.hasStockError) {
      setFormError('One or more selected medicines has insufficient inventory stock in the pharmacy.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // Submit Dispensing to backend
  const handleConfirmDispense = async () => {
    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        prescription: selectedRx.id,
        items: itemsSummary.itemsToDispense.map((item) => ({
          prescription_item: item.prescription_item,
          quantity: item.quantity,
        })),
        notes: dispenseNotes.trim() || 'Dispensed at hospital pharmacy counter',
        create_bill: createBill,
        payment_method: paymentMethod,
      };

      const result = await pharmacistService.dispenseMedicines(payload);
      setCompletedDispense(result);
      setIsConfirmModalOpen(false);
      setIsReceiptModalOpen(true);
      const successMessage = `Prescription ${selectedRx.prescription_id} dispensed successfully! Reference: ${result.dispense_id}`;
      toast.success(successMessage, 'Medication Dispensed');

      // Refresh data
      await fetchPrescriptions();
      setSelectedRx(null);
    } catch (err) {
      let msg = 'Failed to dispense prescription. Please verify available stock.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      toast.error(msg, 'Dispensing Failed');
      setFormError(msg);
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-page-container pharmacist-page">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dispense Doctor Prescriptions</h1>
          <p className="admin-page-subtitle">
            Safely verify patient prescriptions, check live inventory stock, and dispense authorized medications
          </p>
        </div>
        <div className="admin-page-actions">
          <span className="admin-badge admin-badge-success" style={{ padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <ClipboardCheck size={14} /> Live Dispense Station
          </span>
        </div>
      </div>



      {formError && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{formError}</span>
          <button
            type="button"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setFormError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left side Prescriptions List, Right side Dispensing Form */}
      <div className="pharm-dispense-layout">
        {/* Left Column: Prescription Selection */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: '#06b6d4' }} />
              <h2 className="admin-card-title">Doctor Prescriptions</h2>
            </div>
            <span className="admin-badge admin-badge-info">{filteredPrescriptions.length}</span>
          </div>

          {/* Search & Status Filter */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))' }}>
            <div className="admin-search-wrapper" style={{ marginBottom: '0.75rem' }}>
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by Rx ID, patient, doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="admin-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className={`admin-filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending Dispense
              </button>
              <button
                type="button"
                className={`admin-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setStatusFilter('ALL')}
              >
                All Orders
              </button>
              <button
                type="button"
                className={`admin-filter-pill ${statusFilter === 'DISPENSED' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => setStatusFilter('DISPENSED')}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Prescription List */}
          <div className="admin-card-body" style={{ padding: 0, maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div className="admin-loading-state" style={{ minHeight: '200px' }}>
                <Loader2 size={32} className="admin-spinner" />
                <p>Loading prescription orders...</p>
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '2.5rem 1rem' }}>
                <FileText size={36} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
                <h4>No prescriptions found</h4>
                <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                  No doctor prescriptions match the current filter.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredPrescriptions.map((rx) => {
                  const isSelected = selectedRx?.id === rx.id;
                  const isFullyDispensed = rx.status === 'DISPENSED';

                  return (
                    <div
                      key={rx.id}
                      onClick={() => selectPrescription(rx)}
                      className={`pharm-rx-card ${isSelected ? 'selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') selectPrescription(rx);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0ea5e9', fontSize: '0.88rem' }}>
                          {rx.prescription_id}
                        </span>
                        <span
                          className={`admin-badge ${
                            isFullyDispensed
                              ? 'admin-badge-success'
                              : rx.status === 'PARTIALLY_DISPENSED'
                              ? 'admin-badge-warning'
                              : 'admin-badge-info'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', fontSize: '0.95rem' }}>
                        {rx.patient_name || 'Patient'}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
                        Prescribed by {rx.doctor_name || 'Doctor'}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.15rem' }}>
                        {rx.items?.length || 0} medicine items prescribed
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.35rem' }}>
                        {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Active Dispensing Workspace */}
        {selectedRx ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Dispense Workspace</h2>
                <span className="admin-card-subtitle">
                  Order Reference: {selectedRx.prescription_id}
                </span>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-outline"
                onClick={() => setSelectedRx(null)}
              >
                Close View
              </button>
            </div>

            <div className="admin-card-body" style={{ padding: '1.5rem' }}>
              {/* Patient & Doctor Banner */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Patient Name:</span>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary, #f1f5f9)' }}>
                    {selectedRx.patient_name}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Prescribing Doctor:</span>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary, #f1f5f9)' }}>
                    {selectedRx.doctor_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {selectedRx.doctor_specialization || selectedRx.doctor_department || 'General Medicine'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Diagnosis:</span>
                  <div style={{ fontWeight: 500, color: '#f59e0b' }}>
                    {selectedRx.diagnosis || 'Clinical evaluation'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Prescription Date:</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    {selectedRx.created_at ? new Date(selectedRx.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </div>

              {selectedRx.clinical_notes && (
                <div
                  style={{
                    background: 'rgba(14, 165, 233, 0.05)',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    marginBottom: '1.5rem',
                    color: 'var(--text-muted, #94a3b8)',
                  }}
                >
                  <strong style={{ color: '#0ea5e9' }}>Physician Instructions:</strong> {selectedRx.clinical_notes}
                </div>
              )}

              {/* Medicine Items Prescribed */}
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
                Prescribed Medications
              </h3>

              {(!selectedRx.items || selectedRx.items.length === 0) ? (
                <div className="admin-empty-state" style={{ padding: '2rem' }}>
                  <p>No medication line items recorded in this prescription.</p>
                </div>
              ) : (
                <div className="admin-table-container" style={{ marginBottom: '1.5rem' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage & Instructions</th>
                        <th>Prescribed / Dispensed</th>
                        <th>Pharmacy Stock</th>
                        <th>Unit Price</th>
                        <th>Dispense Units</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRx.items.map((item) => {
                        const remaining = (item.quantity_prescribed || 0) - (item.quantity_dispensed || 0);
                        const qty = dispenseQuantities[item.id] ?? remaining;
                        const unitPrice = parseFloat(item.medicine_unit_price || 0);
                        const subtotal = unitPrice * qty;
                        const stock = item.medicine_stock ?? 0;
                        const isInsufficient = stock < qty;
                        const isFullyDone = item.is_dispensed || remaining <= 0;

                        return (
                          <tr key={item.id} style={{ opacity: isFullyDone ? 0.6 : 1 }}>
                            <td>
                              <strong>{item.medicine_name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                                {item.medicine_dosage_form} • {item.medicine_strength || ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.dosage} ({item.frequency})</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                                {item.duration} {item.instructions ? `• ${item.instructions}` : ''}
                              </div>
                            </td>
                            <td>
                              <div>
                                <strong>{item.quantity_prescribed}</strong> prescribed
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                                {item.quantity_dispensed} already dispensed
                              </div>
                              <div style={{ fontSize: '0.75rem', color: remaining > 0 ? '#10b981' : 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                                {remaining} remaining
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: stock <= 0 ? '#f43f5e' : stock < qty ? '#f59e0b' : '#10b981',
                                }}
                              >
                                {stock} units
                              </span>
                              {isInsufficient && qty > 0 && (
                                <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 600 }}>
                                  Need {qty - stock} more!
                                </div>
                              )}
                            </td>
                            <td>
                              <strong>₹{unitPrice.toFixed(2)}</strong>
                            </td>
                            <td style={{ minWidth: '120px' }}>
                              {isFullyDone ? (
                                <span className="admin-badge admin-badge-success">Fully Dispensed</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  className="pharm-qty-input"
                                  value={qty}
                                  onChange={(e) => handleQtyChange(item.id, e.target.value, remaining)}
                                />
                              )}
                            </td>
                            <td>
                              <strong style={{ color: '#10b981' }}>
                                ₹{subtotal.toFixed(2)}
                              </strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dispense Options & Billing Toggle */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Dispensing Notes / Special Instructions</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dispenseNotes}
                    onChange={(e) => setDispenseNotes(e.target.value)}
                    placeholder="e.g. Advised to take with milk; patient instructed on course completion"
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createBill}
                      onChange={(e) => setCreateBill(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                      Automatically generate counter bill & collect payment
                    </span>
                  </label>

                  {createBill && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Payment Method:</span>
                      <select
                        className="admin-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ minWidth: '130px' }}
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI Payment</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="INSURANCE">Insurance</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Summary Bar & Action */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Total Dispense Value:
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                    ₹{itemsSummary.grandTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {itemsSummary.itemsToDispense.length} medicine item(s) selected
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleOpenConfirm}
                  disabled={itemsSummary.itemsToDispense.length === 0 || itemsSummary.hasStockError}
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                >
                  <ClipboardCheck size={18} />
                  <span>Confirm & Dispense Medicines</span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          !selectedRx && (
            <div
              className="admin-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
              }}
            >
              <ClipboardCheck size={48} style={{ color: '#0ea5e9', marginBottom: '1rem', opacity: 0.8 }} />
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Select a Prescription to Dispense</h2>
              <p style={{ color: 'var(--text-muted, #94a3b8)', maxWidth: '440px', lineHeight: 1.6 }}>
                Choose a pending prescription from the left list to review prescribed medicines, verify live stock
                availability, and execute the dispensing transaction.
              </p>
            </div>
          )
        )}
      </div>

      {/* ─── CONFIRM DISPENSING MODAL ───────────────────────────────── */}
      {isConfirmModalOpen && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsConfirmModalOpen(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                  >
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Confirm Prescription Dispense</h3>
                    <p className="admin-modal-subtitle">
                      Verify items for {selectedRx.patient_name} ({selectedRx.prescription_id})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsConfirmModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                <p style={{ marginBottom: '1rem', color: 'var(--text-primary, #f1f5f9)' }}>
                  You are about to dispense the following medications. Inventory stock will be atomically decremented:
                </p>

                <div className="admin-table-container" style={{ marginBottom: '1.25rem' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Qty to Dispense</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsSummary.itemsToDispense.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.medicine_name}</td>
                          <td>
                            <strong>{item.quantity} units</strong>
                          </td>
                          <td>₹{item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                  }}
                >
                  <span>Total Dispense Amount:</span>
                  <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                    ₹{itemsSummary.grandTotal.toFixed(2)}
                  </strong>
                </div>

                {createBill && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <strong style={{ color: '#10b981' }}>Counter Billing Enabled:</strong> An invoice and official payment
                    receipt (via {paymentMethod}) will be generated immediately upon confirmation.
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setIsConfirmModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleConfirmDispense}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="admin-spinner" />
                      <span>Dispensing...</span>
                    </>
                  ) : (
                    <span>Confirm & Deduct Stock</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── DISPENSE RECEIPT / SLIP MODAL ──────────────────────────── */}
      {isReceiptModalOpen && completedDispense && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsReceiptModalOpen(false)}>
            <div
              className="admin-modal-container"
              style={{ maxWidth: '600px' }}
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
                    <h3 className="admin-modal-title">Pharmacy Dispense Receipt</h3>
                    <p className="admin-modal-subtitle">Official CareFlow HMS Dispensing Voucher</p>
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

              <div className="admin-modal-body printable-receipt-area" id="printable-dispense-receipt">
                <div className="pharm-receipt-card">
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
                      CareFlow Hospital Pharmacy
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Accredited Healthcare Pharmacy Services • Dispensing Voucher
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Dispense ID:</span>{' '}
                      <strong>{completedDispense.dispense_id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Prescription:</span>{' '}
                      <strong>{completedDispense.prescription_code || 'Rx'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Patient:</span>{' '}
                      <strong>{completedDispense.patient_name || 'Patient'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Dispensed At:</span>{' '}
                      <span>{completedDispense.dispensed_at ? new Date(completedDispense.dispensed_at).toLocaleString() : ''}</span>
                    </div>
                    {completedDispense.receipt && (
                      <div>
                        <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Receipt Number:</span>{' '}
                        <strong style={{ color: '#10b981' }}>{completedDispense.receipt.receipt_number}</strong>
                      </div>
                    )}
                  </div>

                  {/* Dispensed Items Table */}
                  <div className="admin-table-container" style={{ marginBottom: '1rem' }}>
                    <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedDispense.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td>{it.medicine_name}</td>
                            <td>{it.quantity}</td>
                            <td>₹{parseFloat(it.unit_price || 0).toFixed(2)}</td>
                            <td>₹{parseFloat(it.subtotal || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Total Paid / Billed:</span>
                    <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>
                      ₹{parseFloat(completedDispense.total_amount || 0).toFixed(2)}
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
                  <span>Print Receipt Slip</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PharmacistDispensePage;
