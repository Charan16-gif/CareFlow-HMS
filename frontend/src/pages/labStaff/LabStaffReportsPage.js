import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import labStaffService from '../../services/labStaffService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FileCheck,
  Search,
  Upload,
  Download,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileSpreadsheet,
  Check,
  Mail,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const LabStaffReportsPage = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, AWAITING, UPLOADED, COMPLETED

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer Modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerOrder, setViewerOrder] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Freeze background scrolling when modal is open
  useEffect(() => {
    if (isUploadModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isUploadModalOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isUploadModalOpen) {
        setIsUploadModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploadModalOpen]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await labStaffService.getOrders(
        searchQuery ? { search: searchQuery } : {}
      );
      const list = Array.isArray(data) ? data : data?.results || [];
      setOrders(list);

      // Auto-open upload modal if orderId in query
      if (initialOrderId) {
        const found = list.find((o) => String(o.id) === String(initialOrderId));
        if (found) {
          if (found.status === 'COMPLETED' || found.status === 'CANCELLED') {
            toast.info(`Test #${found.order_id || found.id} is already ${found.status.toLowerCase()} and cannot accept new reports.`, 'Order Finalized');
          } else {
            setSelectedOrderForUpload(found);
            setIsUploadModalOpen(true);
          }
        }
      }
    } catch (err) {
      let msg = 'Failed to load diagnostic records from database.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, initialOrderId]);

  useEffect(() => {
    document.title = 'Manage Diagnostic Reports — CareFlow HMS Lab Staff';
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenUploadModal = (order) => {
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      toast.warning('Completed test records are permanently locked and cannot have reports uploaded or replaced.');
      return;
    }
    setSelectedOrderForUpload(order);
    setSelectedFile(null);
    setMarkCompleted(false);
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedOrderForUpload(null);
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB maximum limit. Please choose a smaller file.');
      setSelectedFile(null);
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setUploadError('Invalid format. Only PDF, JPG, and PNG files are supported.');
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderForUpload || !selectedFile) {
      setUploadError('Please select a valid report file (PDF or image).');
      return;
    }
    if (selectedOrderForUpload.status === 'COMPLETED' || selectedOrderForUpload.status === 'CANCELLED') {
      setUploadError('This test is already completed and locked. Uploading reports is not allowed.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await labStaffService.uploadReport(
        selectedOrderForUpload.id,
        selectedFile,
        markCompleted
      );
      toast.success(
        `Report successfully attached for order #${selectedOrderForUpload.order_id || selectedOrderForUpload.id}. An email notification has been dispatched to the patient.`,
        'Report Uploaded'
      );
      setSuccessToast(`Report successfully attached for order #${selectedOrderForUpload.order_id || selectedOrderForUpload.id}.`);
      handleCloseUploadModal();
      fetchOrders();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      let msg = 'Failed to upload diagnostic report file.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.report_file) msg = err.response.data.report_file.join(' ');
        else msg = Object.values(err.response.data).flat().join(' ');
      }
      toast.error(msg, 'Upload Failed');
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (order) => {
    setDownloadingId(order.id);
    toast.info(`Preparing report download for order #${order.order_id || order.id}...`, 'Downloading');
    try {
      const blob = await labStaffService.downloadReport(order.id);
      downloadReportFile(blob, order, 'Lab_Report');
    } catch (err) {
      toast.error('Unable to retrieve diagnostic report file.', 'Download Error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewOnline = async (order) => {
    setViewerOrder(order);
    setViewerModalOpen(true);
    setViewerBlob(null);
    setLoadingViewer(true);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      setViewerBlob(blob);
    } catch (err) {
      toast.error('Unable to open diagnostic report document.', 'View Error');
    } finally {
      setLoadingViewer(false);
    }
  };

  const handleEmailReport = async (order) => {
    try {
      toast.info(`Sending diagnostic report for order #${order.order_id || order.id} to patient email...`, 'Dispatching Email');
      const res = await labStaffService.emailReport(order.id);
      toast.success(res.message || 'Report emailed to patient successfully!', 'Email Dispatched');
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.response?.data?.error || 'Could not send report email. Please check patient email.',
        'Email Dispatch Failed'
      );
    }
  };

  // Filter tabs - completed tests are excluded from Awaiting Report
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'AWAITING') return !o.report_file && o.status !== 'CANCELLED' && o.status !== 'COMPLETED';
    if (activeTab === 'UPLOADED') return !!o.report_file;
    if (activeTab === 'COMPLETED') return o.status === 'COMPLETED';
    return true;
  });

  const awaitingCount = orders.filter((o) => !o.report_file && o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length;
  const uploadedCount = orders.filter((o) => !!o.report_file).length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="admin-overview-container" style={{ maxWidth: '1380px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileCheck size={26} color="var(--color-primary-400)" />
            Upload & Manage Diagnostic Reports
          </h1>
          <p className="admin-page-subtitle">
            Attach official PDF documentation, imaging results, and verified laboratory reports to diagnostic orders.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(8px)'
        }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{successToast}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`admin-tab-btn ${activeTab === 'ALL' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All Requests <span className="admin-tab-count">{orders.length}</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'AWAITING' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('AWAITING')}
        >
          Awaiting Report <span className="admin-tab-count" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>{awaitingCount}</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'UPLOADED' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('UPLOADED')}
        >
          Reports Attached <span className="admin-tab-count" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>{uploadedCount}</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'COMPLETED' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          Completed <span className="admin-tab-count">{completedCount}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper" style={{ flex: 1, maxWidth: '420px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by order ID, patient, doctor, or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="admin-table-record-count">
          Showing {filteredOrders.length} records
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="admin-error-box" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Loader2 size={32} className="spin-animation" style={{ color: 'var(--color-primary-400)', margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Retrieving laboratory records from PostgreSQL...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <FileSpreadsheet size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No diagnostic records match your active search or filter.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>PATIENT</th>
                <th>TEST DETAILS</th>
                <th>REQUESTING DOCTOR</th>
                <th>STATUS</th>
                <th>REPORT STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-400)' }}>
                      {o.order_id || `#${o.id}`}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.9rem' }}>{o.patient_name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {o.patient_gender} {o.patient_age ? `• ${o.patient_age} yrs` : ''}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.9rem' }}>{o.test_name}</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                      {o.test_detail?.category || 'Clinical Pathology'}
                    </div>
                  </td>
                  <td>
                    <span>{o.doctor_name || 'Assigned Physician'}</span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                      {o.doctor_department || 'General Medicine'}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${o.status ? o.status.toLowerCase() : 'requested'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    {o.report_file ? (
                      <span className="admin-badge admin-badge-completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Document Attached
                      </span>
                    ) : o.status === 'COMPLETED' ? (
                      <span className="admin-badge admin-badge-completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Results Recorded
                      </span>
                    ) : (
                      <span className="admin-badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-muted)' }}>
                        Pending File
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {o.report_file ? (
                        <>
                          <button
                            onClick={() => handleViewOnline(o)}
                            disabled={downloadingId === o.id}
                            className="admin-action-btn"
                            title="View Report Online"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(o)}
                            disabled={downloadingId === o.id}
                            className="admin-action-btn"
                            title="Download Report File"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleEmailReport(o)}
                            className="admin-action-btn"
                            title="Email Report to Patient"
                          >
                            <Mail size={14} />
                          </button>
                          {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenUploadModal(o)}
                              className="admin-action-btn"
                              title="Replace Report File"
                            >
                              <Upload size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenUploadModal(o)}
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Upload size={13} /> Upload
                          </button>
                        )
                      )}

                      <Link
                        to={`/lab-staff/results/${o.id}`}
                        className="admin-action-btn"
                        title="View Full Test Details"
                        style={{ textDecoration: 'none' }}
                      >
                        <FileText size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload / Replace Report Modal */}
      {isUploadModalOpen && selectedOrderForUpload && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={handleCloseUploadModal}>
            <div
              className="admin-modal-card admin-modal-card-lg admin-modal-box"
              style={{ maxWidth: '540px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Upload size={22} color="var(--primary-cyan, #06b6d4)" />
                  <h3 className="admin-modal-title">
                    {selectedOrderForUpload.report_file ? 'Replace Diagnostic Report' : 'Upload Diagnostic Report'}
                  </h3>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn admin-modal-close"
                  onClick={handleCloseUploadModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="admin-modal-body" style={{ padding: '1.25rem 1.5rem' }}>
                  {/* Order Context Card */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Order ID:</span>
                      <strong>{selectedOrderForUpload.order_id || `#${selectedOrderForUpload.id}`}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Patient:</span>
                      <strong>{selectedOrderForUpload.patient_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Test:</span>
                      <strong>{selectedOrderForUpload.test_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Current Status:</span>
                      <span className={`admin-badge admin-badge-${selectedOrderForUpload.status ? selectedOrderForUpload.status.toLowerCase() : 'requested'}`} style={{ fontSize: '0.75rem' }}>
                        {selectedOrderForUpload.status}
                      </span>
                    </div>
                  </div>

                  {uploadError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* File Drop / Select Area */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label" style={{ marginBottom: '8px', display: 'block' }}>
                      Select Report File (PDF, PNG, JPG) *
                    </label>

                    <div style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '8px',
                      padding: '1.75rem 1rem',
                      textAlign: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        style={{
                          opacity: 0,
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer'
                        }}
                      />

                      <Upload size={32} style={{ color: 'var(--color-primary-400)', margin: '0 auto 8px' }} />
                      {selectedFile ? (
                        <div>
                          <strong style={{ color: '#10b981', display: 'block', fontSize: '0.9rem' }}>
                            {selectedFile.name}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500 }}>
                            Click or drag file here to attach
                          </p>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                            Supported formats: PDF, JPG, PNG (Max 5.0 MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mark Completed Checkbox */}
                  {selectedOrderForUpload.status !== 'COMPLETED' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        id="mark_completed_check"
                        checked={markCompleted}
                        onChange={(e) => setMarkCompleted(e.target.checked)}
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                      />
                      <label htmlFor="mark_completed_check" style={{ fontSize: '0.84rem', cursor: 'pointer' }}>
                        <strong>Mark test as COMPLETED</strong> upon successful document attachment. (Locks the test order against future changes).
                      </label>
                    </div>
                  )}
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-modal-btn admin-modal-btn-cancel admin-btn admin-btn-secondary"
                    onClick={handleCloseUploadModal}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-modal-btn admin-modal-btn-confirm admin-btn admin-btn-primary"
                    disabled={uploading || !selectedFile}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="spin-animation" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload & Attach
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

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

export default LabStaffReportsPage;
