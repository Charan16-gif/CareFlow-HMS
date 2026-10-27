import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import labStaffService from '../../services/labStaffService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FlaskConical,
  Clock,
  Activity,
  FileCheck,
  Ban,
  Search,
  Eye,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  FileText,
  Download,
  AlertTriangle,
  Play,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const LabStaffOverviewPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    requested: 0,
    accepted: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    pending_cancellations: 0,
    reports_uploaded: 0,
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerOrder, setViewerOrder] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  // Cancellation Review Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToReview, setOrderToReview] = useState(null);
  const [cancelDecision, setCancelDecision] = useState('APPROVE');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, ordersData] = await Promise.all([
        labStaffService.getStats(),
        labStaffService.getOrders(),
      ]);
      setStats(statsData || {});
      const list = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];
      setOrders(list);
    } catch (err) {
      setError('Failed to load laboratory statistics and requisitions. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptOrder = async (orderId) => {
    try {
      await labStaffService.acceptOrder(orderId);
      const msg = 'Requisition accepted and queued for specimen intake.';
      toast.success(msg, 'Requisition Accepted');
      fetchData();
    } catch (err) {
      toast.error('Unable to accept order. ' + (err.response?.data?.status || err.message), 'Accept Failed');
    }
  };

  const handleStartOrder = async (orderId) => {
    try {
      await labStaffService.startOrder(orderId);
      const msg = 'Diagnostic test moved to In Progress. Specimen analysis active.';
      toast.success(msg, 'Test In Progress');
      fetchData();
    } catch (err) {
      toast.error('Unable to start analysis. ' + (err.response?.data?.status || err.message), 'Start Failed');
    }
  };

  const handleDownloadReport = async (order) => {
    setDownloadingId(order.id);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      downloadReportFile(blob, order, 'Lab_Report');
      toast.success('Lab report downloaded successfully.', 'Report Downloaded');
    } catch (err) {
      toast.error('Unable to download diagnostic report file.', 'Download Error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewReport = async (order) => {
    setViewingId(order.id);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      setViewerBlob(blob);
      setViewerOrder(order);
      setViewerOpen(true);
    } catch (err) {
      toast.error('Unable to load diagnostic report for in-page viewing.', 'Viewer Error');
    } finally {
      setViewingId(null);
    }
  };

  const handleOpenCancelModal = (order) => {
    setOrderToReview(order);
    setCancelDecision('APPROVE');
    setCancelRemarks('');
    setCancelError('');
    setIsCancelModalOpen(true);
  };

  const handleCancelDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!orderToReview) return;
    setSubmittingDecision(true);
    setCancelError('');
    try {
      await labStaffService.processCancellation(orderToReview.id, cancelDecision, cancelRemarks);
      setIsCancelModalOpen(false);
      toast.success(`Cancellation request for ${orderToReview.order_id} has been ${cancelDecision.toLowerCase()}d.`, 'Cancellation Processed');
      fetchData();
    } catch (err) {
      setCancelError(err.response?.data?.detail || 'Failed to process cancellation request.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Filter orders
  const filteredOrders = (orders || []).filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const testName = (order.test_name || order.custom_test_name || '').toLowerCase();
      const orderId = (order.order_id || '').toLowerCase();
      const patientName = `${order.patient_name || ''} ${order.patient_identifier || ''}`.toLowerCase();
      const doctorName = `${order.doctor_name || ''}`.toLowerCase();
      return testName.includes(q) || orderId.includes(q) || patientName.includes(q) || doctorName.includes(q);
    }
    return true;
  });

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
              background: 'rgba(20, 184, 166, 0.15)',
              color: '#14b8a6',
              border: '1px solid rgba(20, 184, 166, 0.35)',
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
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.35)',
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

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Laboratory Operations Overview</h1>
          <p className="admin-page-subtitle">
            Real-time diagnostic requisition pipeline, specimen processing workflow, and verified laboratory findings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => navigate('/lab-staff/reports')}
          >
            <UploadCloud size={16} />
            <span>Upload Reports</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/lab-staff/enter-results')}
          >
            <Activity size={16} />
            <span>Enter Results</span>
          </button>
        </div>
      </div>



      {/* Error Alert */}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Metric Summary Cards Grid (PostgreSQL Live Data) */}
      <section className="admin-stat-grid" aria-label="Laboratory Statistics">
        <div
          className="admin-stat-card admin-stat-card-navy"
          onClick={() => setStatusFilter('ALL')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Total Requests</span>
            <div className="admin-stat-icon-box">
              <FlaskConical size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.total}</div>
          <div className="admin-stat-footer">
            <span>All recorded requisitions</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div
          className="admin-stat-card admin-stat-card-cyan"
          onClick={() => setStatusFilter('REQUESTED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Newly Requested</span>
            <div className="admin-stat-icon-box">
              <Clock size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.requested}</div>
          <div className="admin-stat-footer">
            <span>Awaiting lab acceptance</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div
          className="admin-stat-card admin-stat-card-teal"
          onClick={() => setStatusFilter('ACCEPTED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Tests Accepted</span>
            <div className="admin-stat-icon-box">
              <Activity size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.accepted}</div>
          <div className="admin-stat-footer">
            <span>Specimens ready for testing</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div
          className="admin-stat-card admin-stat-card-amber"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">In Progress</span>
            <div className="admin-stat-icon-box">
              <Activity size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.in_progress}</div>
          <div className="admin-stat-footer">
            <span>Active clinical evaluation</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div
          className="admin-stat-card admin-stat-card-green"
          onClick={() => setStatusFilter('COMPLETED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Completed Tests</span>
            <div className="admin-stat-icon-box">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.completed}</div>
          <div className="admin-stat-footer">
            <span>Verified findings ready</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div
          className="admin-stat-card admin-stat-card-red"
          onClick={() => setStatusFilter('CANCELLED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Cancelled</span>
            <div className="admin-stat-icon-box">
              <Ban size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.cancelled}</div>
          <div className="admin-stat-footer">
            <span>Discontinued / Terminated</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>
      </section>

      {/* Tabs Row for Status Filtering */}
      <div className="admin-tabs-row" style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: 'All Orders', count: stats.total },
          { key: 'REQUESTED', label: 'Requested', count: stats.requested },
          { key: 'ACCEPTED', label: 'Accepted', count: stats.accepted },
          { key: 'IN_PROGRESS', label: 'In Progress', count: stats.in_progress },
          { key: 'COMPLETED', label: 'Completed', count: stats.completed },
          { key: 'CANCELLED', label: 'Cancelled', count: stats.cancelled },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-tab-btn ${statusFilter === tab.key ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table Controls (Search & Record Count) */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by test name, order ID, patient, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="admin-table-record-count">
          Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Current-Tests Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading laboratory diagnostic requisitions from PostgreSQL database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <FlaskConical size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Laboratory Requisitions Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--admin-text-muted)' }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No test orders match your search and filter criteria.'
              : 'There are currently no laboratory diagnostic test orders registered in the system.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Test Request ID</th>
                <th>Patient Details</th>
                <th>Diagnostic Test</th>
                <th>Requesting Doctor</th>
                <th>Request Date</th>
                <th>Current Status</th>
                <th>Completion Date</th>
                <th style={{ textAlign: 'right' }}>Available Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const hasReport = Boolean(order.report_file);
                const hasPendingCancel = order.cancellation_requested && order.cancellation_status === 'REQUESTED';

                return (
                  <tr key={order.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--admin-heading-color)' }}>
                        {order.order_id}
                      </span>
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{order.patient_name || 'Patient'}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          ID: {order.patient_identifier || `PAT-${order.patient}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>
                          {order.test_name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          {order.test_category}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>
                          {order.doctor_name || 'Physician'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          {order.doctor_specialization || 'Clinical Staff'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
                        {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getStatusBadge(order.status)}
                        {hasPendingCancel && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: '#f59e0b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <AlertTriangle size={11} />
                            Cancellation Requested
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)' }}>
                        {order.completed_at ? new Date(order.completed_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.35rem 0.65rem' }}
                          title="View Test Details"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye size={15} />
                          <span>Details</span>
                        </button>

                        {/* Accept button (if REQUESTED) */}
                        {(order.status === 'REQUESTED' || order.status === 'ORDERED') && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="Accept Test Requisition"
                            onClick={() => handleAcceptOrder(order.id)}
                          >
                            <Check size={15} />
                            <span>Accept</span>
                          </button>
                        )}

                        {/* Start Analysis button (if ACCEPTED) */}
                        {(order.status === 'ACCEPTED' || order.status === 'SAMPLE_COLLECTED') && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '0.35rem 0.65rem', background: '#f59e0b', borderColor: '#f59e0b' }}
                            title="Move to In Progress"
                            onClick={() => handleStartOrder(order.id)}
                          >
                            <Play size={15} />
                            <span>Start</span>
                          </button>
                        )}

                        {/* Enter Results button (if IN_PROGRESS or ACCEPTED) */}
                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="Enter or Manage Results"
                            onClick={() => navigate(`/lab-staff/enter-results/${order.id}`)}
                          >
                            <Activity size={15} />
                            <span>Results</span>
                          </button>
                        )}

                        {/* Review Doctor Cancellation Request */}
                        {hasPendingCancel && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="Process Doctor Cancellation Request"
                            onClick={() => handleOpenCancelModal(order)}
                          >
                            <AlertTriangle size={15} />
                            <span>Review Cancel</span>
                          </button>
                        )}

                        {/* View & Download Report (if available) */}
                        {hasReport && (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '0.35rem 0.65rem' }}
                              title="View Diagnostic Report In-Page"
                              disabled={viewingId === order.id}
                              onClick={() => handleViewReport(order)}
                            >
                              {viewingId === order.id ? (
                                <Loader2 size={15} className="spinner-icon admin-spinner-teal" />
                              ) : (
                                <Eye size={15} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '0.35rem 0.65rem' }}
                              title="Download Report"
                              disabled={downloadingId === order.id}
                              onClick={() => handleDownloadReport(order)}
                            >
                              {downloadingId === order.id ? (
                                <Loader2 size={15} className="spinner-icon admin-spinner-teal" />
                              ) : (
                                <Download size={15} />
                              )}
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
          MODAL: TEST REQUEST DETAILS
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isDetailsModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => setIsDetailsModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  className="admin-stat-icon-box"
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    borderColor: 'rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <FlaskConical size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Requisition {selectedOrder?.order_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Complete laboratory test details, specimen information, and clinical records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {selectedOrder && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.15rem',
                      borderRadius: 'var(--admin-radius-md)',
                      background: 'var(--admin-surface-secondary)',
                      border: '1px solid var(--admin-border-subtle)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                        Processing Status
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    {selectedOrder.completed_at && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                          Completed At
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)', fontWeight: 500 }}>
                          {new Date(selectedOrder.completed_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Doctor Cancellation Notice if requested */}
                  {selectedOrder.cancellation_requested && (
                    <div className="admin-alert admin-alert-warning">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Doctor Cancellation Request ({selectedOrder.cancellation_status})</strong>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                          Reason: {selectedOrder.cancellation_reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Patient & Doctor Two-Col */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Patient Profile
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0.1rem 0', color: 'var(--admin-heading-color)' }}>
                        {selectedOrder.patient_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                        ID: {selectedOrder.patient_identifier || `PAT-${selectedOrder.patient}`} • Gender: {selectedOrder.patient_gender || '—'}
                      </p>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Requesting Doctor
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0.1rem 0', color: 'var(--admin-heading-color)' }}>
                        {selectedOrder.doctor_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                        Specialization: {selectedOrder.doctor_specialization || 'Clinical Doctor'}
                      </p>
                    </div>
                  </div>

                  {/* Test Details */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                      Diagnostic Test Specification
                    </span>
                    <h4 style={{ margin: '0.35rem 0 0.2rem 0', color: 'var(--admin-heading-color)' }}>
                      {selectedOrder.test_name} ({selectedOrder.test_code || 'LAB-TEST'})
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                      Category: {selectedOrder.test_category} • Standard Fee: ${selectedOrder.test_price || '0.00'}
                    </p>
                    {selectedOrder.clinical_notes && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                          Physician Clinical Notes:
                        </span>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--admin-text-main)' }}>
                          {selectedOrder.clinical_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Results preview if entered */}
                  {selectedOrder.result_value && (
                    <div className="lab-findings-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-heading-color)', textTransform: 'uppercase' }}>
                          Entered Findings
                        </span>
                        {selectedOrder.assigned_staff_name && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>
                            Processed by: {selectedOrder.assigned_staff_name}
                          </span>
                        )}
                      </div>
                      <div className="lab-result-highlight-box">
                        <span className="lab-result-val">
                          {selectedOrder.result_value} {selectedOrder.result_unit || ''}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', display: 'block', marginTop: '0.2rem' }}>
                          Reference: {selectedOrder.reference_range_used || selectedOrder.test_reference_range || 'Normal'}
                        </span>
                      </div>
                      {selectedOrder.result_interpretation && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--admin-text-main)' }}>
                          <strong>Interpretation:</strong> {selectedOrder.result_interpretation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Report file banner if attached */}
                  {selectedOrder.report_file && (
                    <div className="lab-file-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={24} style={{ color: '#3b82f6' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--admin-heading-color)', display: 'block' }}>
                            Diagnostic Report File Attached
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                            Verified PDF/Image ready for download or review
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => handleViewReport(selectedOrder)}
                          disabled={viewingId === selectedOrder.id}
                        >
                          {viewingId === selectedOrder.id ? (
                            <Loader2 size={15} className="spinner-icon admin-spinner-teal" />
                          ) : (
                            <Eye size={15} />
                          )}
                          <span>View Report</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={() => handleDownloadReport(selectedOrder)}
                          disabled={downloadingId === selectedOrder.id}
                        >
                          <Download size={15} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </button>
              {selectedOrder && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    navigate(`/lab-staff/enter-results/${selectedOrder.id}`);
                  }}
                >
                  <Activity size={16} />
                  <span>Enter Results</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PROCESS DOCTOR CANCELLATION REQUEST
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isCancelModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !submittingDecision && setIsCancelModalOpen(false)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  className="admin-stat-icon-box"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Review Doctor Cancellation Request</h3>
                  <p className="admin-modal-subtitle">
                    Requisition: {orderToReview?.order_id} ({orderToReview?.test_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !submittingDecision && setIsCancelModalOpen(false)}
                disabled={submittingDecision}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCancelDecisionSubmit}>
              <div className="admin-modal-body">
                {cancelError && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="admin-glass-card" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                    Physician's Stated Reason
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--admin-text-main)' }}>
                    {orderToReview?.cancellation_reason || 'No specific reason provided.'}
                  </p>
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Laboratory Decision</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={`admin-btn ${cancelDecision === 'APPROVE' ? 'admin-btn-danger' : 'admin-btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setCancelDecision('APPROVE')}
                    >
                      <Ban size={16} />
                      <span>Approve & Cancel Order</span>
                    </button>
                    <button
                      type="button"
                      className={`admin-btn ${cancelDecision === 'REJECT' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setCancelDecision('REJECT')}
                    >
                      <Check size={16} />
                      <span>Reject & Continue Testing</span>
                    </button>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Laboratory Staff Remarks</label>
                  <textarea
                    className="admin-form-input"
                    rows={3}
                    placeholder="Enter clinical or administrative remarks regarding your decision..."
                    value={cancelRemarks}
                    onChange={(e) => setCancelRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={submittingDecision}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`admin-btn ${cancelDecision === 'APPROVE' ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                  disabled={submittingDecision}
                >
                  {submittingDecision ? (
                    <>
                      <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Submit Decision</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* In-Page Diagnostic Document Viewer Modal */}
      {viewerOpen && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewerOrder(null);
            setViewerBlob(null);
          }}
          order={viewerOrder}
          blob={viewerBlob}
        />
      )}
    </div>
  );
};

export default LabStaffOverviewPage;
