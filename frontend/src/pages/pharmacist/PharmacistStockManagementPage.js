import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import {
  Boxes,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  X,
  History,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const MOVEMENT_TYPES = [
  { value: 'PURCHASE_IN', label: 'Purchase In (Receive Stock)', icon: ArrowDownRight, color: '#10b981' },
  { value: 'ADJUSTMENT_IN', label: 'Adjustment In (Audit Correction Up)', icon: Plus, color: '#06b6d4' },
  { value: 'ADJUSTMENT_OUT', label: 'Adjustment Out (Audit Correction Down)', icon: ArrowUpRight, color: '#f59e0b' },
  { value: 'RETURN_IN', label: 'Patient Return (Return In)', icon: RotateCcw, color: '#8b5cf6' },
  { value: 'EXPIRED_OUT', label: 'Expired / Discarded (Stock Write-Off)', icon: Trash2, color: '#f43f5e' },
];

const PharmacistStockManagementPage = () => {
  const location = useLocation();

  const [medicines, setMedicines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Operation Form State
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [movementType, setMovementType] = useState('PURCHASE_IN');
  const [quantity, setQuantity] = useState('50');
  const [referenceNote, setReferenceNote] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ledger Filter & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL');

  const [formErrors, setFormErrors] = useState({});

  const fetchMedicinesList = useCallback(async () => {
    try {
      const data = await pharmacistService.getMedicines({ is_active: true });
      const rawList = Array.isArray(data) ? data : data?.results || [];
      const list = rawList.filter((m) => m.is_active !== false);
      setMedicines(list);
      return list;
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, general: 'Failed to load medicine catalogue.' }));
      return [];
    }
  }, []);

  const fetchMovementsLedger = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await pharmacistService.getStockMovements();
      setMovements(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      // ledger error
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Stock Management & Audit Ledger — CareFlow Pharmacist';
    const init = async () => {
      const list = await fetchMedicinesList();
      await fetchMovementsLedger();

      // Pre-select medicine from URL param if available
      const params = new URLSearchParams(location.search);
      const medIdParam = params.get('medicineId');
      if (medIdParam && list.some((m) => String(m.id) === String(medIdParam))) {
        setSelectedMedicineId(medIdParam);
        const med = list.find((m) => String(m.id) === String(medIdParam));
        if (med) {
          setBatchNumber(med.batch_number || '');
          setExpiryDate(med.expiry_date || '');
        }
      } else if (list.length > 0) {
        setSelectedMedicineId(String(list[0].id));
        setBatchNumber(list[0].batch_number || '');
        setExpiryDate(list[0].expiry_date || '');
      }
    };
    init();
  }, [fetchMedicinesList, fetchMovementsLedger, location.search]);

  // When selected medicine changes, pre-fill batch and expiry
  const handleMedicineChange = (e) => {
    const medId = e.target.value;
    setSelectedMedicineId(medId);
    const med = medicines.find((m) => String(m.id) === String(medId));
    if (med) {
      setBatchNumber(med.batch_number || '');
      setExpiryDate(med.expiry_date || '');
    }
  };

  const currentMedicine = useMemo(() => {
    return medicines.find((m) => String(m.id) === String(selectedMedicineId)) || null;
  }, [medicines, selectedMedicineId]);

  // Projected stock calculation
  const projectedStock = useMemo(() => {
    if (!currentMedicine) return 0;
    const current = parseInt(currentMedicine.stock_quantity, 10) || 0;
    const qty = parseInt(quantity, 10) || 0;

    if (['PURCHASE_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(movementType)) {
      return current + qty;
    } else {
      return Math.max(0, current - qty);
    }
  }, [currentMedicine, quantity, movementType]);

  const isDeduction = ['ADJUSTMENT_OUT', 'EXPIRED_OUT'].includes(movementType);

  // Submit stock adjustment
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!selectedMedicineId) errors.medicine = 'Please select a medicine.';
    const qtyNum = parseInt(quantity, 10);
    if (!qtyNum || qtyNum <= 0) {
      errors.quantity = 'Quantity must be a positive integer greater than zero.';
    }

    if (currentMedicine && isDeduction && qtyNum > currentMedicine.stock_quantity) {
      errors.quantity = `Cannot deduct ${qtyNum} units. Only ${currentMedicine.stock_quantity} units available.`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        movement_type: movementType,
        quantity: qtyNum,
        reference_note: referenceNote.trim() || `Stock operation: ${movementType}`,
        batch_number: batchNumber.trim() || undefined,
        expiry_date: expiryDate || undefined,
      };

      const res = await pharmacistService.adjustStock(selectedMedicineId, payload);
      toast.success(res.message || 'Stock updated successfully.', 'Stock Updated');

      // Refresh data
      await fetchMedicinesList();
      await fetchMovementsLedger();

      // Reset form quantity
      setQuantity('50');
      setReferenceNote('');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update stock. Please try again.';
      setFormErrors({ general: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered ledger entries
  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      if (ledgerTypeFilter !== 'ALL' && mov.movement_type !== ledgerTypeFilter) {
        return false;
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const match =
          mov.movement_id?.toLowerCase().includes(q) ||
          mov.medicine_name?.toLowerCase().includes(q) ||
          mov.reference_note?.toLowerCase().includes(q) ||
          mov.performed_by_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [movements, ledgerTypeFilter, ledgerSearch]);

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Stock Management & Ledger</h1>
          <p className="admin-page-subtitle">
            Perform validated stock additions, audit adjustments, batch updates, and review immutable movement logs
          </p>
        </div>
        <div className="admin-page-actions">
          <span className="admin-badge admin-badge-info">
            <ShieldCheck size={14} />
            <span>Audit Verified</span>
          </span>
        </div>
      </div>



      {formErrors.general && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{formErrors.general}</span>
        </div>
      )}

      {/* Two Column Layout: Operation Form on left, Live Stock Status Card on right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Stock Operation Form */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes size={18} style={{ color: '#10b981' }} />
              <h2 className="admin-card-title">Stock Operation Entry</h2>
            </div>
            <span className="admin-badge admin-badge-info">Atomic Transaction</span>
          </div>

          <form onSubmit={handleStockSubmit} noValidate>
            <div className="admin-card-body" style={{ padding: '1.5rem' }}>
              {/* Select Medicine */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">Select Medicine *</label>
                <select
                  className="admin-select"
                  value={selectedMedicineId}
                  onChange={handleMedicineChange}
                  required
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.medicine_code}) — Available: {m.stock_quantity} units
                    </option>
                  ))}
                </select>
                {formErrors.medicine && <p className="field-error-msg">{formErrors.medicine}</p>}
              </div>

              {/* Movement Type */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">Operation / Movement Type *</label>
                <select
                  className="admin-select"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  required
                >
                  {MOVEMENT_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">
                  Units to {isDeduction ? 'Deduct' : 'Add'} *
                </label>
                <input
                  type="number"
                  min="1"
                  className={`form-input ${formErrors.quantity ? 'form-input-error' : ''}`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="50"
                  required
                />
                {formErrors.quantity && <p className="field-error-msg">{formErrors.quantity}</p>}
              </div>

              {/* Batch & Expiry Row */}
              <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. B-2026-X"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Reference Note */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Reason / Reference PO / Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="e.g. PO-8834 / Supplier delivery / Periodic audit reconciliation"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="admin-spinner" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Execute Stock Movement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Live Status & Projection Panel */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Inventory Impact Preview</h2>
            <span className="admin-badge admin-badge-success">Live Calculation</span>
          </div>
          <div className="admin-card-body" style={{ padding: '1.5rem' }}>
            {currentMedicine ? (
              <div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', marginBottom: '0.35rem' }}>
                    {currentMedicine.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '1rem' }}>
                    Code: <code>{currentMedicine.medicine_code}</code> • Form: {currentMedicine.dosage_form} • Strength: {currentMedicine.strength || 'Standard'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Current Available:</span>
                      <div
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          color: currentMedicine.stock_quantity <= 0 ? '#f43f5e' : '#10b981',
                        }}
                      >
                        {currentMedicine.stock_quantity} units
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Projected Result:</span>
                      <div
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          color: projectedStock <= 0 ? '#f43f5e' : '#06b6d4',
                        }}
                      >
                        {projectedStock} units
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: isDeduction ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${isDeduction ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: isDeduction ? '#f59e0b' : '#10b981' }}>Audit Guarantee:</strong>{' '}
                  This action creates an immutable historical ledger entry tied to your authenticated username.
                  Negative stock is strictly blocked by database level check constraints.
                </div>
              </div>
            ) : (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <p>Select a medicine from the form to view real-time inventory impact.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Stock Movements Audit Ledger Table */}
      <section className="admin-card admin-card-table" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid var(--admin-border-subtle)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: '#06b6d4' }} />
            <h2 className="admin-card-title">Stock Movement Audit Ledger</h2>
          </div>
          <span className="admin-badge admin-badge-info">{filteredMovements.length} Records</span>
        </div>

        {/* Ledger Filter Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="admin-search-wrapper" style={{ flex: '1 1 280px' }}>
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Filter ledger by reference ID, medicine name, note..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
            />
            {ledgerSearch && (
              <button
                type="button"
                className="admin-search-clear-btn"
                onClick={() => setLedgerSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Type:</span>
            <select
              className="admin-select"
              value={ledgerTypeFilter}
              onChange={(e) => setLedgerTypeFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="ALL">All Types</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
              <option value="DISPENSED_OUT">Dispensed to Patient</option>
            </select>
          </div>
        </div>

        <div className="admin-card-body" style={{ padding: 0 }}>
          {loadingMovements ? (
            <div className="admin-loading-state" style={{ minHeight: '260px' }}>
              <Loader2 size={36} className="admin-spinner" />
              <p>Loading historical stock movement records...</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: '3rem' }}>
              <History size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
              <h3>No stock movements found</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)' }}>
                {ledgerSearch || ledgerTypeFilter !== 'ALL'
                  ? 'No movements match the search or filter criteria.'
                  : 'No inventory movements have been logged yet.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Movement ID</th>
                    <th>Medicine</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Prev Stock</th>
                    <th>New Stock</th>
                    <th>Performed By</th>
                    <th>Reference / Note</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((mov) => {
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
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                            {mov.medicine_code}
                          </div>
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
                          <span
                            style={{
                              fontWeight: 700,
                              color: isPositive ? '#10b981' : '#f43f5e',
                            }}
                          >
                            {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`} units
                          </span>
                        </td>
                        <td>{mov.previous_stock}</td>
                        <td>
                          <strong>{mov.new_stock}</strong>
                        </td>
                        <td>
                          <span>{mov.performed_by_name || 'System'}</span>
                        </td>
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
          )}
        </div>
      </section>
    </div>
  );
};

export default PharmacistStockManagementPage;
