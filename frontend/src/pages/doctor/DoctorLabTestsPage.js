import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FlaskConical,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Loader2,
  X,
  AlertTriangle,
  Download,
  FileText,
  Clock,
  Ban,
  Check,
  Activity,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const DoctorLabTestsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dropdown data for creating test orders
  const [eligiblePatients, setEligiblePatients] = useState([]);
  const [labTestsCatalogue, setLabTestsCatalogue] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState('catalogue'); // 'catalogue' | 'custom'
  const [createFormData, setCreateFormData] = useState({
    patient: '',
    test: '',
    custom_test_name: '',
    custom_test_category: 'HEMATOLOGY',
    clinical_notes: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Cancellation Request Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Downloading state
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer Modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerOrder, setViewerOrder] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Freeze background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isDetailsModalOpen || isCancelModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCreateModalOpen, isDetailsModalOpen, isCancelModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCreateModalOpen && !isSubmittingCreate) setIsCreateModalOpen(false);
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        if (isCancelModalOpen && !isSubmittingCancel) setIsCancelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isDetailsModalOpen, isCancelModalOpen, isSubmittingCreate, isSubmittingCancel]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getLabOrders(
        searchQuery ? { search: searchQuery } : {}
      );
      setOrders(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load laboratory orders. Please try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const location = useLocation();

  useEffect(() => {
    document.title = 'Lab Tests & Diagnostic Orders — CareFlow HMS Doctor';
    fetchOrders();
  }, [fetchOrders]);

  // Handle navigation from appointments with preselected patient
  useEffect(() => {
    if (location.state?.selectedPatientId) {
      handleOpenCreateModal(location.state.selectedPatientId, location.state.selectedAppointmentId);
    }
  }, [location.state]);

  // Fetch dropdown data on opening create modal
  const handleOpenCreateModal = async (presetPatientId = null, presetAppointmentId = null) => {
    setIsCreateModalOpen(true);
    setCreateErrors({});
    setCreateFormData({
      patient: presetPatientId || '',
      appointment: presetAppointmentId || null,
      test: '',
      custom_test_name: '',
      custom_test_category: 'HEMATOLOGY',
      clinical_notes: '',
    });
    setLoadingDropdowns(true);
    try {
      const [patientsRes, testsRes] = await Promise.all([
        doctorService.getEligiblePatients('', 'lab_test'),
        doctorService.getLabTests(),
      ]);
      const patients = Array.isArray(patientsRes) ? patientsRes : patientsRes?.results || [];
      setEligiblePatients(patients);
      setLabTestsCatalogue(Array.isArray(testsRes) ? testsRes : testsRes?.results || []);

      if (!presetPatientId && patients.length > 0) {
        setCreateFormData((prev) => ({
          ...prev,
          patient: patients[0].id,
          appointment: patients[0].appointment_id || null,
        }));
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!createFormData.patient || eligiblePatients.length === 0) {
      errors.patient = 'Please select a checked-in patient assigned to your care.';
    }
    if (createMode === 'catalogue' && !createFormData.test) {
      errors.test = 'Please select a laboratory diagnostic test.';
    }
    if (createMode === 'custom' && !createFormData.custom_test_name.trim()) {
      errors.custom_test_name = 'Please enter the specific diagnostic test name.';
    }
    if (!createFormData.clinical_notes.trim()) {
      errors.clinical_notes = 'Please provide clinical justification or diagnostic indication.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsSubmittingCreate(true);
    setCreateErrors({});
    try {
      const payload = {
        patient: parseInt(createFormData.patient, 10),
        clinical_notes: createFormData.clinical_notes.trim(),
      };
      if (createFormData.appointment) {
        payload.appointment = createFormData.appointment;
      }
      if (createMode === 'catalogue') {
        payload.test = parseInt(createFormData.test, 10);
      } else {
        payload.custom_test_name = createFormData.custom_test_name.trim();
        payload.custom_test_category = createFormData.custom_test_category;
      }

      await doctorService.createLabOrder(payload);
      setIsCreateModalOpen(false);
      const successMessage = 'Laboratory diagnostic test request submitted successfully! Forwarded to Pathology.';
      toast.success(successMessage, 'Lab Test Ordered');
      fetchOrders();
    } catch (err) {
      let msg = 'Failed to submit laboratory request. Please check input.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'object') {
          setCreateErrors(err.response.data);
          if (err.response.data.appointment) {
            msg = Array.isArray(err.response.data.appointment) ? err.response.data.appointment[0] : err.response.data.appointment;
          } else if (err.response.data.patient) {
            msg = Array.isArray(err.response.data.patient) ? err.response.data.patient[0] : err.response.data.patient;
          } else if (err.response.data.detail) {
            msg = err.response.data.detail;
          }
        } else {
          msg = err.response.data;
        }
      }
      toast.error(typeof msg === 'string' ? msg : 'Failed to order lab test.', 'Order Error');
      setCreateErrors((prev) => ({ ...prev, non_field_errors: msg }));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenDetails = async (order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await doctorService.getLabOrderDetails(order.id);
      setSelectedOrder(detailed);
    } catch (err) {
      // Keep existing summary
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenCancelModal = (order) => {
    setOrderToCancel(order);
    setCancelReason('');
    setCancelError('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please state the clinical or administrative reason for cancellation.');
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError('');
    try {
      await doctorService.requestCancellation(orderToCancel.id, cancelReason.trim());
      setIsCancelModalOpen(false);
      toast.info(
        `Cancellation request for ${orderToCancel.order_id} recorded and forwarded to Laboratory Staff.`,
        'Cancellation Requested'
      );
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderToCancel.id) {
        setSelectedOrder((prev) => ({
          ...prev,
          cancellation_requested: true,
          cancellation_status: 'REQUESTED',
          cancellation_reason: cancelReason.trim(),
        }));
      }
    } catch (err) {
      let msg = 'Unable to submit cancellation request.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.reason) msg = err.response.data.reason;
      }
      setCancelError(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleDownloadReport = async (order) => {
    setDownloadingId(order.id);
    try {
      const blob = await doctorService.downloadReport(order.id);
      downloadReportFile(blob, order, 'Lab_Report');
    } catch (err) {
      toast.error('Unable to download diagnostic report file. Please verify file is ready.', 'Download Error');
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
      const blob = await doctorService.downloadReport(order.id);
      setViewerBlob(blob);
    } catch (err) {
      toast.error('Unable to open diagnostic report document.', 'Viewer Error');
    } finally {
      setLoadingViewer(false);
    }
  };

  // Metrics calculation
  const totalOrders = orders.length;
  const requestedCount = orders.filter((o) => o.status === 'REQUESTED' || o.status === 'ORDERED').length;
  const inProgressCount = orders.filter(
    (o) => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED' || o.status === 'SAMPLE_COLLECTED'
  ).length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const testName = (order.test_name || order.custom_test_name || '').toLowerCase();
      const orderId = (order.order_id || '').toLowerCase();
      const patientName = `${order.patient_name || ''} ${order.patient_identifier || ''}`.toLowerCase();
      return testName.includes(q) || orderId.includes(q) || patientName.includes(q);
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

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Laboratory Diagnostic Orders</h1>
          <p className="admin-page-subtitle">
            Order clinical diagnostics, track specimen processing, and review verified laboratory findings.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={handleOpenCreateModal}
        >
          <Plus size={18} />
          <span>Request Lab Test</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Metric Summary Cards */}
      <section className="admin-stat-grid" aria-label="Laboratory Diagnostics Statistics">
        <div className="admin-stat-card admin-stat-card-navy">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Total Test Orders</span>
            <div className="admin-stat-icon-box">
              <FlaskConical size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{totalOrders}</div>
          <div className="admin-stat-footer">
            <span>All requisitions placed</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-cyan">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Requested / Queued</span>
            <div className="admin-stat-icon-box">
              <Clock size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{requestedCount}</div>
          <div className="admin-stat-footer">
            <span>Specimens awaiting processing</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-amber">
          <div className="admin-stat-top">
            <span className="admin-stat-title">In Progress</span>
            <div className="admin-stat-icon-box">
              <Activity size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{inProgressCount}</div>
          <div className="admin-stat-footer">
            <span>Active laboratory analysis</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-green">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Completed & Reports</span>
            <div className="admin-stat-icon-box">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{completedCount}</div>
          <div className="admin-stat-footer">
            <span>Verified findings & reports ready</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>
      </section>

      {/* Tabs Row for Status Filtering */}
      <div className="admin-tabs-row" style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: 'All Orders', count: totalOrders },
          { key: 'REQUESTED', label: 'Requested', count: requestedCount },
          { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
          { key: 'COMPLETED', label: 'Completed', count: completedCount },
          { key: 'CANCELLED', label: 'Cancelled', count: orders.filter((o) => o.status === 'CANCELLED').length },
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
            placeholder="Search by test name, order ID, patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="admin-table-record-count">
          Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading diagnostic test orders from PostgreSQL database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <FlaskConical size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Laboratory Orders Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--admin-text-muted)' }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No laboratory orders match your search and filter criteria.'
              : 'You have not ordered any diagnostic tests yet. Click below to request a test for a patient.'}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} />
            <span>Request Lab Test</span>
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
              <thead>
                <tr>
                  <th>Order Identifier</th>
                  <th>Patient Details</th>
                  <th>Diagnostic Test</th>
                  <th>Date Ordered</th>
                  <th>Current Status</th>
                  <th>Results / Report</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isEligibleForCancel =
                    order.status !== 'COMPLETED' &&
                    order.status !== 'CANCELLED' &&
                    !order.cancellation_requested;
                  const hasReport = Boolean(order.report_file);
                  const hasResult = Boolean(order.result_value);

                  return (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {order.order_id}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {order.patient_name || 'Patient'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ID: {order.patient_identifier || `PAT-${order.patient}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {order.test_name || 'Diagnostic'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {order.test_category || 'General'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {getStatusBadge(order.status)}
                          {order.cancellation_requested && order.status !== 'CANCELLED' && (
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
                        {order.status === 'COMPLETED' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {hasResult && (
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#10b981' }}>
                                Result: {order.result_value} {order.result_unit || ''}
                              </span>
                            )}
                            {hasReport ? (
                              <span style={{ fontSize: '0.78rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={12} />
                                PDF/Image Report Ready
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Structured Findings Only
                              </span>
                            )}
                          </div>
                        ) : order.status === 'CANCELLED' ? (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Order Cancelled
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Specimen Processing...
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="View Diagnostic Details"
                            onClick={() => handleOpenDetails(order)}
                          >
                            <Eye size={15} />
                            <span>Details</span>
                          </button>

                          {hasReport && (
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
                                className="admin-btn admin-btn-primary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Download Diagnostic Report"
                                disabled={downloadingId === order.id}
                                onClick={() => handleDownloadReport(order)}
                              >
                                {downloadingId === order.id ? (
                                  <Loader2 size={15} className="admin-spinner" />
                                ) : (
                                  <Download size={15} />
                                )}
                                <span>Download</span>
                              </button>
                            </>
                          )}

                          {isEligibleForCancel && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              style={{ padding: '0.35rem 0.65rem' }}
                              title="Request Test Cancellation"
                              onClick={() => handleOpenCancelModal(order)}
                            >
                              <Ban size={15} />
                              <span>Cancel</span>
                            </button>
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
          MODAL: REQUEST LAB TEST
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isCreateModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !isSubmittingCreate && setIsCreateModalOpen(false)}>
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
                  <h3 className="admin-modal-title">Request Laboratory Diagnostic Test</h3>
                  <p className="admin-modal-subtitle">
                    Prescribe laboratory diagnostics for patients connected to your clinical appointments or treatment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => !isSubmittingCreate && setIsCreateModalOpen(false)}
                disabled={isSubmittingCreate}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {createErrors.non_field_errors && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{createErrors.non_field_errors}</span>
                  </div>
                )}

                {/* Patient Selection */}
                <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="admin-form-label">
                    Patient Under Your Care (Checked-in & Assigned Only) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {loadingDropdowns ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Loader2 size={16} className="admin-spinner" />
                      <span>Loading authorized checked-in patients...</span>
                    </div>
                  ) : eligiblePatients.length === 0 ? (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        color: '#f59e0b',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span>
                        No active checked-in patients are currently assigned to your care. Diagnostic lab tests can only be requested for patients who have completed reception check-in and have not yet checked out.
                      </span>
                    </div>
                  ) : (
                    <select
                      className="admin-form-input"
                      value={createFormData.patient}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const foundPatient = eligiblePatients.find((p) => String(p.id) === String(selectedId));
                        setCreateFormData({
                          ...createFormData,
                          patient: selectedId,
                          appointment: foundPatient?.appointment_id || null,
                        });
                      }}
                    >
                      <option value="">-- Select Active Checked-in Patient --</option>
                      {eligiblePatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || `${p.first_name} ${p.last_name}`} (ID: {p.patient_id || p.patient_id_code}) — Checked In {p.appointment_code ? `[Apt: ${p.appointment_code}]` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {createErrors.patient && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {createErrors.patient}
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Only active checked-in patients are eligible. Only one laboratory test request can be ordered per consultation; second requests are strictly prevented.
                  </span>
                </div>

                {/* Mode Selector: Catalogue vs Custom Test */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="admin-form-label">Diagnostic Test Selection</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={`admin-btn ${createMode === 'catalogue' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      style={{ flex: 1, padding: '0.5rem' }}
                      onClick={() => setCreateMode('catalogue')}
                    >
                      Catalogue Selection
                    </button>
                    <button
                      type="button"
                      className={`admin-btn ${createMode === 'custom' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                      style={{ flex: 1, padding: '0.5rem' }}
                      onClick={() => setCreateMode('custom')}
                    >
                      Custom Test Entry
                    </button>
                  </div>
                </div>

                {/* Catalogue Dropdown */}
                {createMode === 'catalogue' ? (
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label">
                      Select Laboratory Test <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="admin-form-input"
                      value={createFormData.test}
                      onChange={(e) => setCreateFormData({ ...createFormData, test: e.target.value })}
                    >
                      <option value="">-- Select Standard Diagnostic Test --</option>
                      {labTestsCatalogue.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.test_code} - {t.test_name} ({t.category}) • ${t.price}
                        </option>
                      ))}
                    </select>
                    {createErrors.test && (
                      <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {createErrors.test}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="admin-form-label">
                        Diagnostic Test Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="e.g., High-Resolution Serum Ferritin Panel"
                        value={createFormData.custom_test_name}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, custom_test_name: e.target.value })
                        }
                      />
                      {createErrors.custom_test_name && (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                          {createErrors.custom_test_name}
                        </span>
                      )}
                    </div>

                    <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="admin-form-label">Category</label>
                      <select
                        className="admin-form-input"
                        value={createFormData.custom_test_category}
                        onChange={(e) =>
                          setCreateFormData({ ...createFormData, custom_test_category: e.target.value })
                        }
                      >
                        <option value="HEMATOLOGY">Hematology</option>
                        <option value="BIOCHEMISTRY">Biochemistry</option>
                        <option value="MICROBIOLOGY">Microbiology</option>
                        <option value="PATHOLOGY">Pathology</option>
                        <option value="RADIOLOGY">Radiology / Imaging</option>
                        <option value="IMMUNOLOGY">Immunology</option>
                        <option value="URINALYSIS">Urinalysis</option>
                        <option value="OTHER">Other Diagnostic</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Clinical Notes / Indication */}
                <div className="admin-form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="admin-form-label">
                    Clinical Notes & Diagnostic Indication <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    className="admin-form-input"
                    rows={4}
                    placeholder="Provide clinical rationale (e.g. assess microcytic anemia, monitor renal clearance, pre-operative screening)..."
                    value={createFormData.clinical_notes}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, clinical_notes: e.target.value })
                    }
                  />
                  {createErrors.clinical_notes && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {createErrors.clinical_notes}
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmittingCreate || eligiblePatients.length === 0}
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 size={16} className="admin-spinner" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Submit Lab Test Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW TEST ORDER DETAILS & RESULTS
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
                <div className="admin-metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', width: 36, height: 36 }}>
                  <Activity size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Diagnostic Order {selectedOrder?.order_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Full laboratory requisition record, structured findings, and diagnostic documents.
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
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Refreshing order record...</p>
                </div>
              ) : selectedOrder ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.15rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                        Processing Status
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    {selectedOrder.completed_at && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                          Completed At
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {new Date(selectedOrder.completed_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cancellation Alert if applicable */}
                  {selectedOrder.cancellation_requested && (
                    <div className="admin-alert admin-alert-warning">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Cancellation Status: {selectedOrder.cancellation_status}</strong>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                          Reason: {selectedOrder.cancellation_reason}
                        </p>
                        {selectedOrder.cancellation_remarks && (
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                            Lab Remarks: {selectedOrder.cancellation_remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Patient Profile
                      </span>
                      <h4 style={{ margin: '0.3rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
                        {selectedOrder.patient_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        ID: {selectedOrder.patient_identifier || `PAT-${selectedOrder.patient}`} • Phone: {selectedOrder.patient_phone || '—'}
                      </p>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Diagnostic Test
                      </span>
                      <h4 style={{ margin: '0.3rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
                        {selectedOrder.test_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Code: {selectedOrder.test_code || '—'} • Category: {selectedOrder.test_category || 'Diagnostic'}
                      </p>
                    </div>
                  </div>

                  {/* Clinical Reason */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Clinical Reason & Notes
                    </span>
                    <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      {selectedOrder.clinical_notes || 'No clinical notes provided.'}
                    </p>
                  </div>

                  {/* Structured Results Section */}
                  <div className="admin-glass-card" style={{ padding: '1.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        Structured Laboratory Findings
                      </span>
                      {selectedOrder.assigned_staff_name && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Technician: {selectedOrder.assigned_staff_name}
                        </span>
                      )}
                    </div>

                    {selectedOrder.status === 'COMPLETED' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Quantitative / Qualitative Value
                            </span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#10b981' }}>
                              {selectedOrder.result_value || 'Recorded'} {selectedOrder.result_unit || ''}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Clinical Reference Range
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {selectedOrder.reference_range_used || selectedOrder.test_reference_range || 'Normal'}
                            </span>
                          </div>
                        </div>

                        {selectedOrder.result_interpretation && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Interpretation
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {selectedOrder.result_interpretation}
                            </p>
                          </div>
                        )}

                        {selectedOrder.result_notes && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Laboratory Remarks & Notes
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                              {selectedOrder.result_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                        Diagnostic specimen is currently under laboratory evaluation. Verified results will appear here once finalized by laboratory staff.
                      </p>
                    )}
                  </div>

                  {/* Attached Diagnostic Report File */}
                  {selectedOrder.report_file && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={28} style={{ color: '#3b82f6' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            Laboratory Report Document
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Verified PDF/Image attachment available
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  )}
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REQUEST CANCELLATION
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isCancelModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !isSubmittingCancel && setIsCancelModalOpen(false)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="admin-metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', width: 36, height: 36 }}>
                  <Ban size={20} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Request Test Cancellation</h3>
                  <p className="admin-modal-subtitle">
                    Order: {orderToCancel?.order_id} ({orderToCancel?.test_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => !isSubmittingCancel && setIsCancelModalOpen(false)}
                disabled={isSubmittingCancel}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit}>
              <div className="admin-modal-body">
                {cancelError && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{cancelError}</span>
                  </div>
                )}

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Under hospital laboratory protocols, doctors cannot directly delete or cancel laboratory requisitions once registered. Your cancellation request will be submitted to Laboratory Staff for verification and processing.
                </p>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Cancellation Reason <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    className="admin-form-input"
                    rows={3}
                    placeholder="Provide reason for cancellation (e.g. test no longer indicated, duplicate request, patient discharged)..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isSubmittingCancel}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-danger"
                  disabled={isSubmittingCancel}
                >
                  {isSubmittingCancel ? (
                    <>
                      <Loader2 size={16} className="admin-spinner" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Ban size={16} />
                      <span>Submit Cancellation Request</span>
                    </>
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

export default DoctorLabTestsPage;
