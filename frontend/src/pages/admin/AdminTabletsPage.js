import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Pill,
  Search,
  Eye,
  AlertCircle,
  Loader2,
  X,
  AlertTriangle,
  PackageCheck,
} from 'lucide-react';

const AdminTabletsPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('active'); // 'active' | 'all' | 'deactivated'

  // View Details Modal
  const [viewMedicine, setViewMedicine] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Freeze background scrolling while modal is open
  useEffect(() => {
    if (isViewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isViewModalOpen]);

  // Handle ESC key to dismiss active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isViewModalOpen) setIsViewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewModalOpen]);

  const fetchMedicines = useCallback(async (search = searchQuery, tab = statusTab) => {
    setLoading(true);
    setError(null);
    try {
      let activeParam = true;
      if (tab === 'all') activeParam = 'ALL';
      else if (tab === 'deactivated') activeParam = false;

      const data = await adminService.getMedicines(search, activeParam);
      setMedicines(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load pharmacy medicines inventory.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusTab]);

  useEffect(() => {
    document.title = 'Pharmacy Tablets & Inventory — CareFlow HMS Admin';
    fetchMedicines(searchQuery, statusTab);
  }, [fetchMedicines, searchQuery, statusTab]);

  const handleTabChange = (newTab) => {
    setStatusTab(newTab);
  };

  // Open View Details
  const handleOpenView = (med) => {
    setViewMedicine(med);
    setIsViewModalOpen(true);
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Pharmacy Tablets & Medicines</h2>
          <p className="admin-page-subtitle">
            Audit hospital dispensary stocks, unit pricing, batch tracking, and catalogue items (View-Only Inventory Audit)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`admin-tab-btn ${statusTab === 'active' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => handleTabChange('active')}
        >
          <span>Active Catalogue</span>
          {statusTab === 'active' && (
            <span className="admin-tab-count">{medicines.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusTab === 'all' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <span>All Medicines</span>
          {statusTab === 'all' && (
            <span className="admin-tab-count">{medicines.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${statusTab === 'deactivated' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => handleTabChange('deactivated')}
        >
          <span>Deactivated / Archived</span>
          {statusTab === 'deactivated' && (
            <span className="admin-tab-count">{medicines.length}</span>
          )}
        </button>
      </div>

      {/* Search & Refresh */}
      <div className="admin-table-controls">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by brand name, generic formula, or dosage form..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchMedicines(searchQuery, statusTab);
            }}
          />
        </div>
        <div className="admin-table-record-count">
          Showing {medicines.length} records
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading pharmacy medicine records...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Tablets</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={() => fetchMedicines(searchQuery, statusTab)}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (medicines || []).length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <Pill size={32} />
          </div>
          <h3>No Tablets Found in Inventory</h3>
          <p>
            {searchQuery
              ? `No medicines match "${searchQuery}". Try a different keyword.`
              : statusTab === 'deactivated'
                ? 'No deactivated or archived medicines found.'
                : 'The pharmacy inventory has no medicines registered yet.'}
          </p>
        </div>
      )}

      {/* Inventory Table */}
      {!loading && !error && medicines.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Pharmacy tablet inventory">
            <thead>
              <tr>
                <th scope="col">Code / ID</th>
                <th scope="col">Brand Name</th>
                <th scope="col">Generic / Form</th>
                <th scope="col">Strength</th>
                <th scope="col">Batch & Expiry</th>
                <th scope="col">Available Stock</th>
                <th scope="col">Unit Price</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => {
                const stockQty = parseInt(med.stock_quantity, 10) || 0;
                const reorderLvl = parseInt(med.reorder_level, 10) || 20;
                const isOutOfStock = stockQty <= 0;
                const isLowStock = !isOutOfStock && (med.is_low_stock || stockQty <= reorderLvl);

                return (
                  <tr key={med.id} style={{ opacity: med.is_active ? 1 : 0.65 }}>
                    <td className="admin-font-mono admin-font-semibold">
                      {med.medicine_code || `#${med.id}`}
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name font-semibold">{med.name}</span>
                        {med.manufacturer && (
                          <span className="admin-text-dim">{med.manufacturer}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <span>{med.generic_name || '—'}</span>
                        <span className="admin-badge admin-badge-slate">{med.dosage_form}</span>
                      </div>
                    </td>
                    <td className="admin-font-mono">{med.strength || '—'}</td>
                    <td>
                      <div className="admin-user-cell" style={{ fontSize: '0.8rem' }}>
                        <span>Batch: {med.batch_number || '—'}</span>
                        <span className="admin-text-dim">Exp: {med.expiry_date || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-stock-display">
                        <span className={`admin-stock-number ${isOutOfStock ? 'text-danger font-semibold' : isLowStock ? 'text-amber font-semibold' : ''}`}>
                          {stockQty.toLocaleString()} units
                        </span>
                        <span className="admin-reorder-hint">Threshold: {reorderLvl}</span>
                      </div>
                    </td>
                    <td className="admin-font-semibold">
                      ₹{parseFloat(med.unit_price || 0).toFixed(2)}
                    </td>
                    <td>
                      {!med.is_active ? (
                        <span className="admin-badge admin-badge-slate">
                          <span>Deactivated</span>
                        </span>
                      ) : isOutOfStock ? (
                        <span className="admin-badge admin-badge-red">
                          <AlertCircle size={11} />
                          <span>Out of Stock</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="admin-badge admin-badge-amber">
                          <AlertTriangle size={11} />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-green">
                          <PackageCheck size={11} />
                          <span>In Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="admin-action-btn-group">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-view"
                          onClick={() => handleOpenView(med)}
                          aria-label={`View details of ${med.name}`}
                          title="View Medicine Details"
                        >
                          <Eye size={15} />
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

      {/* ─────────────────────────────────────────────────────────────
          VIEW MEDICINE DETAILS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isViewModalOpen && viewMedicine && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsViewModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-modal-card-lg" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title">Medicine Specifications</h3>
                  <p className="admin-modal-subtitle">
                    Catalogue code: {viewMedicine.medicine_code || `#${viewMedicine.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsViewModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Brand / Trade Name</span>
                    <p className="font-semibold text-lg" style={{ marginTop: '0.25rem' }}>{viewMedicine.name}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Generic Formula</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>{viewMedicine.generic_name || '—'}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Dosage Form</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>{viewMedicine.dosage_form}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Strength</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>{viewMedicine.strength || '—'}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Manufacturer</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>{viewMedicine.manufacturer || '—'}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Batch Number</span>
                    <p className="font-semibold font-mono" style={{ marginTop: '0.25rem' }}>{viewMedicine.batch_number || '—'}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Expiry Date</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>{viewMedicine.expiry_date || '—'}</p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Unit Price</span>
                    <p className="font-semibold text-lg text-emerald-400" style={{ marginTop: '0.25rem' }}>
                      ₹{parseFloat(viewMedicine.unit_price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Current Stock</span>
                    <p className="font-semibold text-lg" style={{ marginTop: '0.25rem' }}>
                      {viewMedicine.stock_quantity} units
                    </p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Reorder Threshold</span>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>
                      {viewMedicine.reorder_level} units
                    </p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Status</span>
                    <p style={{ marginTop: '0.25rem' }}>
                      {viewMedicine.is_active ? (
                        <span className="admin-badge admin-badge-green">Active in Catalogue</span>
                      ) : (
                        <span className="admin-badge admin-badge-slate">Deactivated</span>
                      )}
                    </p>
                  </div>
                  <div className="admin-detail-block">
                    <span className="admin-text-dim text-xs font-semibold uppercase">Registered On</span>
                    <p className="font-semibold text-sm" style={{ marginTop: '0.25rem' }}>
                      {viewMedicine.created_at ? new Date(viewMedicine.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsViewModalOpen(false)}
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

export default AdminTabletsPage;
