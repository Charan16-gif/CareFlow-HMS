import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  AlertTriangle,
  PackageCheck,
  PackageX,
  CalendarClock,
  Boxes,
  Pill,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PharmacistStockStatusPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL'); // ALL | LOW | OUT | NEAR_EXPIRY | EXPIRED | HIGH | NORMAL

  // Quick Restock modal
  const [restockMedicine, setRestockMedicine] = useState(null);
  const [restockQty, setRestockQty] = useState('50');
  const [restockBatch, setRestockBatch] = useState('');
  const [restockExpiry, setRestockExpiry] = useState('');
  const [restockNote, setRestockNote] = useState('Emergency Stock replenishment');
  const [isRestocking, setIsRestocking] = useState(false);

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacistService.getMedicines({ is_active: true });
      const raw = Array.isArray(data) ? data : data?.results || [];
      setMedicines(raw.filter((m) => m.is_active !== false));
    } catch (err) {
      let msg = 'Failed to load stock data.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Stock Status & Alerts — CareFlow Pharmacist';
    fetchStockData();
  }, [fetchStockData]);

  // Read URL filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam) {
      const upper = filterParam.toUpperCase();
      if (['LOW', 'OUT', 'NEAR_EXPIRY', 'EXPIRED', 'HIGH', 'NORMAL', 'ALL'].includes(upper)) {
        setActiveCategory(upper);
      }
    }
  }, [location.search]);

  // Compute stock categorization counts
  const categorizedCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    let high = 0;
    let normal = 0;
    let low = 0;
    let out = 0;
    let nearExpiry = 0;
    let expired = 0;

    medicines.forEach((med) => {
      const qty = parseInt(med.stock_quantity, 10) || 0;
      const reorder = parseInt(med.reorder_level, 10) || 10;
      const exp = med.expiry_date ? new Date(med.expiry_date) : null;

      if (qty === 0) {
        out += 1;
      } else if (qty <= reorder || med.is_low_stock) {
        low += 1;
      } else if (qty > Math.max(100, reorder * 3)) {
        high += 1;
      } else {
        normal += 1;
      }

      if (exp) {
        if (exp < today) {
          expired += 1;
        } else if (exp <= thirtyDays) {
          nearExpiry += 1;
        }
      }
    });

    return {
      total: medicines.length,
      high,
      normal,
      low,
      out,
      nearExpiry,
      expired,
    };
  }, [medicines]);

  // Filter medicines by activeCategory and search
  const filteredList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    return medicines.filter((med) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          med.name?.toLowerCase().includes(q) ||
          med.medicine_code?.toLowerCase().includes(q) ||
          med.generic_name?.toLowerCase().includes(q) ||
          med.brand_name?.toLowerCase().includes(q);
        if (!match) return false;
      }

      const qty = parseInt(med.stock_quantity, 10) || 0;
      const reorder = parseInt(med.reorder_level, 10) || 10;
      const exp = med.expiry_date ? new Date(med.expiry_date) : null;

      if (activeCategory === 'OUT') return qty === 0;
      if (activeCategory === 'LOW') return qty > 0 && (med.is_low_stock || qty <= reorder);
      if (activeCategory === 'NORMAL') return qty > reorder && qty <= Math.max(100, reorder * 3);
      if (activeCategory === 'HIGH') return qty > Math.max(100, reorder * 3);
      if (activeCategory === 'NEAR_EXPIRY') return exp && exp >= today && exp <= thirtyDays;
      if (activeCategory === 'EXPIRED') return exp && exp < today;

      return true;
    });
  }, [medicines, activeCategory, searchQuery]);

  // Handle Restock Submit
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockMedicine) return;

    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid restock quantity.', 'Invalid Quantity');
      return;
    }

    setIsRestocking(true);
    try {
      await pharmacistService.adjustStock(restockMedicine.id, {
        movement_type: 'PURCHASE_IN',
        quantity: qty,
        batch_number: restockBatch,
        expiry_date: restockExpiry || undefined,
        reference_note: restockNote || 'Stock Status replenishment',
      });
      const msg = `Successfully received ${qty} units of ${restockMedicine.name}.`;
      toast.success(msg, 'Stock Replenished');
      setRestockMedicine(null);
      fetchStockData();
    } catch (err) {
      let msg = 'Failed to update stock.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toast.error(msg, 'Stock Update Failed');
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Stock Status & Health Alerts</h1>
          <p className="admin-page-subtitle">
            Continuous inventory monitoring, threshold tracking, and automated expiration warnings
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/pharmacist/stock-management')}
          >
            <Boxes size={16} />
            <span>Stock Management</span>
          </button>
        </div>
      </div>



      {error && (
        <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="status-alert-icon" />
          <span>{error}</span>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            style={{ marginLeft: 'auto' }}
            onClick={fetchStockData}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stock Threshold Definition Info Box */}
      <section
        style={{
          background: 'rgba(14, 165, 233, 0.08)',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start',
        }}
      >
        <Info size={20} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-main, #0f172a)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--admin-heading-color, #0f172a)' }}>
            Consistent Hospital Stock Classification Rules:
          </strong>
          <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
            <span>
              <strong style={{ color: '#f43f5e' }}>Out of Stock:</strong> 0 units
            </span>
            <span>
              <strong style={{ color: '#f59e0b' }}>Low Stock:</strong> 1 to Reorder Level (Default: 20 units)
            </span>
            <span>
              <strong style={{ color: '#10b981' }}>Normal Stock:</strong> &gt; Reorder Level up to 3× Reorder
            </span>
            <span>
              <strong style={{ color: '#06b6d4' }}>High Stock:</strong> &gt; 3× Reorder Level or &gt; 100 units
            </span>
            <span>
              <strong style={{ color: '#a855f7' }}>Near Expiry:</strong> Expiry date within 30 days
            </span>
            <span>
              <strong style={{ color: '#e11d48' }}>Expired:</strong> Expiry date in the past
            </span>
          </div>
        </div>
      </section>

      {/* Category Metric Badges */}
      <section className="admin-stat-grid pharm-stat-grid" style={{ marginBottom: '1.75rem' }} aria-label="Stock Status Categorization">
        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-teal ${activeCategory === 'ALL' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('ALL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('ALL');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title">All Items</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <Pill size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value">{categorizedCounts.total}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Complete catalogued inventory</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-rose ${activeCategory === 'OUT' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('OUT')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('OUT');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title" style={{ color: '#f43f5e' }}>Out of Stock</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <PackageX size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#f43f5e' }}>{categorizedCounts.out}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Zero units available</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-amber ${activeCategory === 'LOW' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('LOW')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('LOW');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title" style={{ color: '#f59e0b' }}>Low Stock</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#f59e0b' }}>{categorizedCounts.low}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>At or below reorder limit</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-emerald ${activeCategory === 'NORMAL' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('NORMAL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('NORMAL');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title" style={{ color: '#10b981' }}>Normal Stock</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#10b981' }}>{categorizedCounts.normal}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Adequate supply</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-purple ${activeCategory === 'NEAR_EXPIRY' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('NEAR_EXPIRY')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('NEAR_EXPIRY');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title" style={{ color: '#a855f7' }}>Near Expiry</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <CalendarClock size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#a855f7' }}>{categorizedCounts.nearExpiry}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Expiring within 30 days</span>
          </div>
        </div>

        <div
          className={`admin-stat-card pharm-stat-card pharm-stat-card-rose ${activeCategory === 'EXPIRED' ? 'active-border' : ''}`}
          onClick={() => setActiveCategory('EXPIRED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveCategory('EXPIRED');
          }}
        >
          <div className="admin-stat-top pharm-stat-top">
            <span className="admin-stat-title pharm-stat-title" style={{ color: '#e11d48' }}>Expired</span>
            <div className="admin-stat-icon-box pharm-stat-icon">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="admin-stat-count pharm-stat-value" style={{ color: '#e11d48' }}>{categorizedCounts.expired}</div>
          <div className="admin-stat-footer pharm-stat-footer">
            <span>Must discard / quarantine</span>
          </div>
        </div>
      </section>

      {/* Search & Records Count Controls */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper" style={{ flex: '1 1 360px', maxWidth: '480px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search filtered items by name, code, brand..."
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

        <span className="admin-table-record-count">
          Showing <strong>{filteredList.length}</strong> items in selected view
        </span>
      </div>

      {/* Stock Table Card */}
      <section className="admin-card admin-card-table" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid var(--admin-border-subtle)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Boxes size={18} style={{ color: '#0ea5e9' }} />
            <h2 className="admin-card-title">Monitored Stock Availability</h2>
          </div>
          <span className="admin-badge admin-badge-info">{activeCategory}</span>
        </div>

        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading-state" style={{ minHeight: '260px' }}>
              <Loader2 size={36} className="admin-spinner" />
              <p>Analyzing stock levels & thresholds...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: '3rem' }}>
              <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
              <h3>No items in this category</h3>
              <p style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '0.25rem' }}>
                There are currently no medicines matching the &quot;{activeCategory}&quot; threshold.
              </p>
            </div>
          ) : (
            <div className="admin-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage Form</th>
                    <th>Current Quantity</th>
                    <th>Threshold</th>
                    <th>Status Badge</th>
                    <th>Expiry Warning</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((med) => {
                    const qty = parseInt(med.stock_quantity, 10) || 0;
                    const reorder = parseInt(med.reorder_level, 10) || 10;
                    const isOut = qty === 0;
                    const isLow = qty > 0 && (med.is_low_stock || qty <= reorder);
                    const isHigh = qty > Math.max(100, reorder * 3);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const thirtyDays = new Date(today);
                    thirtyDays.setDate(thirtyDays.getDate() + 30);
                    const exp = med.expiry_date ? new Date(med.expiry_date) : null;
                    const isExpired = exp && exp < today;
                    const isNearExp = exp && exp >= today && exp <= thirtyDays;

                    // Days to expiry
                    let expText = 'No expiry recorded';
                    if (exp) {
                      const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        expText = `Expired ${Math.abs(diffDays)} days ago (${med.expiry_date})`;
                      } else if (diffDays === 0) {
                        expText = `Expires today! (${med.expiry_date})`;
                      } else {
                        expText = `${diffDays} days remaining (${med.expiry_date})`;
                      }
                    }

                    return (
                      <tr key={med.id}>
                        <td>
                          <strong>{med.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                            {med.medicine_code} • {med.strength || 'Standard'}
                          </div>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-info">{med.dosage_form}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: isOut ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981',
                            }}
                          >
                            {qty} units
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                            Reorder: {reorder} units
                          </span>
                        </td>
                        <td>
                          {isOut ? (
                            <span className="admin-badge admin-badge-danger">Out of Stock</span>
                          ) : isLow ? (
                            <span className="admin-badge admin-badge-warning">Low Stock</span>
                          ) : isHigh ? (
                            <span className="admin-badge admin-badge-info">High Stock</span>
                          ) : (
                            <span className="admin-badge admin-badge-success">Normal Stock</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: isExpired || isNearExp ? 600 : 400,
                              color: isExpired ? '#f43f5e' : isNearExp ? '#f59e0b' : 'var(--text-muted, #94a3b8)',
                            }}
                          >
                            {expText}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              onClick={() => {
                                setRestockMedicine(med);
                                setRestockQty('50');
                                setRestockBatch(med.batch_number || '');
                                setRestockExpiry(med.expiry_date || '');
                              }}
                              title="Restock units"
                            >
                              <Boxes size={13} />
                              <span>Restock</span>
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-outline"
                              onClick={() => navigate(`/pharmacist/stock-management?medicineId=${med.id}`)}
                              title="Adjust stock ledger"
                            >
                              <span>Adjust</span>
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

      {/* Restock Modal */}
      {restockMedicine && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setRestockMedicine(null)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                  >
                    <Boxes size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Receive Stock Units</h3>
                    <p className="admin-modal-subtitle">
                      Updating inventory for {restockMedicine.name} ({restockMedicine.medicine_code})
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
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Current Available:</span>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {restockMedicine.stock_quantity} units
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>After Addition:</span>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>
                        {(parseInt(restockMedicine.stock_quantity, 10) || 0) +
                          (parseInt(restockQty, 10) || 0)}{' '}
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
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
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
                        placeholder="Supplier invoice / PO reference"
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
                        <span>Updating...</span>
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
    </div>
  );
};

export default PharmacistStockStatusPage;
