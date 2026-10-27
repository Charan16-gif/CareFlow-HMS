import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import {
  Pill,
  PackageCheck,
  AlertTriangle,
  PackageX,
  CalendarClock,
  IndianRupee,
  ClipboardCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Boxes,
  Receipt,
  Clock,
} from 'lucide-react';

const PharmacistOverviewPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacistService.getStats();
      setStats(data);
    } catch (err) {
      let msg = 'Failed to load pharmacy overview metrics. Please verify connection.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Pharmacy Overview — CareFlow HMS Pharmacist';
    fetchOverviewData();
  }, [fetchOverviewData]);

  const statCards = [
    {
      id: 'total_medicines',
      title: 'Total Medicines',
      value: stats?.total_medicines ?? 0,
      icon: Pill,
      color: 'teal',
      description: 'Catalogued tablet & medicine items',
      onClick: () => navigate('/pharmacist/stock'),
    },
    {
      id: 'total_units_in_stock',
      title: 'Total Units in Stock',
      value: stats?.total_units_in_stock ?? 0,
      icon: Boxes,
      color: 'blue',
      description: 'Total medicine dosage units stored',
      onClick: () => navigate('/pharmacist/stock'),
    },
    {
      id: 'total_inventory_value',
      title: 'Inventory Value',
      value: `₹${parseFloat(stats?.total_inventory_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: 'emerald',
      description: 'Total valuation of available stock',
      onClick: () => navigate('/pharmacist/stock'),
    },
    {
      id: 'in_stock',
      title: 'In Stock',
      value: stats?.in_stock ?? 0,
      icon: PackageCheck,
      color: 'emerald',
      description: 'Items with sufficient available quantity',
      onClick: () => navigate('/pharmacist/stock?filter=normal'),
    },
    {
      id: 'low_stock',
      title: 'Low Stock Alerts',
      value: stats?.low_stock ?? 0,
      icon: AlertTriangle,
      color: 'amber',
      description: 'Quantity at or below reorder threshold',
      onClick: () => navigate('/pharmacist/stock?filter=low'),
    },
    {
      id: 'out_of_stock',
      title: 'Out of Stock',
      value: stats?.out_of_stock ?? 0,
      icon: PackageX,
      color: 'rose',
      description: 'Medicines with zero inventory remaining',
      onClick: () => navigate('/pharmacist/stock?filter=out'),
    },
    {
      id: 'near_expiry',
      title: 'Expiring / Expired',
      value: (stats?.near_expiry ?? 0) + (stats?.expired ?? 0),
      icon: CalendarClock,
      color: 'purple',
      description: `${stats?.near_expiry ?? 0} near expiry, ${stats?.expired ?? 0} expired`,
      onClick: () => navigate('/pharmacist/stock?filter=near_expiry'),
    },
    {
      id: 'today_sales',
      title: "Today's Pharmacy Sales",
      value: `₹${parseFloat(stats?.today_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: 'cyan',
      description: 'Validated counter sales & payments',
      onClick: () => navigate('/pharmacist/buying-payment?tab=history'),
    },
    {
      id: 'today_dispensed',
      title: "Today's Dispensations",
      value: stats?.today_dispensed ?? 0,
      icon: ClipboardCheck,
      color: 'blue',
      description: 'Prescription orders fulfilled today',
      onClick: () => navigate('/pharmacist/buying-payment?tab=prescriptions'),
    },
  ];

  if (loading && !stats) {
    return (
      <div className="admin-loading-container" style={{ minHeight: '60vh' }}>
        <Loader2 size={40} className="admin-spinner" />
        <p className="admin-loading-text">Loading real-time pharmacy analytics...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Pharmacy Operations Overview</h1>
          <p className="admin-page-subtitle">
            Real-time medicine inventory tracker, stock levels, prescriptions, and counter sales
          </p>
        </div>
        <div className="admin-page-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => navigate('/pharmacist/stock')}
          >
            <Pill size={16} />
            <span>Medicines Stock</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/pharmacist/buying-payment')}
          >
            <Receipt size={16} />
            <span>Medicines Buying & Payment</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards Grid */}
      <section className="admin-stat-grid pharm-stat-grid" aria-label="Pharmacy Operational Statistics">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`admin-stat-card pharm-stat-card pharm-stat-card-${card.color}`}
              onClick={card.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  card.onClick();
                }
              }}
            >
              <div className="admin-stat-top pharm-stat-top">
                <span className="admin-stat-title pharm-stat-title">{card.title}</span>
                <div className="admin-stat-icon-box pharm-stat-icon">
                  <Icon size={20} />
                </div>
              </div>
              <div className="admin-stat-count pharm-stat-value">{card.value}</div>
              <div className="admin-stat-footer pharm-stat-footer">
                <span>{card.description}</span>
                <ArrowRight size={14} className="admin-stat-arrow" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Quick Actions Shortcuts */}
      <section className="admin-card" style={{ marginBottom: '1.75rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Pharmacy Quick Actions</h2>
          <span className="admin-badge admin-badge-info">Shortcuts</span>
        </div>
        <div className="admin-card-body" style={{ padding: '1.25rem 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              onClick={() => navigate('/pharmacist/stock?action=add')}
            >
              <Plus size={18} style={{ color: '#10b981' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Add New Medicine</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Add to stock catalogue</div>
              </div>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              onClick={() => navigate('/pharmacist/stock')}
            >
              <Pill size={18} style={{ color: '#06b6d4' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Medicines Stock</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Search catalogue & levels</div>
              </div>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              onClick={() => navigate('/pharmacist/buying-payment?tab=shop')}
            >
              <Boxes size={18} style={{ color: '#3b82f6' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Counter Buying & Cart</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Buy medicines & checkout</div>
              </div>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              onClick={() => navigate('/pharmacist/buying-payment?tab=prescriptions')}
            >
              <ClipboardCheck size={18} style={{ color: '#8b5cf6' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Prescribed Medicines</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Fulfill doctor prescriptions</div>
              </div>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              onClick={() => navigate('/pharmacist/buying-payment?tab=history')}
            >
              <Receipt size={18} style={{ color: '#10b981' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Sales & Payment History</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Receipts & Buy Again</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Two Column Section: Attention List & Recent Dispensations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Inventory Requiring Attention */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
              <h2 className="admin-card-title">Inventory Requiring Attention</h2>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-outline"
              onClick={() => navigate('/pharmacist/stock?filter=low')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            {(!stats?.attention_medicines || stats.attention_medicines.length === 0) ? (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <CheckCircle2 size={36} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
                <p>All medicines have healthy stock and valid expiry dates!</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Form</th>
                      <th>Available</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.attention_medicines.slice(0, 5).map((med) => {
                      const qty = parseInt(med.stock_quantity, 10) || 0;
                      const isOut = qty <= 0;
                      const isLow = qty > 0 && (med.is_low_stock || qty <= (med.reorder_level || 10));

                      return (
                        <tr key={med.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary, #f1f5f9)' }}>{med.name}</strong>
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
                                fontWeight: 700,
                                color: isOut ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981',
                              }}
                            >
                              {qty} units
                            </span>
                          </td>
                          <td>
                            {isOut ? (
                              <span className="admin-badge admin-badge-danger">Out of Stock</span>
                            ) : isLow ? (
                              <span className="admin-badge admin-badge-warning">Low Stock</span>
                            ) : (
                              <span className="admin-badge admin-badge-info">Near Expiry</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              onClick={() => navigate(`/pharmacist/stock?action=adjust&id=${med.id}`)}
                            >
                              Restock
                            </button>
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

        {/* Recent Dispensations */}
        <section className="admin-card">
          <div className="admin-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#06b6d4' }} />
              <h2 className="admin-card-title">Recent Prescription Dispenses</h2>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-outline"
              onClick={() => navigate('/pharmacist/buying-payment?tab=prescriptions')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            {(!stats?.recent_dispensations || stats.recent_dispensations.length === 0) ? (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <ClipboardCheck size={36} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
                <p>No medicines have been dispensed yet today.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Dispense ID</th>
                      <th>Patient</th>
                      <th>Total</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_dispensations.slice(0, 5).map((dsp) => (
                      <tr key={dsp.id}>
                        <td>
                          <strong>{dsp.dispense_id}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                            Rx: {dsp.prescription_code || 'Prescription'}
                          </div>
                        </td>
                        <td>
                          <span>{dsp.patient_name || 'Patient'}</span>
                        </td>
                        <td>
                          <strong>₹{parseFloat(dsp.total_amount || 0).toFixed(2)}</strong>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {dsp.dispensed_at ? new Date(dsp.dispensed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-success">Dispensed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent Pharmacy Transactions & Counter Sales */}
      <section className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={18} style={{ color: '#10b981' }} />
            <h2 className="admin-card-title">Recent Pharmacy Counter Sales & Receipts</h2>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            onClick={() => navigate('/pharmacist/buying-payment?tab=history')}
          >
            <span>All Sales & Billing</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          {(!stats?.recent_sales || stats.recent_sales.length === 0) ? (
            <div className="admin-empty-state" style={{ padding: '2rem' }}>
              <Receipt size={36} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.5rem' }} />
              <p>No pharmacy sales recorded yet today.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Patient</th>
                    <th>Payment Method</th>
                    <th>Amount Paid</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_sales.slice(0, 5).map((pay) => (
                    <tr key={pay.id}>
                      <td>
                        <strong>{pay.receipt_number}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                          Bill: {pay.bill_number}
                        </div>
                      </td>
                      <td>
                        <span>{pay.patient_name || 'Walk-in Patient'}</span>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-info">{pay.payment_method}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#10b981' }}>₹{parseFloat(pay.amount || 0).toFixed(2)}</strong>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                        {pay.payment_date ? new Date(pay.payment_date).toLocaleString() : '—'}
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-success">Paid</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PharmacistOverviewPage;
