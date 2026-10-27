import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import labStaffService from '../../services/labStaffService';
import {
  FlaskConical,
  User,
  Stethoscope,
  ArrowLeft,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Activity,
  Printer,
  Edit3,
  Upload,
  Lock,
  Loader2,
  FileCheck,
  Check,
  XCircle,
  FileText,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';
import DocumentViewerModal, { downloadReportFile } from '../../components/common/DocumentViewerModal';

const LabStaffTestResultDetailsPage = () => {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerBlob, setViewerBlob] = useState(null);
  const [isOpeningViewer, setIsOpeningViewer] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await labStaffService.getOrderDetails(orderId);
      setOrder(data);
    } catch (err) {
      let msg = 'Failed to load test result details.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    document.title = `Test Result #${orderId} — CareFlow HMS Lab Staff`;
    fetchOrderDetails();
  }, [orderId, fetchOrderDetails]);

  const handleDownloadReport = async () => {
    if (!order || !order.id) return;
    setDownloading(true);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      downloadReportFile(blob, order, 'Lab_Report');
      toast.success('Diagnostic report downloaded successfully.', 'Report Downloaded');
    } catch (err) {
      toast.error('Unable to download diagnostic report file.', 'Download Error');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenDocumentViewer = async () => {
    if (!order || !order.id) return;
    setIsOpeningViewer(true);
    try {
      const blob = await labStaffService.downloadReport(order.id);
      setViewerBlob(blob);
      setViewerOpen(true);
    } catch (err) {
      toast.error('Unable to load diagnostic report for in-page viewing.', 'Viewer Error');
    } finally {
      setIsOpeningViewer(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAttachedPdf = () => {
    handleOpenDocumentViewer();
  };

  // Status Stepper Computation
  const getWorkflowSteps = () => {
    const isCancelled = order?.status === 'CANCELLED';
    if (isCancelled) {
      return [
        { label: 'Requested', state: 'completed' },
        { label: 'Cancelled', state: 'cancelled' },
      ];
    }

    const steps = [
      { label: 'Requested', key: 'REQUESTED' },
      { label: 'Accepted', key: 'ACCEPTED' },
      { label: 'In Progress', key: 'IN_PROGRESS' },
      { label: 'Completed', key: 'COMPLETED' },
    ];

    const currentStatus = order?.status || 'REQUESTED';
    const statusOrder = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    return steps.map((s, idx) => {
      if (idx < currentIndex) {
        return { ...s, state: 'completed' };
      } else if (idx === currentIndex) {
        return { ...s, state: 'active' };
      } else {
        return { ...s, state: 'pending' };
      }
    });
  };

  const isCompleted = order?.status === 'COMPLETED';
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <div className="admin-overview-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div className="no-print">
      {/* Header Actions */}
      <div className="admin-page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link to="/lab-staff/test-requests" className="admin-action-btn" style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Requests
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Test Record #{order?.order_id || orderId}</span>
          </div>

          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FlaskConical size={26} color="var(--color-primary-400)" />
            {order ? order.test_name : 'Diagnostic Test Details'}
          </h1>
          <p className="admin-page-subtitle">
            Complete laboratory diagnostic record, verified results, and audit history.
          </p>
        </div>

        {order && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              className="admin-btn admin-btn-secondary admin-action-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              title="Print Official Diagnostic Laboratory Report"
            >
              <Printer size={16} /> Print Diagnostic Report
            </button>

            {order.report_file && (
              <button
                onClick={handlePrintAttachedPdf}
                disabled={downloading}
                className="admin-btn admin-btn-secondary admin-action-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                title="Print Uploaded Document / Image"
              >
                <FileText size={16} /> Print Attached File
              </button>
            )}

            {!isCompleted && !isCancelled && (
              <Link
                to={`/lab-staff/enter-results/${order.id}`}
                className="admin-btn admin-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  textDecoration: 'none',
                  fontSize: '0.88rem'
                }}
              >
                <Edit3 size={16} /> Enter / Update Results
              </Link>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="admin-content-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="spin-animation" style={{ color: 'var(--color-primary-400)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading laboratory record details...</p>
        </div>
      ) : error ? (
        <div className="admin-content-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem', color: '#ef4444' }}>Unable to Access Test Record</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <Link to="/lab-staff/test-requests" className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Return to Test Requests
          </Link>
        </div>
      ) : order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status & Stepper Banner */}
          <div className="admin-content-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  WORKFLOW STATUS
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '4px' }}>
                  <span className={`admin-badge admin-badge-${order.status ? order.status.toLowerCase() : 'requested'}`} style={{ fontSize: '0.92rem', padding: '4px 12px' }}>
                    {order.status}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Order ID: <strong>{order.order_id || `#${order.id}`}</strong>
                  </span>
                </div>
              </div>

              {isCompleted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.88rem', fontWeight: 600 }}>
                  <Lock size={16} /> Verified & Locked
                </div>
              )}
            </div>

            {/* Workflow Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflowX: 'auto', padding: '1rem 0 0.5rem' }}>
              {getWorkflowSteps().map((st, idx, arr) => (
                <React.Fragment key={idx}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '90px', zIndex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      backgroundColor:
                        st.state === 'completed'
                          ? '#10b981'
                          : st.state === 'active'
                          ? 'var(--color-primary-500)'
                          : st.state === 'cancelled'
                          ? '#ef4444'
                          : 'rgba(255, 255, 255, 0.08)',
                      color: st.state === 'pending' ? 'var(--color-text-muted)' : '#ffffff',
                      boxShadow: st.state === 'active' ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      {st.state === 'completed' ? <Check size={18} /> : st.state === 'cancelled' ? <XCircle size={18} /> : idx + 1}
                    </div>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: st.state === 'active' || st.state === 'completed' ? 600 : 400,
                      color: st.state === 'cancelled' ? '#ef4444' : st.state === 'pending' ? 'var(--color-text-muted)' : 'inherit'
                    }}>
                      {st.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: st.state === 'completed' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                      margin: '0 8px',
                      marginBottom: '22px'
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 3-Column Profile Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Patient Info Card */}
            <div className="admin-content-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <User size={20} color="var(--color-primary-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Patient Information</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>FULL NAME</span>
                  <strong style={{ fontSize: '0.98rem' }}>{order.patient_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>DEMOGRAPHICS</span>
                  <span>{order.patient_gender || 'Not specified'} {order.patient_age ? `• ${order.patient_age} years old` : ''}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>EMAIL / REFERENCE</span>
                  <span>{order.patient_email || 'Patient reference on file'}</span>
                </div>
              </div>
            </div>

            {/* Doctor Info Card */}
            <div className="admin-content-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <Stethoscope size={20} color="var(--color-primary-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Requesting Physician</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>PHYSICIAN NAME</span>
                  <strong style={{ fontSize: '0.98rem' }}>{order.doctor_name || 'Assigned Physician'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>SPECIALIZATION / DEPARTMENT</span>
                  <span>{order.doctor_department || 'General Medicine'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>CONTACT</span>
                  <span>{order.doctor_email || 'Hospital Internal Network'}</span>
                </div>
              </div>
            </div>

            {/* Test Specifications Card */}
            <div className="admin-content-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <FlaskConical size={20} color="var(--color-primary-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Test Specifications</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>TEST CODE & CATEGORY</span>
                  <span><strong>{order.test_detail?.code || 'LAB-TEST'}</strong> • {order.test_detail?.category || 'Clinical Pathology'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>SPECIMEN REQUIREMENTS</span>
                  <span>{order.test_detail?.specimen_type || 'Standard Specimen'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', display: 'block' }}>REQUESTED DATE</span>
                  <span>{order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Clinical Notes */}
          {order.clinical_notes && (
            <div className="admin-content-card" style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Physician Clinical Indications & Instructions
              </span>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.6', fontStyle: 'italic', borderLeft: '3px solid var(--color-primary-400)', paddingLeft: '1rem' }}>
                "{order.clinical_notes}"
              </p>
            </div>
          )}

          {/* Clinical Findings & Results Section */}
          <div className="admin-content-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={22} color="var(--color-primary-400)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Entered Diagnostic Results</h2>
              </div>

              {order.result_interpretation && (
                <span
                  className="admin-badge"
                  style={{
                    backgroundColor:
                      order.result_interpretation === 'NORMAL' || order.result_interpretation === 'NEGATIVE'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : order.result_interpretation === 'CRITICAL'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color:
                      order.result_interpretation === 'NORMAL' || order.result_interpretation === 'NEGATIVE'
                        ? '#10b981'
                        : order.result_interpretation === 'CRITICAL'
                        ? '#ef4444'
                        : '#f59e0b',
                    fontSize: '0.85rem',
                    padding: '4px 10px'
                  }}
                >
                  {order.result_interpretation}
                </span>
              )}
            </div>

            {order.result_value ? (
              <div>
                {/* Result Highlight Box */}
                <div className="lab-result-highlight-box" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    MEASURED QUANTITATIVE / QUALITATIVE FINDING
                  </div>
                  <div className="lab-result-val" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary-400)' }}>
                    {order.result_value}{' '}
                    <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                      {order.result_unit || ''}
                    </span>
                  </div>

                  {order.reference_range_used && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <strong>Reference Interval Applied:</strong> {order.reference_range_used}
                    </div>
                  )}
                </div>

                {/* Technician Notes */}
                {order.result_notes && (
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
                      TECHNICIAN OBSERVATIONS & METHODOLOGY REMARKS
                    </h4>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      border: '1px solid var(--color-border)'
                    }}>
                      {order.result_notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  No quantitative or qualitative diagnostic findings have been recorded for this test request yet.
                </p>
                {!isCompleted && !isCancelled && (
                  <Link
                    to={`/lab-staff/enter-results/${order.id}`}
                    className="admin-btn admin-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px' }}
                  >
                    <Edit3 size={16} /> Enter Diagnostic Findings Now
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Diagnostic Document & File Attachment */}
          <div className="admin-content-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck size={22} color="var(--color-primary-400)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Laboratory Report Document</h2>
              </div>
            </div>

            {order.report_file ? (
              <div className="lab-file-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.95rem', color: '#10b981' }}>
                    <CheckCircle2 size={18} /> Diagnostic Report Attached
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    File: {order.report_file.split('/').pop()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    onClick={handleOpenDocumentViewer}
                    disabled={downloading || isOpeningViewer}
                    className="admin-btn admin-btn-secondary admin-action-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                  >
                    {isOpeningViewer ? <Loader2 size={16} className="spin-animation" /> : <Eye size={16} />}
                    <span>View Report</span>
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="admin-btn admin-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                  >
                    {downloading ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
                    <span>Download File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  {isCompleted
                    ? 'No document file was attached. Test was verified and completed using recorded clinical values.'
                    : 'No PDF or image diagnostic report file has been attached to this test record.'}
                </p>
                {!isCompleted && !isCancelled && (
                  <Link
                    to={`/lab-staff/reports?orderId=${order.id}`}
                    className="admin-action-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px' }}
                  >
                    <Upload size={16} /> Attach Diagnostic Report File
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Cancellation Log (if applicable) */}
          {(order.status === 'CANCELLED' || order.cancellation_requested) && (
            <div className="admin-content-card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Cancellation Log & Audit Trail
              </h3>

              <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {order.cancellation_reason && (
                  <div>
                    <strong>Cancellation Reason:</strong> {order.cancellation_reason}
                  </div>
                )}
                {order.cancellation_requested && (
                  <div>
                    <strong>Doctor Request Status:</strong>{' '}
                    <span className="admin-badge admin-badge-cancelled" style={{ fontSize: '0.78rem' }}>
                      {order.cancellation_decision_status || 'PENDING LAB REVIEW'}
                    </span>
                  </div>
                )}
                {order.cancellation_decision_notes && (
                  <div>
                    <strong>Lab Staff Decision Notes:</strong> {order.cancellation_decision_notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          OFFICIAL PRINTABLE DIAGNOSTIC LABORATORY REPORT
          Visible strictly during window.print() via @media print
      ───────────────────────────────────────────────────────────── */}
      {order && (
        <div id="printable-lab-report" className="printable-lab-report">
          <div style={{
            border: '2px solid #0f172a',
            borderRadius: '4px',
            padding: '24px',
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
          }}>
            {/* Header Masthead */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: '20pt', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  CareFlow Hospital
                </h1>
                <p style={{ margin: 0, fontSize: '10pt', color: '#475569', fontWeight: 600 }}>
                  Department of Pathology & Clinical Diagnostic Laboratory
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '8.5pt', color: '#64748b' }}>
                  124 Healthcare Boulevard, Medical District • Tel: (555) 019-2834 • Web: careflow-hms.org
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '4px 12px',
                  fontSize: '9pt',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  borderRadius: '3px',
                  marginBottom: '4px'
                }}>
                  Diagnostic Report
                </div>
                <div style={{ fontSize: '9pt', color: '#475569' }}>
                  Order ID: <strong>{order.order_id || `#${order.id}`}</strong>
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>
                  Workflow Status: <strong>{order.status}</strong>
                </div>
              </div>
            </div>

            {/* Patient and Physician Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '9pt'
            }}>
              <div>
                <span style={{ fontSize: '7.5pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PATIENT DEMOGRAPHICS
                </span>
                <div style={{ fontSize: '11pt', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                  {order.patient_name}
                </div>
                <div style={{ color: '#334155' }}>
                  <strong>ID:</strong> {order.patient_identifier || `PAT-${order.patient}`} • <strong>Gender:</strong> {order.patient_gender || '—'} • <strong>Age:</strong> {order.patient_age ? `${order.patient_age} yrs` : '—'}
                </div>
                {order.patient_phone && (
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    <strong>Phone:</strong> {order.patient_phone}
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '7.5pt', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ORDERING CLINICIAN & TIMELINE
                </span>
                <div style={{ fontSize: '11pt', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                  {order.doctor_name || 'Assigned Physician'}
                </div>
                <div style={{ color: '#334155' }}>
                  <strong>Department:</strong> {order.doctor_department || order.doctor_specialization || 'General Medicine'}
                </div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>
                  <strong>Ordered:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : '—'} • <strong>Completed:</strong> {order.completed_at ? new Date(order.completed_at).toLocaleString() : 'Pending'}
                </div>
              </div>
            </div>

            {/* Clinical Indication if provided */}
            {order.clinical_notes && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                borderLeft: '3px solid #0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '3px',
                marginBottom: '18px',
                fontSize: '8.5pt'
              }}>
                <strong style={{ color: '#475569' }}>Physician Clinical Indication:</strong> {order.clinical_notes}
              </div>
            )}

            {/* Laboratory Findings Table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '20px',
              fontSize: '9pt'
            }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>Diagnostic Investigation</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>Specimen Type</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>Measured Value</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>Biological Reference Range</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>Interpretation Flag</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '10px', verticalAlign: 'top' }}>
                    <strong style={{ fontSize: '10pt', color: '#0f172a', display: 'block' }}>{order.test_name}</strong>
                    <span style={{ fontSize: '8pt', color: '#64748b' }}>
                      Code: {order.test_detail?.code || order.test_code || 'LAB-TEST'} • Category: {order.test_detail?.category || order.test_category || 'Clinical Pathology'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', verticalAlign: 'top', color: '#334155' }}>
                    {order.test_detail?.specimen_type || 'Blood / Serum'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                    <span style={{ fontSize: '11pt', fontWeight: 700, color: '#0f172a' }}>
                      {order.result_value || '—'} {order.result_unit || ''}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top', color: '#475569' }}>
                    {order.reference_range_used || order.test_detail?.reference_range || order.test_reference_range || 'Normal'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      fontSize: '8pt',
                      fontWeight: 700,
                      borderRadius: '3px',
                      border: '1px solid #0f172a',
                      backgroundColor: order.result_interpretation === 'NORMAL' || order.result_interpretation === 'NEGATIVE' ? '#f0fdf4' : '#fff1f2',
                      color: order.result_interpretation === 'NORMAL' || order.result_interpretation === 'NEGATIVE' ? '#166534' : '#991b1b'
                    }}>
                      {order.result_interpretation || 'NORMAL'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Observations & Technician Notes */}
            {order.result_notes && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '8.5pt'
              }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  TECHNICIAN METHODOLOGY OBSERVATIONS & REMARKS:
                </strong>
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>
                  {order.result_notes}
                </p>
              </div>
            )}

            {/* Attached Document Note if present */}
            {order.report_file && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '8.5pt',
                color: '#166534'
              }}>
                ✓ Official diagnostic documentation/imaging file attached: <strong>{order.report_file.split('/').pop()}</strong>
              </div>
            )}

            {/* Official Sign-off and Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '24px',
              borderTop: '2px solid #0f172a',
              marginTop: '20px',
              fontSize: '8.5pt'
            }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#334155' }}>
                  CareFlow Hospital Laboratory Information System
                </p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '8pt' }}>
                  Electronically verified & validated • Valid without physical signature
                </p>
                <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '7.5pt' }}>
                  Printed: {new Date().toLocaleString()}
                </p>
              </div>

              <div style={{ textAlign: 'center', minWidth: '180px' }}>
                <div style={{ height: '36px', borderBottom: '1px solid #0f172a', marginBottom: '4px' }}></div>
                <strong style={{ fontSize: '9pt', color: '#0f172a', display: 'block' }}>
                  {order.assigned_staff_name || 'Laboratory Medical Technologist'}
                </strong>
                <span style={{ fontSize: '8pt', color: '#64748b' }}>Authorized Medical Technologist</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerOpen && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewerBlob(null);
          }}
          order={order}
          blob={viewerBlob}
        />
      )}
    </div>
  );
};

export default LabStaffTestResultDetailsPage;
