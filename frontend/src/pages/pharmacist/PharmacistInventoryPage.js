import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Pill,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Boxes,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const DOSAGE_FORMS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'SYRUP', label: 'Syrup' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'OINTMENT', label: 'Ointment' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'OTHER', label: 'Other' },
];

const INITIAL_MEDICINE_FORM = {
  name: '',
  generic_name: '',
  brand_name: '',
  dosage_form: 'TABLET',
  strength: '',
  unit_price: '',
  stock_quantity: '0',
  reorder_level: '20',
  manufacturer: '',
  batch_number: '',
  expiry_date: '',
};

const PharmacistInventoryPage = () => {
  const location = useLocation();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL | HIGH | NORMAL | LOW | OUT | NEAR_EXPIRY | EXPIRED
  const [dosageFilter, setDosageFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_MEDICINE_FORM);
  const [addErrors, setAddErrors] = useState({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteRestriction, setDeleteRestriction] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Quick Restock modal
  const [restockMedicine, setRestockMedicine] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('50');
  const [restockBatch, setRestockBatch] = useState('');
  const [restockExpiry, setRestockExpiry] = useState('');
  const [restockNote, setRestockNote] = useState('Inventory Restock Order');
  const [isRestocking, setIsRestocking] = useState(false);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacistService.getMedicines({ search: searchQuery, is_active: true });
      setMedicines(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load medicine catalogue.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'Medicines Stock — CareFlow Pharmacist';
    fetchMedicines();
  }, [fetchMedicines]);

  // Check URL query parameters for direct modal open
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setIsAddModalOpen(true);
    }
    const filterParam = params.get('filter');
    if (filterParam) {
      setStockFilter(filterParam.toUpperCase());
    }
  }, [location.search]);

  // Keyboard navigation & modal lock
  useEffect(() => {
    const anyOpen =
      isAddModalOpen ||
      isDetailsModalOpen ||
      isEditModalOpen ||
      isDeleteModalOpen ||
      Boolean(restockMedicine);

    if (anyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsDetailsModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setRestockMedicine(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [
    isAddModalOpen,
    isDetailsModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    restockMedicine,
  ]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    return medicines.filter((med) => {
      // Exclude archived/inactive items from active inventory catalogue
      if (med.is_active === false) {
        return false;
      }

      // Dosage Form filter
      if (dosageFilter !== 'ALL' && med.dosage_form !== dosageFilter) {
        return false;
      }

      const qty = parseInt(med.stock_quantity, 10) || 0;
      const reorder = parseInt(med.reorder_level, 10) || 10;
      const expDate = med.expiry_date ? new Date(med.expiry_date) : null;

      // Stock / Expiry category filter
      if (stockFilter === 'OUT') {
        return qty === 0;
      }
      if (stockFilter === 'LOW') {
        return qty > 0 && (med.is_low_stock || qty <= reorder);
      }
      if (stockFilter === 'NORMAL') {
        return qty > reorder && qty <= reorder * 3;
      }
      if (stockFilter === 'HIGH') {
        return qty > Math.max(100, reorder * 3);
      }
      if (stockFilter === 'NEAR_EXPIRY') {
        return expDate && expDate >= today && expDate <= thirtyDaysLater;
      }
      if (stockFilter === 'EXPIRED') {
        return expDate && expDate < today;
      }

      return true;
    });
  }, [medicines, stockFilter, dosageFilter]);

  // Handle Add Medicine Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddErrors({});

    const errors = {};
    if (!addForm.name.trim()) errors.name = 'Medicine name is required.';
    if (!addForm.dosage_form) errors.dosage_form = 'Dosage form is required.';
    if (!addForm.strength.trim()) errors.strength = 'Strength (e.g. 500mg) is required.';
    if (addForm.unit_price === '' || parseFloat(addForm.unit_price) < 0) {
      errors.unit_price = 'Unit price must be non-negative.';
    }
    if (addForm.stock_quantity === '' || parseInt(addForm.stock_quantity, 10) < 0) {
      errors.stock_quantity = 'Stock quantity cannot be negative.';
    }
    if (addForm.reorder_level === '' || parseInt(addForm.reorder_level, 10) < 0) {
      errors.reorder_level = 'Reorder level cannot be negative.';
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const payload = {
        ...addForm,
        unit_price: parseFloat(addForm.unit_price).toFixed(2),
        stock_quantity: parseInt(addForm.stock_quantity, 10),
        reorder_level: parseInt(addForm.reorder_level, 10),
        expiry_date: addForm.expiry_date || null,
      };

      await pharmacistService.createMedicine(payload);
      const msg = `Medicine "${addForm.name}" added successfully.`;
      toast.success(msg, 'Medicine Created');
      setIsAddModalOpen(false);
      setAddForm(INITIAL_MEDICINE_FORM);
      fetchMedicines();
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        setAddErrors(d);
        toast.error('Please fix validation errors and try again.', 'Validation Error');
      } else {
        const msg = 'Failed to create medicine. Please verify the input.';
        toast.error(msg, 'Creation Failed');
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (med) => {
    setSelectedMedicine(med);
    setEditForm({
      name: med.name || '',
      generic_name: med.generic_name || '',
      brand_name: med.brand_name || '',
      dosage_form: med.dosage_form || 'TABLET',
      strength: med.strength || '',
      unit_price: med.unit_price || '',
      stock_quantity: String(med.stock_quantity ?? '0'),
      reorder_level: String(med.reorder_level ?? '20'),
      manufacturer: med.manufacturer || '',
      batch_number: med.batch_number || '',
      expiry_date: med.expiry_date || '',
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrors({});

    const errors = {};
    if (!editForm.name.trim()) errors.name = 'Medicine name is required.';
    if (!editForm.strength.trim()) errors.strength = 'Strength is required.';
    if (editForm.unit_price === '' || parseFloat(editForm.unit_price) < 0) {
      errors.unit_price = 'Unit price must be non-negative.';
    }
    if (editForm.stock_quantity === '' || parseInt(editForm.stock_quantity, 10) < 0) {
      errors.stock_quantity = 'Stock quantity cannot be negative.';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        ...editForm,
        unit_price: parseFloat(editForm.unit_price).toFixed(2),
        stock_quantity: parseInt(editForm.stock_quantity, 10),
        reorder_level: parseInt(editForm.reorder_level, 10),
        expiry_date: editForm.expiry_date || null,
      };

      await pharmacistService.updateMedicine(selectedMedicine.id, payload);
      const msg = `Medicine "${editForm.name}" updated successfully.`;
      toast.success(msg, 'Medicine Updated');
      setIsEditModalOpen(false);
      fetchMedicines();
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        setEditErrors(d);
        toast.error('Please fix validation errors and try again.', 'Validation Error');
      } else {
        const msg = 'Failed to update medicine record.';
        toast.error(msg, 'Update Failed');
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Confirmed
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteRestriction(null);
    try {
      await pharmacistService.deleteMedicine(toDelete.id);
      const msg = `Medicine "${toDelete.name}" permanently deleted from inventory.`;
      toast.success(msg, 'Medicine Deleted');
      setIsDeleteModalOpen(false);
      setToDelete(null);
      fetchMedicines();
    } catch (err) {
      if (err.response?.data?.referenced || err.response?.status === 400) {
        setDeleteRestriction(
          err.response?.data?.error ||
          err.response?.data?.detail ||
          `Medicine '${toDelete.name}' cannot be deleted because it is referenced in clinical prescriptions, dispensations, billing invoices, or stock movement audit records.`
        );
      } else {
        const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete medicine.';
        setDeleteRestriction(msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Archive from Active Catalogue (safely deactivates from catalogue while preserving database audit history)
  const handleArchiveConfirm = async () => {
    if (!toDelete) return;
    setIsArchiving(true);
    try {
      await pharmacistService.updateMedicine(toDelete.id, { is_active: false });
      const msg = `Medicine "${toDelete.name}" has historical records and was safely archived from active catalogue.`;
      toast.info(msg, 'Medicine Archived');
      setIsDeleteModalOpen(false);
      setToDelete(null);
      setDeleteRestriction(null);
      fetchMedicines();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to archive medicine.';
      toast.error(msg, 'Archive Failed');
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle Quick Restock Submit
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockMedicine) return;

    const qty = parseInt(restockQuantity, 10);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid restock quantity greater than 0.', 'Invalid Quantity');
      return;
    }

    setIsRestocking(true);
    try {
      await pharmacistService.adjustStock(restockMedicine.id, {
        movement_type: 'PURCHASE_IN',
        quantity: qty,
        batch_number: restockBatch,
        expiry_date: restockExpiry || undefined,
        reference_note: restockNote || 'Quick inventory receive',
      });
      const msg = `Successfully received ${qty} units of ${restockMedicine.name}.`;
      toast.success(msg, 'Stock Replenished');
      setRestockMedicine(null);
      fetchMedicines();
    } catch (err) {
      let msg = 'Failed to receive stock.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toast.error(msg, 'Restock Failed');
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Medicines Stock Catalogue</h1>
          <p className="admin-page-subtitle">
            Manage pharmaceutical stock levels, real-time inventory, pricing, batch tracking, and catalogue
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setAddForm(INITIAL_MEDICINE_FORM);
              setAddErrors({});
              setIsAddModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add New Medicine</span>
          </button>
        </div>
      </div>

      {/* Page Loading Error Alert (only if initial load fails) */}
      {error && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{error}</span>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            style={{ marginLeft: 'auto' }}
            onClick={fetchMedicines}
          >
            Retry
          </button>
        </div>
      )}

      {/* Inventory Table Card with Integrated Search & Filter Controls */}
      <section className="admin-card admin-card-table" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid var(--admin-border-subtle)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={18} style={{ color: '#10b981' }} />
            <h2 className="admin-card-title">Catalogue Records</h2>
            <span className="admin-badge admin-badge-info" style={{ marginLeft: '0.5rem' }}>
              {filteredMedicines.length} of {medicines.length}
            </span>
          </div>
        </div>

        {/* Integrated Search & Filter Toolbar */}
        <div className="admin-search-toolbar">
          <div className="admin-search-wrapper">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by medicine name, code, brand, manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dosage Form Filter */}
          <div className="admin-toolbar-filter-group">
            <span className="admin-toolbar-label">Form:</span>
            <select
              className="admin-select"
              value={dosageFilter}
              onChange={(e) => setDosageFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Forms</option>
              {DOSAGE_FORMS.map((df) => (
                <option key={df.value} value={df.value}>
                  {df.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Category Filter Tabs */}
          <div className="admin-filter-pills-row">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'HIGH', label: 'High Stock' },
              { id: 'NORMAL', label: 'Normal Stock' },
              { id: 'LOW', label: 'Low Stock Alerts' },
              { id: 'OUT', label: 'Out of Stock' },
              { id: 'NEAR_EXPIRY', label: 'Near Expiry (≤30d)' },
              { id: 'EXPIRED', label: 'Expired' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-filter-pill ${stockFilter === tab.id ? 'active' : ''}`}
                onClick={() => setStockFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading-state" style={{ minHeight: '300px' }}>
              <Loader2 size={36} className="admin-spinner" />
              <p>Loading pharmacy catalogue records...</p>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: '3.5rem 1.5rem' }}>
              <Pill size={44} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No medicines found</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', maxWidth: '400px' }}>
                {searchQuery || stockFilter !== 'ALL' || dosageFilter !== 'ALL'
                  ? 'No medicines match the selected search criteria and filters.'
                  : 'Your pharmacy inventory catalogue is currently empty.'}
              </p>
              {(searchQuery || stockFilter !== 'ALL' || dosageFilter !== 'ALL') && (
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  style={{ marginTop: '1rem' }}
                  onClick={() => {
                    setSearchQuery('');
                    setStockFilter('ALL');
                    setDosageFilter('ALL');
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="admin-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Medicine Details</th>
                    <th>Form & Strength</th>
                    <th>Unit Price</th>
                    <th>Stock Status</th>
                    <th>Batch & Expiry</th>
                    <th>Manufacturer</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((med) => {
                    const qty = parseInt(med.stock_quantity, 10) || 0;
                    const reorder = parseInt(med.reorder_level, 10) || 10;
                    const isOut = qty <= 0;
                    const isLow = qty > 0 && (med.is_low_stock || qty <= reorder);
                    const isHigh = qty > Math.max(100, reorder * 3);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const thirtyDays = new Date(today);
                    thirtyDays.setDate(thirtyDays.getDate() + 30);
                    const exp = med.expiry_date ? new Date(med.expiry_date) : null;
                    const isExpired = exp && exp < today;
                    const isNearExp = exp && exp >= today && exp <= thirtyDays;

                    return (
                      <tr key={med.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                            {med.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                            Code: <span style={{ fontFamily: 'monospace' }}>{med.medicine_code}</span>
                            {med.generic_name && ` • Generic: ${med.generic_name}`}
                          </div>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-info">{med.dosage_form}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
                            {med.strength || 'Standard'}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-primary, #f1f5f9)' }}>
                            ₹{parseFloat(med.unit_price || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: isOut ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981',
                            }}
                          >
                            {qty} units
                          </div>
                          <div style={{ marginTop: '0.2rem' }}>
                            {isOut ? (
                              <span className="admin-badge admin-badge-danger">Out of Stock</span>
                            ) : isLow ? (
                              <span className="admin-badge admin-badge-warning">Low Stock (≤{reorder})</span>
                            ) : isHigh ? (
                              <span className="admin-badge admin-badge-info">High Stock</span>
                            ) : (
                              <span className="admin-badge admin-badge-success">Normal Stock</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary, #f1f5f9)' }}>
                            {med.batch_number ? `Batch: ${med.batch_number}` : 'No Batch'}
                          </div>
                          <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            {isExpired ? (
                              <span style={{ color: '#f43f5e', fontWeight: 600 }}>Expired: {med.expiry_date}</span>
                            ) : isNearExp ? (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Exp: {med.expiry_date}</span>
                            ) : med.expiry_date ? (
                              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Exp: {med.expiry_date}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>No Expiry Date</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{med.manufacturer || '—'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-outline"
                              onClick={() => {
                                setSelectedMedicine(med);
                                setIsDetailsModalOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              onClick={() => {
                                setRestockMedicine(med);
                                setRestockQuantity('50');
                                setRestockBatch(med.batch_number || '');
                                setRestockExpiry(med.expiry_date || '');
                                setRestockNote('Inventory Restock Order');
                              }}
                              title="Quick Restock"
                            >
                              <Boxes size={14} />
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-outline"
                              onClick={() => handleOpenEdit(med)}
                              title="Edit Medicine"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-danger"
                              onClick={() => {
                                setToDelete(med);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete or Archive Medicine"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* ─── ADD MEDICINE MODAL ────────────────────────────────────── */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
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
                    <h3 className="admin-modal-title">Add New Medicine</h3>
                    <p className="admin-modal-subtitle">Register new tablet or medication into hospital catalogue</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} noValidate>
                <div className="admin-modal-body">
                  <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="form-group">
                      <label className="form-label">Brand / Commercial Name *</label>
                      <input
                        type="text"
                        className={`form-input ${addErrors.name ? 'form-input-error' : ''}`}
                        placeholder="e.g. Paracetamol 500"
                        value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        required
                      />
                      {addErrors.name && <p className="field-error-msg">{addErrors.name}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Generic Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Acetaminophen"
                        value={addForm.generic_name}
                        onChange={(e) => setAddForm({ ...addForm, generic_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dosage Form *</label>
                      <select
                        className="admin-select"
                        value={addForm.dosage_form}
                        onChange={(e) => setAddForm({ ...addForm, dosage_form: e.target.value })}
                        required
                      >
                        {DOSAGE_FORMS.map((df) => (
                          <option key={df.value} value={df.value}>
                            {df.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Strength *</label>
                      <input
                        type="text"
                        className={`form-input ${addErrors.strength ? 'form-input-error' : ''}`}
                        placeholder="e.g. 500mg, 10ml"
                        value={addForm.strength}
                        onChange={(e) => setAddForm({ ...addForm, strength: e.target.value })}
                        required
                      />
                      {addErrors.strength && <p className="field-error-msg">{addErrors.strength}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-input ${addErrors.unit_price ? 'form-input-error' : ''}`}
                        placeholder="0.00"
                        value={addForm.unit_price}
                        onChange={(e) => setAddForm({ ...addForm, unit_price: e.target.value })}
                        required
                      />
                      {addErrors.unit_price && <p className="field-error-msg">{addErrors.unit_price}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Initial Stock Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        className={`form-input ${addErrors.stock_quantity ? 'form-input-error' : ''}`}
                        placeholder="0"
                        value={addForm.stock_quantity}
                        onChange={(e) => setAddForm({ ...addForm, stock_quantity: e.target.value })}
                        required
                      />
                      {addErrors.stock_quantity && (
                        <p className="field-error-msg">{addErrors.stock_quantity}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Low Stock Reorder Level *</label>
                      <input
                        type="number"
                        min="0"
                        className={`form-input ${addErrors.reorder_level ? 'form-input-error' : ''}`}
                        placeholder="20"
                        value={addForm.reorder_level}
                        onChange={(e) => setAddForm({ ...addForm, reorder_level: e.target.value })}
                        required
                      />
                      {addErrors.reorder_level && (
                        <p className="field-error-msg">{addErrors.reorder_level}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Manufacturer</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cipla Ltd."
                        value={addForm.manufacturer}
                        onChange={(e) => setAddForm({ ...addForm, manufacturer: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Batch Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. B-2026-01"
                        value={addForm.batch_number}
                        onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={addForm.expiry_date}
                        onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmittingAdd}
                  >
                    {isSubmittingAdd ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Add to Catalogue</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── EDIT MEDICINE MODAL ───────────────────────────────────── */}
      {isEditModalOpen && selectedMedicine && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(6, 182, 212, 0.25)', color: '#06b6d4' }}
                  >
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Edit Medicine Details</h3>
                    <p className="admin-modal-subtitle">
                      Updating {selectedMedicine.medicine_code} — {selectedMedicine.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} noValidate>
                <div className="admin-modal-body">
                  <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="form-group">
                      <label className="form-label">Brand Name *</label>
                      <input
                        type="text"
                        className={`form-input ${editErrors.name ? 'form-input-error' : ''}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                      {editErrors.name && <p className="field-error-msg">{editErrors.name}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Generic Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.generic_name}
                        onChange={(e) => setEditForm({ ...editForm, generic_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dosage Form *</label>
                      <select
                        className="admin-select"
                        value={editForm.dosage_form}
                        onChange={(e) => setEditForm({ ...editForm, dosage_form: e.target.value })}
                        required
                      >
                        {DOSAGE_FORMS.map((df) => (
                          <option key={df.value} value={df.value}>
                            {df.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Strength *</label>
                      <input
                        type="text"
                        className={`form-input ${editErrors.strength ? 'form-input-error' : ''}`}
                        value={editForm.strength}
                        onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
                        required
                      />
                      {editErrors.strength && <p className="field-error-msg">{editErrors.strength}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-input ${editErrors.unit_price ? 'form-input-error' : ''}`}
                        value={editForm.unit_price}
                        onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                        required
                      />
                      {editErrors.unit_price && <p className="field-error-msg">{editErrors.unit_price}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        className={`form-input ${editErrors.stock_quantity ? 'form-input-error' : ''}`}
                        value={editForm.stock_quantity}
                        onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })}
                        required
                      />
                      {editErrors.stock_quantity && (
                        <p className="field-error-msg">{editErrors.stock_quantity}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Reorder Level *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={editForm.reorder_level}
                        onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Manufacturer</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.manufacturer}
                        onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Batch Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.batch_number}
                        onChange={(e) => setEditForm({ ...editForm, batch_number: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editForm.expiry_date}
                        onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MEDICINE DETAILS MODAL ─────────────────────────────────── */}
      {isDetailsModalOpen && selectedMedicine && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsDetailsModalOpen(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(20, 184, 166, 0.25)', color: '#14b8a6' }}
                  >
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">{selectedMedicine.name}</h3>
                    <p className="admin-modal-subtitle">
                      {selectedMedicine.medicine_code} • {selectedMedicine.dosage_form}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Medicine Code
                    </span>
                    <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {selectedMedicine.medicine_code}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Generic Name
                    </span>
                    <p style={{ fontWeight: 600 }}>{selectedMedicine.generic_name || '—'}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Dosage Form & Strength
                    </span>
                    <p style={{ fontWeight: 600 }}>
                      {selectedMedicine.dosage_form} ({selectedMedicine.strength || 'Standard'})
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Unit Price
                    </span>
                    <p style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                      ₹{parseFloat(selectedMedicine.unit_price || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Available Stock
                    </span>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        color: selectedMedicine.stock_quantity <= 0 ? '#f43f5e' : '#10b981',
                      }}
                    >
                      {selectedMedicine.stock_quantity} units
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Reorder Threshold
                    </span>
                    <p style={{ fontWeight: 600 }}>{selectedMedicine.reorder_level} units</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Batch Number
                    </span>
                    <p style={{ fontWeight: 600 }}>{selectedMedicine.batch_number || '—'}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Expiry Date
                    </span>
                    <p style={{ fontWeight: 600 }}>{selectedMedicine.expiry_date || 'Not specified'}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Manufacturer
                    </span>
                    <p style={{ fontWeight: 600 }}>{selectedMedicine.manufacturer || '—'}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      Catalogue Status
                    </span>
                    <p>
                      {selectedMedicine.is_active ? (
                        <span className="admin-badge admin-badge-success">Active Catalogue</span>
                      ) : (
                        <span className="admin-badge admin-badge-danger">Archived / Inactive</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setRestockMedicine(selectedMedicine);
                    setRestockQuantity('50');
                    setRestockBatch(selectedMedicine.batch_number || '');
                    setRestockExpiry(selectedMedicine.expiry_date || '');
                  }}
                >
                  <Boxes size={15} />
                  <span>Receive Stock</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(selectedMedicine);
                  }}
                >
                  <Edit2 size={15} />
                  <span>Edit Record</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── QUICK RESTOCK MODAL ─────────────────────────────────────── */}
      {restockMedicine && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setRestockMedicine(null)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(59, 130, 246, 0.25)', color: '#3b82f6' }}
                  >
                    <Boxes size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Receive Stock Purchase</h3>
                    <p className="admin-modal-subtitle">
                      Receive inventory for {restockMedicine.name} ({restockMedicine.medicine_code})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setRestockMedicine(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRestockSubmit}>
                <div className="admin-modal-body">
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Current Stock:</span>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {restockMedicine.stock_quantity} units
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Projected Stock:</span>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>
                        {(parseInt(restockMedicine.stock_quantity, 10) || 0) +
                          (parseInt(restockQuantity, 10) || 0)}{' '}
                        units
                      </div>
                    </div>
                  </div>

                  <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label className="form-label">Units to Add *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={restockQuantity}
                        onChange={(e) => setRestockQuantity(e.target.value)}
                        placeholder="50"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Batch Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={restockBatch}
                        onChange={(e) => setRestockBatch(e.target.value)}
                        placeholder="e.g. B-2026-X"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={restockExpiry}
                        onChange={(e) => setRestockExpiry(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Reference / PO Note</label>
                      <input
                        type="text"
                        className="form-input"
                        value={restockNote}
                        onChange={(e) => setRestockNote(e.target.value)}
                        placeholder="Supplier invoice / PO number"
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={() => setRestockMedicine(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isRestocking}
                  >
                    {isRestocking ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Updating Stock...</span>
                      </>
                    ) : (
                      <span>Confirm Stock Addition</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── DELETE / ARCHIVE CONFIRMATION MODAL ─────────────────────── */}
      {isDeleteModalOpen && toDelete && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(244, 63, 94, 0.25)', color: '#f43f5e' }}
                  >
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Delete Medicine</h3>
                    <p className="admin-modal-subtitle">Confirm permanent removal of {toDelete.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                <p style={{ color: 'var(--text-primary, #f1f5f9)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Are you sure you want to delete <strong>{toDelete.name}</strong> (Code:{' '}
                  <code>{toDelete.medicine_code}</code>)?
                </p>

                {deleteRestriction ? (
                  <div
                    className="admin-alert admin-alert-warning"
                    style={{ marginTop: '0.85rem' }}
                  >
                    <AlertCircle size={18} className="admin-alert-icon" />
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                        Clinical & Financial Audit Restriction
                      </strong>
                      <span style={{ fontSize: '0.825rem' }}>
                        {deleteRestriction} Deletion is restricted to preserve medical and financial history. You can archive this medicine to remove it from the active stock catalogue.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <strong style={{ color: '#f43f5e' }}>Safe Deletion Protection:</strong> If this medicine is
                    linked to clinical prescriptions, dispensations, stock movements, or billing records, deletion
                    will be prevented by the database to preserve medical and financial audit integrity. If unreferenced,
                    it will be permanently deleted.
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteRestriction(null);
                  }}
                >
                  Cancel
                </button>
                {deleteRestriction ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleArchiveConfirm}
                    disabled={isArchiving}
                  >
                    {isArchiving ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Archiving...</span>
                      </>
                    ) : (
                      <span>Archive from Active Catalogue</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Checking References...</span>
                      </>
                    ) : (
                      <span>Confirm Removal</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PharmacistInventoryPage;
