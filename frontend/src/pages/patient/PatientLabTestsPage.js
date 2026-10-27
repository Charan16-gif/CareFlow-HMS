import React, { useState, useEffect, useCallback } from 'react';
import patientService from '../../services/patientService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FlaskConical,
  Search,
  Eye,
  AlertCircle,
  Loader2,
  X,
  Download,
  FileText,
  Clock,
  Check,
  Activity,
  Ban,
  FileCheck,
  Info,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const PROGRESS_STEPS = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

const PatientLabTestsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED'

  // Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer Modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerOrder, setViewerOrder] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Freeze background scroll
  useEffect(() => {
    if (isDetailsModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailsModalOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsModalOpen]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getLabOrders(
        searchQuery ? { search: searchQuery } : {}
      );
      setOrders(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load your laboratory diagnostic records. Please try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'My Lab Tests & Reports — CareFlow Patient Portal';
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetails = async (order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await patientService.getLabOrderDetails(order.id);
      setSelectedOrder(detailed);
    } catch (err) {
      // Fallback
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReport = async (order) => {
    setDownloadingId(order.id);
    toast.info(`Preparing report download for #${order.order_id || order.id}...`, 'Downloading');
    try {
      const blob = await patientService.downloadReport(order.id);
      downloadReportFile(blob, order, 'My_Lab_Report');
    } catch (err) {
      toast.error('Diagnostic report file is not yet ready for download.', 'Download Notice');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewReportOnline = async (order) => {
    setViewerOrder(order);
    setViewerModalOpen(true);
    setViewerBlob(null);
    setLoadingViewer(true);
    try {
      const blob = await patientService.downloadReport(order.id);
      setViewerBlob(blob);
    } catch (err) {
      toast.error('Unable to open diagnostic report document.', 'View Notice');
    } finally {
      setLoadingViewer(false);
    }
  };

  const handleEmailReport = async (order) => {
    try {
      toast.info(`Dispatching diagnostic report #${order.order_id || order.id} to your registered email...`, 'Sending Email');
      const res = await patientService.emailReport(order.id);
      toast.success(res.message || 'Diagnostic report has been sent to your email inbox!', 'Report Emailed');
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.response?.data?.error || 'Could not send report to email. Please verify your profile email.',
        'Email Dispatch Failed'
      );
    }
  };

  // Helper for progress step calculation
  const getStepIndex = (status) => {
    switch (status) {
      case 'REQUESTED':
      case 'ORDERED':
        return 0;
      case 'ACCEPTED':
      case 'SAMPLE_COLLECTED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return -1;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
      case 'ORDERED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.35)',
            }}
          >
            <Clock size={12} style={{ marginRight: '4px' }} />
            Requested
          </span>
        );
      case 'ACCEPTED':
      case 'SAMPLE_COLLECTED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.35)',
            }}
          >
            <Activity size={12} style={{ marginRight: '4px' }} />
            Accepted
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              border: '1px solid rgba(234, 179, 8, 0.35)',
            }}
          >
            <Activity size={12} style={{ marginRight: '4px' }} />
            In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <Check size={12} style={{ marginRight: '4px' }} />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            <Ban size={12} style={{ marginRight: '4px' }} />
            Cancelled
          </span>
        );
      default:
        return <span className="admin-badge">{status}</span>;
    }
  };

  // Metrics
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  // Filtered
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ACTIVE') {
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
    }
    if (activeTab === 'COMPLETED') {
      if (order.status !== 'COMPLETED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const testName = (order.test_name || order.custom_test_name || '').toLowerCase();
      const orderId = (order.order_id || '').toLowerCase();
      const doctorName = `${order.doctor_name || ''}`.toLowerCase();
      return testName.includes(q) || orderId.includes(q) || doctorName.includes(q);
    }
    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">My Lab Tests & Diagnostics</h1>
          <p className="admin-page-subtitle">
            View diagnostic test requests ordered by your physicians, monitor specimen analysis progress, and access clinical reports.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <section className="admin-stat-grid" aria-label="Diagnostic Records Summary">
        <div className="admin-stat-card admin-stat-card-navy">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Total Diagnostics</span>
            <div className="admin-stat-icon-box">
              <FlaskConical size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{totalOrders}</div>
          <div className="admin-stat-footer">
            <span>All prescribed tests</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-amber">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Active / In Progress</span>
            <div className="admin-stat-icon-box">
              <Activity size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{activeOrders.length}</div>
          <div className="admin-stat-footer">
            <span>Specimens being analyzed</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-green">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Completed Reports</span>
            <div className="admin-stat-icon-box">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{completedOrders.length}</div>
          <div className="admin-stat-footer">
            <span>Verified findings available</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>
      </section>

      {/* Tabs Row */}
      <div className="admin-tabs-row" style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: 'All Tests', count: totalOrders },
          { key: 'ACTIVE', label: 'Active Tests', count: activeOrders.length },
          { key: 'COMPLETED', label: 'Completed', count: completedOrders.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-tab-btn ${activeTab === tab.key ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search and Table Controls */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by diagnostic test name, doctor, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="admin-table-record-count">
          Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'diagnostic test' : 'diagnostic tests'}
        </span>
      </div>

      {/* Orders List / Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving your diagnostic laboratory records...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <FlaskConical size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Laboratory Records Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto', color: 'var(--admin-text-muted)' }}>
            {searchQuery || activeTab !== 'ALL'
              ? 'No laboratory records match your search filter.'
              : 'You do not have any diagnostic laboratory orders registered. Diagnostic tests will appear here when requested by your physician.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
              <thead>
                <tr>
                  <th>Diagnostic Test</th>
                  <th>Order Reference</th>
                  <th>Ordering Physician</th>
                  <th>Date Requested</th>
                  <th>Analysis Progress</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const stepIdx = getStepIndex(order.status);
                  const isCancelled = order.status === 'CANCELLED';
                  const hasReport = Boolean(order.report_file);
                  const isCompleted = order.status === 'COMPLETED';

                  return (
                    <tr key={order.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {order.test_name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Category: {order.test_category || 'General'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {order.order_id}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {order.doctor_name || 'Physician'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {order.doctor_specialization || 'Clinical Staff'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td style={{ minWidth: '180px' }}>
                        {isCancelled ? (
                          <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Ban size={12} /> Test Cancelled
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Progress bar */}
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.max(15, ((stepIdx + 1) / PROGRESS_STEPS.length) * 100)}%`,
                                  height: '100%',
                                  background:
                                    stepIdx === 3
                                      ? '#10b981'
                                      : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Step {stepIdx + 1} of 4: {PROGRESS_STEPS[stepIdx]?.label || order.status}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="View Test Details & Results"
                            onClick={() => handleOpenDetails(order)}
                          >
                            <Eye size={15} />
                            <span>Details</span>
                          </button>

                          {hasReport && isCompleted && (
                            <>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Open Diagnostic Report Document in Page"
                                onClick={() => handleViewReportOnline(order)}
                              >
                                <FileText size={15} />
                                <span>View Document</span>
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Send Report to My Email"
                                onClick={() => handleEmailReport(order)}
                              >
                                <Mail size={15} />
                                <span>Email</span>
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Download Verified Report"
                                disabled={downloadingId === order.id}
                                onClick={() => handleDownloadReport(order)}
                              >
                                {downloadingId === order.id ? (
                                  <Loader2 size={15} className="admin-spinner" />
                                ) : (
                                  <Download size={15} />
                                )}
                                <span>Report</span>
                              </button>
                            </>
                          )}
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
          MODAL: TEST DETAILS & STRUCTURED RESULTS (PATIENT VIEW)
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isDetailsModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => setIsDetailsModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="admin-metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', width: 36, height: 36 }}>
                  <FlaskConical size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {selectedOrder?.test_name || 'Laboratory Diagnostic'}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Order Reference: {selectedOrder?.order_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {loadingDetails ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <Loader2 className="admin-spinner" size={28} />
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading diagnostic findings...</p>
                </div>
              ) : selectedOrder ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status & Timeline Banner */}
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Analysis Lifecycle
                      </span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>

                    {selectedOrder.status !== 'CANCELLED' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {PROGRESS_STEPS.map((step, idx) => {
                          const currentIdx = getStepIndex(selectedOrder.status);
                          const isDone = idx <= currentIdx;
                          return (
                            <div key={step.key} style={{ flex: 1, textAlign: 'center' }}>
                              <div
                                style={{
                                  height: '4px',
                                  borderRadius: '2px',
                                  background: isDone ? '#10b981' : 'rgba(255,255,255,0.1)',
                                  marginBottom: '4px',
                                }}
                              />
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: isDone ? 600 : 400,
                                  color: isDone ? '#10b981' : 'var(--text-muted)',
                                }}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-alert admin-alert-danger" style={{ marginTop: '0.5rem' }}>
                        <Ban size={16} />
                        <span>This laboratory order was cancelled. Specimen analysis was not completed.</span>
                      </div>
                    )}
                  </div>

                  {/* Test Details Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="admin-glass-card" style={{ padding: '0.85rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Ordering Physician
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0.1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {selectedOrder.doctor_name || 'Dr. Claire'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {selectedOrder.doctor_specialization || 'Clinical Specialist'}
                      </p>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '0.85rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Date Requested
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0.1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {selectedOrder.ordered_at ? new Date(selectedOrder.ordered_at).toLocaleDateString() : '—'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {selectedOrder.completed_at
                          ? `Finalized: ${new Date(selectedOrder.completed_at).toLocaleDateString()}`
                          : 'Processing'}
                      </p>
                    </div>
                  </div>

                  {/* Results Section */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                      Clinical Test Results & Findings
                    </span>

                    {selectedOrder.status === 'COMPLETED' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                              Observed Value
                            </span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#10b981' }}>
                              {selectedOrder.result_value || 'Completed'} {selectedOrder.result_unit || ''}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                              Standard Reference Range
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {selectedOrder.reference_range_used || selectedOrder.test_reference_range || 'Normal'}
                            </span>
                          </div>
                        </div>

                        {selectedOrder.result_interpretation && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Clinical Interpretation
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {selectedOrder.result_interpretation}
                            </p>
                          </div>
                        )}

                        {selectedOrder.result_notes && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Technician Remarks
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                              {selectedOrder.result_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedOrder.status === 'CANCELLED' ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        This test request was cancelled. No laboratory results were generated.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={18} />
                        <span style={{ fontSize: '0.9rem' }}>
                          Specimen evaluation is in progress. Official findings will be posted here as soon as approved by the laboratory.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attached Report File Section */}
                  {selectedOrder.report_file && selectedOrder.status === 'COMPLETED' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={28} style={{ color: '#10b981' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            Official Diagnostic Report File
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Verified and signed by CareFlow Laboratory
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.4rem 0.8rem' }}
                          onClick={() => handleViewReportOnline(selectedOrder)}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.4rem 0.8rem' }}
                          title="Email Report to My Registered Email"
                          onClick={() => handleEmailReport(selectedOrder)}
                        >
                          <Mail size={15} />
                          <span>Email</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          style={{ padding: '0.4rem 0.8rem' }}
                          disabled={downloadingId === selectedOrder.id}
                          onClick={() => handleDownloadReport(selectedOrder)}
                        >
                          {downloadingId === selectedOrder.id ? (
                            <Loader2 size={15} className="admin-spinner" />
                          ) : (
                            <Download size={15} />
                          )}
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ) : selectedOrder.status === 'COMPLETED' ? (
                    <div className="admin-alert admin-alert-info">
                      <Info size={16} />
                      <span>
                        Structured findings are recorded above. No additional external PDF scan was attached to this requisition.
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* In-Page Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        order={viewerOrder}
        blob={viewerBlob}
        loading={loadingViewer}
      />
    </div>
  );
};

export default PatientLabTestsPage;
