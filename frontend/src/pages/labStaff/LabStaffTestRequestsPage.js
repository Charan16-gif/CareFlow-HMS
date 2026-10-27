import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import labStaffService from '../../services/labStaffService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  ClipboardList,
  Search,
  Eye,
  Check,
  Play,
  Activity,
  Ban,
  Download,
  UploadCloud,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const LabStaffTestRequestsPage = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | PENDING_ACTION | IN_PROGRESS | COMPLETED | CANCELLATION_REQUESTS

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer Modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerOrder, setViewerOrder] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Cancellation Review Modal (Doctor cancellation request)
  const [isReviewCancelModalOpen, setIsReviewCancelModalOpen] = useState(false);
  const [orderToReview, setOrderToReview] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Lab Staff Direct Cancellation Modal
  const [isDirectCancelModalOpen, setIsDirectCancelModalOpen] = useState(false);
  const [orderToDirectCancel, setOrderToDirectCancel] = useState(null);
  const [directCancelReason, setDirectCancelReason] = useState('');
  const [isSubmittingDirectCancel, setIsSubmittingDirectCancel] = useState(false);
  const [directCancelError, setDirectCancelError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await labStaffService.getOrders();
      const list = Array.isArray(data) ? data : data?.results || [];
      setOrders(list);
    } catch (err) {
      setError('Failed to retrieve laboratory requisitions from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAccept = async (orderId) => {
    try {
      await labStaffService.acceptOrder(orderId);
      const msg = 'Requisition accepted. Specimen intake registered.';
      toast.success(msg, 'Requisition Accepted');
      fetchOrders();
    } catch (err) {
      toast.error('Unable to accept requisition: ' + (err.response?.data?.status || err.message), 'Accept Failed');
    }
  };

  const handleStartAnalysis = async (orderId) => {
    try {
      await labStaffService.startOrder(orderId);
      const msg = 'Order moved to In Progress. Laboratory testing started.';
      toast.success(msg, 'Testing Started');
      fetchOrders();
    } catch (err) {
      toast.error('Unable to start test: ' + (err.response?.data?.status || err.message), 'Start Failed');
    }
  };

  const handleDownloadReport = async (order) => {
    setDownloadingId(order.id);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      downloadReportFile(blob, order, 'Lab_Report');
    } catch (err) {
      toast.error('Failed to download report file.', 'Download Failed');
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
      const blob = await labStaffService.downloadReport(order.id);
      setViewerBlob(blob);
    } catch (err) {
      toast.error('Unable to open diagnostic report document.', 'Viewer Error');
    } finally {
      setLoadingViewer(false);
    }
  };

  // Review Doctor Cancellation
  const handleOpenReviewCancel = (order) => {
    setOrderToReview(order);
    setReviewDecision('APPROVE');
    setReviewRemarks('');
    setReviewError('');
    setIsReviewCancelModalOpen(true);
  };

  const handleReviewCancelSubmit = async (e) => {
    e.preventDefault();
    if (!orderToReview) return;
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      await labStaffService.processCancellation(orderToReview.id, reviewDecision, reviewRemarks);
      setIsReviewCancelModalOpen(false);
      toast.success(`Doctor cancellation request for ${orderToReview.order_id} has been ${reviewDecision.toLowerCase()}d.`, 'Cancellation Processed');
      fetchOrders();
    } catch (err) {
      setReviewError(err.response?.data?.detail || 'Failed to process cancellation request.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Lab Staff Direct Cancellation
  const handleOpenDirectCancel = (order) => {
    setOrderToDirectCancel(order);
    setDirectCancelReason('');
    setDirectCancelError('');
    setIsDirectCancelModalOpen(true);
  };

  const handleDirectCancelSubmit = async (e) => {
    e.preventDefault();
    if (!directCancelReason.trim()) {
      setDirectCancelError('Please specify the clinical or specimen reason for cancelling this test.');
      return;
    }
    setIsSubmittingDirectCancel(true);
    setDirectCancelError('');
    try {
      await labStaffService.cancelOrder(orderToDirectCancel.id, directCancelReason.trim());
      setIsDirectCancelModalOpen(false);
      toast.info(`Test order ${orderToDirectCancel.order_id} has been cancelled.`, 'Test Cancelled');
      fetchOrders();
    } catch (err) {
      setDirectCancelError(err.response?.data?.detail || 'Failed to cancel test order.');
    } finally {
      setIsSubmittingDirectCancel(false);
    }
  };

  // Tab counts
  const pendingActionCount = (orders || []).filter((o) => o.status === 'REQUESTED' || o.status === 'ORDERED' || o.status === 'ACCEPTED').length;
  const inProgressCount = (orders || []).filter((o) => o.status === 'IN_PROGRESS').length;
  const completedCount = (orders || []).filter((o) => o.status === 'COMPLETED').length;
  const cancellationRequestsCount = (orders || []).filter((o) => o.cancellation_requested && o.cancellation_status === 'REQUESTED').length;

  // Filtered orders
  const filteredOrders = (orders || []).filter((order) => {
    if (activeTab === 'PENDING_ACTION') {
      if (order.status !== 'REQUESTED' && order.status !== 'ORDERED' && order.status !== 'ACCEPTED') return false;
    } else if (activeTab === 'IN_PROGRESS') {
      if (order.status !== 'IN_PROGRESS') return false;
    } else if (activeTab === 'COMPLETED') {
      if (order.status !== 'COMPLETED') return false;
    } else if (activeTab === 'CANCELLATION_REQUESTS') {
      if (!order.cancellation_requested || order.cancellation_status !== 'REQUESTED') return false;
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
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Diagnostic Test Requests</h1>
          <p className="admin-page-subtitle">
            Manage physician-ordered laboratory diagnostics, intake specimens, update workflow stages, and process doctor cancellations.
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

      {/* Tabs Row */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: 'All Requests', count: orders.length },
          { key: 'PENDING_ACTION', label: 'Needs Intake / Acceptance', count: pendingActionCount },
          { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
          { key: 'COMPLETED', label: 'Completed', count: completedCount },
          { key: 'CANCELLATION_REQUESTS', label: 'Doctor Cancel Requests', count: cancellationRequestsCount },
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
          Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'requisition' : 'requisitions'}
        </span>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading laboratory diagnostic requisitions...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <ClipboardList size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Requisitions Match Criteria
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--admin-text-muted)' }}>
            {searchQuery || activeTab !== 'ALL'
              ? 'No laboratory orders match your current filter and search query.'
              : 'There are no active doctor test requests registered in the hospital database.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Patient Details</th>
                <th>Diagnostic Test</th>
                <th>Ordering Doctor</th>
                <th>Clinical Indication</th>
                <th>Ordered Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Workflow Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isRequested = order.status === 'REQUESTED' || order.status === 'ORDERED';
                const isAccepted = order.status === 'ACCEPTED' || order.status === 'SAMPLE_COLLECTED';
                const isInProgress = order.status === 'IN_PROGRESS';
                const isCompleted = order.status === 'COMPLETED';
                const isCancelled = order.status === 'CANCELLED';
                const hasPendingCancel = order.cancellation_requested && order.cancellation_status === 'REQUESTED';
                const hasReport = Boolean(order.report_file);

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
                          {order.doctor_name || 'Doctor'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          {order.doctor_specialization || 'Clinical'}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--admin-text-muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={order.clinical_notes || 'No notes'}
                      >
                        {order.clinical_notes || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                        {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                            Cancel Req
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Details Modal */}
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.35rem 0.6rem' }}
                          title="View Request Details"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>

                        {/* Accept Button */}
                        {isRequested && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '0.35rem 0.6rem' }}
                            title="Accept Test Requisition"
                            onClick={() => handleAccept(order.id)}
                          >
                            <Check size={15} />
                            <span>Accept</span>
                          </button>
                        )}

                        {/* Start Analysis Button */}
                        {isAccepted && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '0.35rem 0.6rem', background: '#f59e0b', borderColor: '#f59e0b' }}
                            title="Move to In Progress"
                            onClick={() => handleStartAnalysis(order.id)}
                          >
                            <Play size={15} />
                            <span>Start</span>
                          </button>
                        )}

                        {/* Enter Results */}
                        {(isAccepted || isInProgress) && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.6rem' }}
                            title="Enter Findings and Results"
                            onClick={() => navigate(`/lab-staff/enter-results/${order.id}`)}
                          >
                            <Activity size={15} />
                            <span>Enter Results</span>
                          </button>
                        )}

                        {/* Upload Report */}
                        {!isCancelled && !isCompleted && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.6rem' }}
                            title="Upload Report Document"
                            onClick={() => navigate(`/lab-staff/reports?orderId=${order.id}`)}
                          >
                            <UploadCloud size={15} />
                            <span>Upload</span>
                          </button>
                        )}

                        {/* Review Doctor Cancellation */}
                        {hasPendingCancel && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '0.35rem 0.6rem' }}
                            title="Review Doctor Cancellation Request"
                            onClick={() => handleOpenReviewCancel(order)}
                          >
                            <AlertTriangle size={15} />
                            <span>Review Cancel</span>
                          </button>
                        )}

                        {/* Direct Lab Cancellation (only eligible if not completed or cancelled) */}
                        {!isCompleted && !isCancelled && !hasPendingCancel && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-outline"
                            style={{ padding: '0.35rem 0.55rem', color: 'var(--admin-danger)', borderColor: 'var(--admin-danger-border)' }}
                            title="Cancel Test"
                            onClick={() => handleOpenDirectCancel(order)}
                          >
                            <Ban size={14} />
                          </button>
                        )}

                        {/* View & Download Report */}
                        {hasReport && (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '0.35rem 0.55rem' }}
                              title="View Diagnostic Report In-Page"
                              onClick={() => handleViewReportOnline(order)}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '0.35rem 0.55rem' }}
                              title="Download Report PDF/Image"
                              disabled={downloadingId === order.id}
                              onClick={() => handleDownloadReport(order)}
                            >
                              {downloadingId === order.id ? (
                                <Loader2 size={14} className="spinner-icon admin-spinner-teal" />
                              ) : (
                                <Download size={14} />
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
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Requisition Details {selectedOrder?.order_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Comprehensive laboratory diagnostic order record and specimen history.
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
                  {/* Status & Timing */}
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
                        Current Status
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                        Ordered At
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)', fontWeight: 500 }}>
                        {selectedOrder.ordered_at ? new Date(selectedOrder.ordered_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Patient Profile */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                      Patient Details
                    </span>
                    <h4 style={{ margin: '0.35rem 0 0.15rem', color: 'var(--admin-heading-color)' }}>
                      {selectedOrder.patient_name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                      Patient ID: {selectedOrder.patient_identifier || `PAT-${selectedOrder.patient}`} • Gender: {selectedOrder.patient_gender || '—'} • Phone: {selectedOrder.patient_phone || '—'}
                    </p>
                  </div>

                  {/* Doctor & Clinical Indication */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                      Physician Order & Indication
                    </span>
                    <h4 style={{ margin: '0.35rem 0 0.15rem', color: 'var(--admin-heading-color)' }}>
                      {selectedOrder.doctor_name} ({selectedOrder.doctor_specialization || 'Clinical Doctor'})
                    </h4>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', color: 'var(--admin-text-main)', lineHeight: 1.5 }}>
                      <strong>Clinical Notes:</strong> {selectedOrder.clinical_notes || 'None provided.'}
                    </p>
                  </div>

                  {/* Test Details */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                      Diagnostic Catalogue Test
                    </span>
                    <h4 style={{ margin: '0.35rem 0 0.15rem', color: 'var(--admin-heading-color)' }}>
                      {selectedOrder.test_name} ({selectedOrder.test_code || 'LAB-TEST'})
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                      Category: {selectedOrder.test_category} • Standard Reference Range: {selectedOrder.test_reference_range || 'Normal'}
                    </p>
                  </div>

                  {/* Existing Findings if entered */}
                  {selectedOrder.result_value && (
                    <div className="lab-findings-card">
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-heading-color)', textTransform: 'uppercase' }}>
                        Recorded Findings
                      </span>
                      <div className="lab-result-highlight-box" style={{ marginTop: '0.5rem' }}>
                        <span className="lab-result-val">
                          {selectedOrder.result_value} {selectedOrder.result_unit || ''}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', display: 'block', marginTop: '0.2rem' }}>
                          Reference Used: {selectedOrder.reference_range_used || 'Standard'}
                        </span>
                      </div>
                      {selectedOrder.result_interpretation && (
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--admin-text-main)' }}>
                          <strong>Interpretation:</strong> {selectedOrder.result_interpretation}
                        </p>
                      )}
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
          MODAL: REVIEW DOCTOR CANCELLATION REQUEST
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isReviewCancelModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !isSubmittingReview && setIsReviewCancelModalOpen(false)}>
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
                  <h3 className="admin-modal-title">Review Doctor Cancellation</h3>
                  <p className="admin-modal-subtitle">
                    Order: {orderToReview?.order_id} ({orderToReview?.test_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !isSubmittingReview && setIsReviewCancelModalOpen(false)}
                disabled={isSubmittingReview}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReviewCancelSubmit}>
              <div className="admin-modal-body">
                {reviewError && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{reviewError}</span>
                  </div>
                )}

                <div className="admin-glass-card" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                    Doctor's Reason for Cancellation
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--admin-text-main)' }}>
                    {orderToReview?.cancellation_reason || 'No clinical reason provided.'}
                  </p>
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Laboratory Action</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={`admin-btn ${reviewDecision === 'APPROVE' ? 'admin-btn-danger' : 'admin-btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setReviewDecision('APPROVE')}
                    >
                      <Ban size={16} />
                      <span>Approve Cancellation</span>
                    </button>
                    <button
                      type="button"
                      className={`admin-btn ${reviewDecision === 'REJECT' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setReviewDecision('REJECT')}
                    >
                      <Check size={16} />
                      <span>Reject & Proceed</span>
                    </button>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Laboratory Staff Decision Remarks</label>
                  <textarea
                    className="admin-form-input"
                    rows={3}
                    placeholder="Provide documentation for audit log..."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsReviewCancelModalOpen(false)}
                  disabled={isSubmittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`admin-btn ${reviewDecision === 'APPROVE' ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                      <span>Submitting...</span>
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DIRECT LAB STAFF CANCELLATION
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isDirectCancelModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !isSubmittingDirectCancel && setIsDirectCancelModalOpen(false)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
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
                  <Ban size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Cancel Diagnostic Test</h3>
                  <p className="admin-modal-subtitle">
                    Order: {orderToDirectCancel?.order_id} ({orderToDirectCancel?.test_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !isSubmittingDirectCancel && setIsDirectCancelModalOpen(false)}
                disabled={isSubmittingDirectCancel}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDirectCancelSubmit}>
              <div className="admin-modal-body">
                {directCancelError && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{directCancelError}</span>
                  </div>
                )}

                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Cancelling this requisition will permanently terminate processing. An audit log entry will be recorded with your staff identifier and timestamp.
                </p>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Reason for Cancellation <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    className="admin-form-input"
                    rows={3}
                    placeholder="e.g., Hemolyzed specimen, insufficient sample quantity, test discontinued by ward..."
                    value={directCancelReason}
                    onChange={(e) => setDirectCancelReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsDirectCancelModalOpen(false)}
                  disabled={isSubmittingDirectCancel}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-danger"
                  disabled={isSubmittingDirectCancel}
                >
                  {isSubmittingDirectCancel ? (
                    <>
                      <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </form>
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

export default LabStaffTestRequestsPage;
