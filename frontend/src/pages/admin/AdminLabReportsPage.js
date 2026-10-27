import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FileSpreadsheet,
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
  Shield,
  FileCheck,
  FlaskConical,
  ArrowRight,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const AdminLabReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Details Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Downloading state
  const [downloadingId, setDownloadingId] = useState(null);

  // In-Page Document Viewer Modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerReport, setViewerReport] = useState(null);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  // Freeze background scrolling
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

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getLabReports(
        searchQuery ? { search: searchQuery } : {}
      );
      setReports(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load laboratory reports from database.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'Laboratory Reports & Diagnostic Archive — CareFlow HMS Admin';
    fetchReports();
  }, [fetchReports]);

  const handleOpenDetails = async (report) => {
    setSelectedReport(report);
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await adminService.getLabReportDetails(report.id);
      setSelectedReport(detailed);
    } catch (err) {
      // Fallback
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReport = async (report) => {
    setDownloadingId(report.id);
    try {
      const blob = await adminService.downloadReport(report.id);
      downloadReportFile(blob, report, 'Lab_Report');
    } catch (err) {
      toast.error('Unable to retrieve diagnostic report file.', 'Download Error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewReportOnline = async (report) => {
    setViewerReport(report);
    setViewerModalOpen(true);
    setViewerBlob(null);
    setLoadingViewer(true);
    try {
      const blob = await adminService.downloadReport(report.id);
      setViewerBlob(blob);
    } catch (err) {
      toast.error('Unable to open diagnostic report document.', 'Viewer Error');
    } finally {
      setLoadingViewer(false);
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
  const totalReports = reports.length;
  const completedReports = reports.filter((r) => r.status === 'COMPLETED').length;
  const inProgressReports = reports.filter(
    (r) => r.status === 'IN_PROGRESS' || r.status === 'ACCEPTED' || r.status === 'SAMPLE_COLLECTED'
  ).length;
  const filesAvailableCount = reports.filter((r) => Boolean(r.report_file)).length;

  // Filtered
  const filteredReports = reports.filter((report) => {
    if (statusFilter !== 'ALL' && report.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const testName = (report.test_name || report.custom_test_name || '').toLowerCase();
      const orderId = (report.order_id || '').toLowerCase();
      const patientName = `${report.patient_name || ''} ${report.patient_identifier || ''}`.toLowerCase();
      const doctorName = `${report.doctor_name || ''}`.toLowerCase();
      return testName.includes(q) || orderId.includes(q) || patientName.includes(q) || doctorName.includes(q);
    }
    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 className="admin-page-title" style={{ margin: 0 }}>Laboratory Reports Archive</h1>
            <span
              className="admin-badge"
              style={{
                background: 'rgba(148, 163, 184, 0.15)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                fontSize: '0.75rem',
              }}
            >
              <Shield size={11} style={{ marginRight: '3px' }} />
              Read-Only
            </span>
          </div>
          <p className="admin-page-subtitle">
            Administrative read-only directory of diagnostic laboratory requisitions, structured findings, and official clinical reports.
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
      <section className="admin-stat-grid" aria-label="Laboratory Archive Statistics">
        <div className="admin-stat-card admin-stat-card-navy">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Total Lab Requisitions</span>
            <div className="admin-stat-icon-box">
              <FlaskConical size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{totalReports}</div>
          <div className="admin-stat-footer">
            <span>All archived requisitions</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-green">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Completed Tests</span>
            <div className="admin-stat-icon-box">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{completedReports}</div>
          <div className="admin-stat-footer">
            <span>Verified diagnostics</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-amber">
          <div className="admin-stat-top">
            <span className="admin-stat-title">Specimens In Progress</span>
            <div className="admin-stat-icon-box">
              <Activity size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{inProgressReports}</div>
          <div className="admin-stat-footer">
            <span>Under active analysis</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card-cyan">
          <div className="admin-stat-top">
            <span className="admin-stat-title">PDF / Image Reports</span>
            <div className="admin-stat-icon-box">
              <FileText size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{filesAvailableCount}</div>
          <div className="admin-stat-footer">
            <span>Digital documents archived</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>
      </section>

      {/* Tabs Row */}
      <div className="admin-tabs-row" style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: 'All Requisitions', count: totalReports },
          { key: 'COMPLETED', label: 'Completed', count: completedReports },
          { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressReports },
          { key: 'REQUESTED', label: 'Requested', count: reports.filter((r) => r.status === 'REQUESTED' || r.status === 'ORDERED').length },
          { key: 'CANCELLED', label: 'Cancelled', count: reports.filter((r) => r.status === 'CANCELLED').length },
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
            placeholder="Filter by order ID, patient, doctor, test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="admin-table-record-count">
          Showing {filteredReports.length} {filteredReports.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Read-Only Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading laboratory diagnostic archive from PostgreSQL database...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <FileSpreadsheet size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Laboratory Records Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto', color: 'var(--admin-text-muted)' }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No laboratory reports match your search and filter criteria.'
              : 'No diagnostic requisitions have been logged in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Diagnostic Test</th>
                  <th>Patient Details</th>
                  <th>Ordering Physician</th>
                  <th>Requisition Date</th>
                  <th>Completion Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Report Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const hasReport = Boolean(report.report_file);

                  return (
                    <tr key={report.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {report.order_id}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {report.test_name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {report.test_category || 'Diagnostic'} • Code: {report.test_code || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {report.patient_name}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ID: {report.patient_identifier || `PAT-${report.patient}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {report.doctor_name || 'Physician'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {report.doctor_specialization || 'Clinical Staff'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {report.ordered_at ? new Date(report.ordered_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {report.completed_at ? new Date(report.completed_at).toLocaleDateString() : 'Pending'}
                        </span>
                      </td>
                      <td>{getStatusBadge(report.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.35rem 0.65rem' }}
                            title="View Full Test Metadata & Findings"
                            onClick={() => handleOpenDetails(report)}
                          >
                            <Eye size={15} />
                            <span>Metadata</span>
                          </button>

                          {hasReport && (
                            <>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Open Diagnostic Report Document in Page"
                                onClick={() => handleViewReportOnline(report)}
                              >
                                <FileText size={15} />
                                <span>View Document</span>
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Download Report File"
                                disabled={downloadingId === report.id}
                                onClick={() => handleDownloadReport(report)}
                              >
                                {downloadingId === report.id ? (
                                  <Loader2 size={15} className="admin-spinner" />
                                ) : (
                                  <Download size={15} />
                                )}
                                <span>Download</span>
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
          MODAL: VIEW REPORT METADATA & FINDINGS (ADMIN READ-ONLY)
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
                  <FileSpreadsheet size={20} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Laboratory Order Record — {selectedReport?.order_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Administrative Diagnostic Audit View (Read-Only)
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
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading record details...</p>
                </div>
              ) : selectedReport ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status & Requisition Overview */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.15rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        Order Status
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(selectedReport.status)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        Ordered / Completed
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {selectedReport.ordered_at ? new Date(selectedReport.ordered_at).toLocaleDateString() : '—'}
                        {selectedReport.completed_at && ` • ${new Date(selectedReport.completed_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Patient Reference
                      </span>
                      <h4 style={{ margin: '0.3rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
                        {selectedReport.patient_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Identifier: {selectedReport.patient_identifier || `PAT-${selectedReport.patient}`} • Phone: {selectedReport.patient_phone || '—'}
                      </p>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Requesting Doctor Reference
                      </span>
                      <h4 style={{ margin: '0.3rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
                        {selectedReport.doctor_name || 'Physician'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Specialization: {selectedReport.doctor_specialization || 'Internal Medicine'}
                      </p>
                    </div>
                  </div>

                  {/* Diagnostic Test Info */}
                  <div className="admin-glass-card" style={{ padding: '0.9rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Test Requisition Details
                    </span>
                    <h4 style={{ margin: '0.3rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
                      {selectedReport.test_name} ({selectedReport.test_code || 'LAB'})
                    </h4>
                    <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Category: {selectedReport.test_category || 'Diagnostic'} • Fee: ${selectedReport.test_price || '0.00'}
                    </p>
                    {selectedReport.clinical_notes && (
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                        <strong>Indication:</strong> {selectedReport.clinical_notes}
                      </p>
                    )}
                  </div>

                  {/* Findings and Results */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        Recorded Diagnostic Results
                      </span>
                      {selectedReport.assigned_staff_name && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Processing Staff: {selectedReport.assigned_staff_name}
                        </span>
                      )}
                    </div>

                    {selectedReport.status === 'COMPLETED' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                              Recorded Result Value
                            </span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#10b981' }}>
                              {selectedReport.result_value || 'Completed'} {selectedReport.result_unit || ''}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                              Reference Range
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {selectedReport.reference_range_used || selectedReport.test_reference_range || 'Normal'}
                            </span>
                          </div>
                        </div>

                        {selectedReport.result_interpretation && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Clinical Interpretation
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {selectedReport.result_interpretation}
                            </p>
                          </div>
                        )}

                        {selectedReport.result_notes && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              Laboratory Findings & Remarks
                            </span>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                              {selectedReport.result_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                        Requisition has not completed laboratory processing. No results recorded.
                      </p>
                    )}
                  </div>

                  {/* Report Download */}
                  {selectedReport.report_file && (
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
                        <FileText size={26} style={{ color: '#3b82f6' }} />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            Diagnostic PDF / Image Report File
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Archived diagnostic report document
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '0.4rem 0.8rem' }}
                          onClick={() => handleViewReportOnline(selectedReport)}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          style={{ padding: '0.4rem 0.8rem' }}
                          disabled={downloadingId === selectedReport.id}
                          onClick={() => handleDownloadReport(selectedReport)}
                        >
                          {downloadingId === selectedReport.id ? (
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
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      {/* In-Page Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        order={viewerReport}
        blob={viewerBlob}
        loading={loadingViewer}
      />
    </div>
  );
};

export default AdminLabReportsPage;
