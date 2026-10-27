import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import {
  Users,
  UserCheck,
  FlaskConical,
  Pill,
  ClipboardList,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const AdminOverviewPage = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getOverviewMetrics();
      setMetrics(data);
    } catch (err) {
      let msg = 'Failed to load dashboard metrics. Please check connection and try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Admin Overview — CareFlow HMS';
    fetchOverviewData();
  }, []);

  // Compute patient registrations timeline from real patient records
  const timelineData = useMemo(() => {
    if (!metrics || !metrics.patientsList || metrics.patientsList.length === 0) {
      return [];
    }

    const countsByDate = {};
    metrics.patientsList.forEach((pt) => {
      if (pt.created_at) {
        const dateStr = new Date(pt.created_at).toISOString().split('T')[0];
        countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(countsByDate).sort();
    return sortedDates.map((date) => ({
      date,
      count: countsByDate[date],
    }));
  }, [metrics]);

  const roleCards = [
    {
      id: 'patients',
      title: 'Total Patients',
      count: metrics?.counts?.patients ?? null,
      icon: Users,
      color: 'teal',
      roleParam: 'patients',
      description: 'Registered patients under hospital care',
    },
    {
      id: 'doctors',
      title: 'Total Doctors',
      count: metrics?.counts?.doctors ?? null,
      icon: UserCheck,
      color: 'navy',
      roleParam: 'doctors',
      description: 'Specialists & clinical practitioners',
    },
    {
      id: 'labStaff',
      title: 'Total Lab Staff',
      count: metrics?.counts?.labStaff ?? null,
      icon: FlaskConical,
      color: 'cyan',
      roleParam: 'lab_staff',
      description: 'Diagnostics & laboratory officers',
    },
    {
      id: 'pharmacists',
      title: 'Total Pharmacists',
      count: metrics?.counts?.pharmacists ?? null,
      icon: Pill,
      color: 'teal-dark',
      roleParam: 'pharmacists',
      description: 'Dispensary & pharmacy managers',
    },
    {
      id: 'receptionists',
      title: 'Total Receptionists',
      count: metrics?.counts?.receptionists ?? null,
      icon: ClipboardList,
      color: 'slate',
      roleParam: 'receptionists',
      description: 'Front-desk & triage coordinators',
    },
  ];

  return (
    <div className="admin-page-container">
      {/* Page Title */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Hospital Overview</h2>
          <p className="admin-page-subtitle">
            Real-time hospital counts, patient activity, and tablet inventory status
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving hospital records and inventory metrics...</p>
        </div>
      )}

      {/* Error State with Retry */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Dashboard Metrics</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchOverviewData}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Actual Metrics Grid */}
      {!loading && !error && metrics && (
        <>
          {/* 5 Summary Cards */}
          <section className="admin-cards-grid" aria-label="Hospital Role Summary Cards">
            {roleCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="admin-summary-card"
                  onClick={() => navigate(`/admin/users?tab=${card.roleParam}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/admin/users?tab=${card.roleParam}`);
                    }
                  }}
                  aria-label={`${card.title}: ${card.count}. Click to view ${card.title} on Users page.`}
                >
                  <div className="admin-card-top">
                    <span className="admin-card-title">{card.title}</span>
                    <div className={`admin-card-icon-box admin-icon-${card.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="admin-card-count">
                    {card.count !== null ? card.count : 0}
                  </div>
                  <div className="admin-card-bottom">
                    <span className="admin-card-desc">{card.description}</span>
                    <span className="admin-card-link">
                      <span>View</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Middle Row: Patient Registration Graph & Tablet Stock Summary */}
          <div className="admin-dashboard-two-col">
            {/* Patient Registration Graph Card */}
            <section className="admin-dashboard-panel" aria-label="Patient Registration Timeline">
              <div className="admin-panel-header">
                <div>
                  <h3 className="admin-panel-title">Patient Registrations Over Time</h3>
                  <p className="admin-panel-desc">
                    Historical patient registration records from verified database logs
                  </p>
                </div>
                <div className="admin-panel-badge">
                  <TrendingUp size={14} />
                  <span>Verified History</span>
                </div>
              </div>

              <div className="admin-panel-body">
                {timelineData.length === 0 ? (
                  <div className="admin-graph-empty-state">
                    <div className="admin-empty-icon-box">
                      <Users size={32} />
                    </div>
                    <h4>No Patient Registrations Recorded Yet</h4>
                    <p>
                      Patient registration graphs reflect actual database registration dates.
                      As patients are registered by front-desk staff, the chronological graph will appear here.
                    </p>
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={() => navigate('/admin/users?tab=patients')}
                    >
                      <span>Add First Patient</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="admin-graph-content">
                    <div className="admin-graph-svg-wrapper">
                      {/* Responsive SVG Chart rendering actual registration dates */}
                      <svg
                        className="admin-graph-svg"
                        viewBox="0 0 600 220"
                        preserveAspectRatio="xMidYMid meet"
                        aria-label="Patient registration trend line"
                      >
                        {/* Background Grid Lines */}
                        <line x1="40" y1="20" x2="580" y2="20" stroke="var(--admin-border-subtle, rgba(255, 255, 255, 0.1))" strokeDasharray="3 3" />
                        <line x1="40" y1="70" x2="580" y2="70" stroke="var(--admin-border-subtle, rgba(255, 255, 255, 0.1))" strokeDasharray="3 3" />
                        <line x1="40" y1="120" x2="580" y2="120" stroke="var(--admin-border-subtle, rgba(255, 255, 255, 0.1))" strokeDasharray="3 3" />
                        <line x1="40" y1="170" x2="580" y2="170" stroke="var(--admin-border, rgba(255, 255, 255, 0.2))" strokeWidth="1.5" />

                        {/* Y-axis labels */}
                        <text x="30" y="24" fontSize="10" fill="var(--admin-text-muted, #94a3b8)" textAnchor="end">
                          {Math.max(...timelineData.map((d) => d.count), 5)}
                        </text>
                        <text x="30" y="99" fontSize="10" fill="var(--admin-text-muted, #94a3b8)" textAnchor="end">
                          {Math.round(Math.max(...timelineData.map((d) => d.count), 5) / 2)}
                        </text>
                        <text x="30" y="174" fontSize="10" fill="var(--admin-text-muted, #94a3b8)" textAnchor="end">
                          0
                        </text>

                        {/* Chart Bars / Points for real dates */}
                        {timelineData.map((d, index) => {
                          const maxCount = Math.max(...timelineData.map((t) => t.count), 5);
                          const stepX = (540 - 40) / Math.max(timelineData.length, 1);
                          const x = 60 + index * stepX;
                          const barHeight = (d.count / maxCount) * 140;
                          const y = 170 - barHeight;

                          return (
                            <g key={d.date} className="admin-chart-bar-group">
                              <rect
                                x={x - 14}
                                y={y}
                                width="28"
                                height={barHeight}
                                rx="4"
                                fill="var(--primary-teal, #006a61)"
                                className="admin-chart-bar"
                              />
                              <circle cx={x} cy={y} r="4" fill="var(--primary-cyan, #06b6d4)" />
                              <text
                                x={x}
                                y={y - 8}
                                fontSize="11"
                                fontWeight="700"
                                fill="var(--admin-heading-color, #ffffff)"
                                textAnchor="middle"
                              >
                                {d.count}
                              </text>
                              <text
                                x={x}
                                y="190"
                                fontSize="10"
                                fill="var(--admin-text-muted, #94a3b8)"
                                textAnchor="middle"
                              >
                                {d.date.slice(5)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    <div className="admin-graph-legend">
                      <span className="admin-legend-item">
                        <span className="admin-legend-dot" />
                        <span>Patients Registered ({metrics.patientsList.length} total)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Tablet Stock Summary Card */}
            <section className="admin-dashboard-panel" aria-label="Pharmacy Tablet Inventory Summary">
              <div className="admin-panel-header">
                <div>
                  <h3 className="admin-panel-title">Tablet Stock Summary</h3>
                  <p className="admin-panel-desc">
                    Verified dispensary medicine inventory and restocking metrics
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-panel-action-link"
                  onClick={() => navigate('/admin/tablets')}
                >
                  <span>Manage</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="admin-panel-body">
                <div className="admin-stock-summary-grid">
                  <div className="admin-stock-metric-card">
                    <div className="admin-stock-metric-icon admin-icon-teal">
                      <Package size={20} />
                    </div>
                    <div className="admin-stock-metric-info">
                      <span className="admin-stock-metric-label">Medicine Types</span>
                      <span className="admin-stock-metric-value">
                        {metrics.inventory.totalTypes}
                      </span>
                    </div>
                  </div>

                  <div className="admin-stock-metric-card">
                    <div className="admin-stock-metric-icon admin-icon-navy">
                      <Pill size={20} />
                    </div>
                    <div className="admin-stock-metric-info">
                      <span className="admin-stock-metric-label">Available Units</span>
                      <span className="admin-stock-metric-value">
                        {metrics.inventory.totalStock.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="admin-stock-metric-card">
                    <div className="admin-stock-metric-icon admin-icon-amber">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="admin-stock-metric-info">
                      <span className="admin-stock-metric-label">Low-Stock Medicines</span>
                      <span className="admin-stock-metric-value">
                        {metrics.inventory.lowStockCount}
                      </span>
                    </div>
                  </div>

                  <div className="admin-stock-metric-card">
                    <div className="admin-stock-metric-icon admin-icon-red">
                      <AlertCircle size={20} />
                    </div>
                    <div className="admin-stock-metric-info">
                      <span className="admin-stock-metric-label">Out-of-Stock</span>
                      <span className="admin-stock-metric-value">
                        {metrics.inventory.outOfStockCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-stock-banner">
                  <CheckCircle2 size={16} className="admin-stock-banner-icon" />
                  <span>
                    Stock rules: Items with stock at or below their reorder level trigger low-stock alerts.
                  </span>
                </div>

                <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={() => navigate('/admin/tablets')}
                  >
                    <span>View All Tablets</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOverviewPage;
