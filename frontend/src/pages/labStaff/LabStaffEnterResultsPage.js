import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import labStaffService from '../../services/labStaffService';
import {
  FlaskConical,
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Upload,
  Lock,
  Check,
  Loader2,
  Activity,
  FileCheck,
} from 'lucide-react';

const LabStaffEnterResultsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    result_value: '',
    result_unit: '',
    reference_range_used: '',
    result_interpretation: 'NORMAL',
    result_notes: '',
  });

  // Fetch pending/active orders for the switcher dropdown
  useEffect(() => {
    let isMounted = true;
    const fetchActiveList = async () => {
      try {
        const res = await labStaffService.getOrders();
        const list = Array.isArray(res) ? res : res.results || [];
        if (isMounted) {
          // Filter to active, non-finalized orders
          const eligible = list.filter(o => o.status !== 'CANCELLED' && o.status !== 'COMPLETED');
          setActiveOrders(eligible);
          if (!orderId && eligible.length > 0 && !selectedOrderId) {
            setSelectedOrderId(eligible[0].id);
          }
        }
      } catch (err) {
        // silent fail for selector
      }
    };
    fetchActiveList();
    return () => { isMounted = false; };
  }, [orderId, selectedOrderId]);

  // Load Order Details
  const loadOrderDetails = useCallback(async (idToLoad) => {
    if (!idToLoad) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await labStaffService.getOrderDetails(idToLoad);
      setOrder(data);
      setFormData({
        result_value: data.result_value || '',
        result_unit: data.result_unit || (data.test_detail ? data.test_detail.unit : '') || '',
        reference_range_used: data.reference_range_used || (data.test_detail ? data.test_detail.reference_range : '') || '',
        result_interpretation: data.result_interpretation || 'NORMAL',
        result_notes: data.result_notes || '',
      });
    } catch (err) {
      let msg = 'Failed to load test request information.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Enter Test Results — CareFlow HMS Lab Staff';
    const currentId = orderId || selectedOrderId;
    if (currentId) {
      loadOrderDetails(currentId);
    }
  }, [orderId, selectedOrderId, loadOrderDetails]);

  const handleOrderChange = (e) => {
    const newId = e.target.value;
    setSelectedOrderId(newId);
    if (newId) {
      navigate(`/lab-staff/enter-results/${newId}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save Results Draft (keeps status as IN_PROGRESS)
  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!order || isReadOnly) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await labStaffService.updateResults(order.id, {
        result_value: formData.result_value,
        result_unit: formData.result_unit,
        reference_range_used: formData.reference_range_used,
        result_interpretation: formData.result_interpretation,
        result_notes: formData.result_notes,
      });
      setOrder(updated);
      setSuccessMsg('Diagnostic results saved successfully as draft.');
    } catch (err) {
      let msg = 'Failed to save diagnostic results.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else msg = Object.values(err.response.data).flat().join(' ');
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Finalize & Complete Test
  const handleFinalizeComplete = async () => {
    if (!order || isReadOnly) return;
    if (!formData.result_value && !order.report_file) {
      setError('Please record a numeric/text result value or upload a report before marking test Completed.');
      return;
    }

    if (!window.confirm('Are you sure you want to finalize this test? Once COMPLETED, clinical results cannot be modified.')) {
      return;
    }

    setCompleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await labStaffService.completeOrder(order.id, {
        result_value: formData.result_value,
        result_unit: formData.result_unit,
        reference_range_used: formData.reference_range_used,
        result_interpretation: formData.result_interpretation,
        result_notes: formData.result_notes,
      });
      setOrder(updated);
      setSuccessMsg('Laboratory test has been successfully verified and marked as COMPLETED.');
    } catch (err) {
      let msg = 'Failed to complete laboratory test.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else msg = Object.values(err.response.data).flat().join(' ');
      }
      setError(msg);
    } finally {
      setCompleting(false);
    }
  };

  const isCompleted = order?.status === 'COMPLETED';
  const isCancelled = order?.status === 'CANCELLED';
  const isReadOnly = isCompleted || isCancelled;

  return (
    <div className="admin-overview-container" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Breadcrumb & Switcher */}
      <div className="admin-page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link to="/lab-staff/test-requests" className="admin-action-btn" style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Requests
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Enter Diagnostic Results</span>
          </div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FlaskConical size={26} color="var(--color-primary-400)" />
            Enter & Validate Test Results
          </h1>
          <p className="admin-page-subtitle">
            Record findings, diagnostic values, standard reference ranges, and technician interpretations.
          </p>
        </div>

        {/* Quick Order Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Select Request:</label>
          <select
            className="admin-form-input"
            value={order?.id || selectedOrderId || ''}
            onChange={handleOrderChange}
            disabled={activeOrders.length === 0}
            style={{
              padding: '8px 12px',
              fontSize: '0.85rem',
              minWidth: '250px',
              cursor: activeOrders.length === 0 ? 'not-allowed' : 'pointer',
              opacity: activeOrders.length === 0 ? 0.75 : 1
            }}
          >
            {activeOrders.length === 0 ? (
              <option value="">No Active Test Requests</option>
            ) : (
              <>
                <option value="">-- Choose a Request ({activeOrders.length} available) --</option>
                {activeOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_id || `#${o.id}`} — {o.patient_name} ({o.test_name}) [{o.status}]
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
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
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(8px)'
        }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-content-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="spin-animation" style={{ color: 'var(--color-primary-400)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Retrieving test request and clinical data...</p>
        </div>
      ) : !order ? (
        <div className="admin-content-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          {activeOrders.length === 0 ? (
            <>
              <CheckCircle2 size={44} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                No Active Test Requests Pending Results
              </h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: '1.6' }}>
                All current laboratory diagnostic orders have either been completed or intake has not been initiated yet. Visit Test Requests to accept incoming requisitions.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/lab-staff/test-requests" className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <FileText size={16} /> View Test Requests
                </Link>
                <Link to="/lab-staff/reports" className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <FileCheck size={16} /> View Completed Reports
                </Link>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={40} style={{ color: 'var(--color-primary-400)', margin: '0 auto 1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>No Test Request Selected</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
                Please choose an active laboratory order from the dropdown above or select one directly from the Test Requests page.
              </p>
              <Link to="/lab-staff/test-requests" className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <FileText size={16} /> View All Test Requests
              </Link>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          {/* Main Result Form */}
          <div className="admin-content-card" style={{ padding: '1.75rem' }}>
            {/* Lock / Status Banners */}
            {isCompleted && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3b82f6',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Lock size={18} />
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                  <strong>Results Finalized:</strong> This test is marked <strong>COMPLETED</strong>. Results are locked against modifications to protect clinical record integrity.
                </span>
              </div>
            )}

            {isCancelled && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                  <strong>Test Cancelled:</strong> This laboratory order was cancelled and results cannot be entered or updated.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveDraft}>
              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={15} color="var(--color-primary-400)" />
                    Test Result Finding / Value *
                  </label>
                  <input
                    type="text"
                    name="result_value"
                    className="admin-form-input"
                    value={formData.result_value}
                    onChange={handleChange}
                    placeholder="e.g. 14.2, Negative, Normal"
                    disabled={isReadOnly}
                    required={order.status === 'COMPLETED'}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Quantitative number or qualitative outcome
                  </span>
                </div>

                <div>
                  <label className="admin-form-label">
                    Measurement Unit
                  </label>
                  <input
                    type="text"
                    name="result_unit"
                    className="admin-form-input"
                    value={formData.result_unit}
                    onChange={handleChange}
                    placeholder="e.g. g/dL, mg/dL, mmol/L"
                    disabled={isReadOnly}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Standard scientific unit of measurement
                  </span>
                </div>

                <div>
                  <label className="admin-form-label">
                    Reference Range Applied
                  </label>
                  <input
                    type="text"
                    name="reference_range_used"
                    className="admin-form-input"
                    value={formData.reference_range_used}
                    onChange={handleChange}
                    placeholder="e.g. 12.0 - 16.0 g/dL"
                    disabled={isReadOnly}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Diagnostic baseline comparison interval
                  </span>
                </div>

                <div>
                  <label className="admin-form-label">
                    Clinical Interpretation Flag
                  </label>
                  <select
                    name="result_interpretation"
                    className="admin-form-input"
                    value={formData.result_interpretation}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  >
                    <option value="NORMAL">Normal / Within Range</option>
                    <option value="ABNORMAL">Abnormal / Out of Range</option>
                    <option value="CRITICAL">Critical Alert (Requires Physician Review)</option>
                    <option value="BORDERLINE">Borderline / Inconclusive</option>
                    <option value="POSITIVE">Positive (+)</option>
                    <option value="NEGATIVE">Negative (-)</option>
                  </select>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    Assessment category flag
                  </span>
                </div>
              </div>

              {/* Detailed Observations */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} color="var(--color-primary-400)" />
                  Technician Observations & Diagnostic Remarks
                </label>
                <textarea
                  name="result_notes"
                  className="admin-form-input"
                  rows={5}
                  value={formData.result_notes}
                  onChange={handleChange}
                  placeholder="Record methodology details, analyzer calibration, specimen quality notes, or clinical interpretations for the ordering physician..."
                  disabled={isReadOnly}
                  style={{ resize: 'vertical', lineHeight: '1.5' }}
                />
              </div>

              {/* Action Buttons */}
              {!isReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      disabled={saving || completing}
                      className="admin-btn admin-btn-secondary admin-action-btn"
                      style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {saving ? <Loader2 size={16} className="spin-animation" /> : <Save size={16} />}
                      Save Findings Draft
                    </button>
                    <Link
                      to={`/lab-staff/reports?orderId=${order.id}`}
                      className="admin-btn admin-btn-secondary admin-action-btn"
                      style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                      <Upload size={16} /> Attach Diagnostic PDF / Image
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalizeComplete}
                    disabled={saving || completing}
                    className="admin-btn admin-btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#fff',
                      padding: '10px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600
                    }}
                  >
                    {completing ? <Loader2 size={16} className="spin-animation" /> : <CheckCircle2 size={18} />}
                    Verify & Finalize Complete
                  </button>
                </div>
              )}
            </form>

            {/* Quick Link to Detailed Page */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                to={`/lab-staff/results/${order.id}`}
                style={{ fontSize: '0.85rem', color: 'var(--color-primary-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View Full Diagnostic Summary & Audit Details →
              </Link>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Request Summary Card */}
            <div className="admin-content-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlaskConical size={16} color="var(--color-primary-400)" />
                Test Specifications
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>TEST NAME</span>
                  <strong style={{ fontSize: '0.92rem' }}>{order.test_name}</strong>
                  {order.test_detail?.code && (
                    <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--color-primary-400)' }}>
                      ({order.test_detail.code})
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>CATEGORY & SPECIMEN</span>
                  <span>{order.test_detail?.category || 'Standard Laboratory'} • {order.test_detail?.specimen_type || 'Blood'}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>EXPECTED TURNAROUND</span>
                  <span>{order.test_detail?.turnaround_time || '24 - 48 Hours'}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>CURRENT STATUS</span>
                  <span className={`admin-badge admin-badge-${order.status ? order.status.toLowerCase() : 'requested'}`} style={{ marginTop: '3px', display: 'inline-block' }}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient & Doctor Card */}
            <div className="admin-content-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="var(--color-primary-400)" />
                Patient & Clinician
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>PATIENT</span>
                  <strong>{order.patient_name}</strong>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                    {order.patient_gender} {order.patient_age ? `• ${order.patient_age} yrs` : ''}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>REQUESTING PHYSICIAN</span>
                  <strong>{order.doctor_name || 'Assigned Physician'}</strong>
                  {order.doctor_department && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                      {order.doctor_department}
                    </div>
                  )}
                </div>

                {order.clinical_notes && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>PHYSICIAN CLINICAL NOTES</span>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      marginTop: '4px',
                      borderLeft: '3px solid var(--color-primary-400)'
                    }}>
                      "{order.clinical_notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attached Report File Status */}
            <div className="admin-content-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck size={16} color="var(--color-primary-400)" />
                Document Attachment
              </h3>

              {order.report_file ? (
                <div>
                  <p style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                    <Check size={14} /> Diagnostic report file attached
                  </p>
                  {!isCompleted && !isCancelled ? (
                    <Link
                      to={`/lab-staff/reports?orderId=${order.id}`}
                      className="admin-action-btn"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      View or Replace File
                    </Link>
                  ) : (
                    <Link
                      to="/lab-staff/reports"
                      className="admin-action-btn"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      View in Reports
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    {isCompleted ? 'No report file attached (Completed with clinical findings).' : 'No report file uploaded yet.'}
                  </p>
                  {!isCompleted && !isCancelled && (
                    <Link
                      to={`/lab-staff/reports?orderId=${order.id}`}
                      className="admin-action-btn"
                      style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} /> Upload PDF / Image
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabStaffEnterResultsPage;
