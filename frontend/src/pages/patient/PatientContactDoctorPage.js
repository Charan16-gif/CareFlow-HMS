import React, { useState, useEffect, useCallback } from 'react';
import patientService from '../../services/patientService';
import Pagination from '../../components/common/Pagination';
import ModalPortal from '../../components/common/ModalPortal';
import {
  MessageSquare,
  AlertTriangle,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  Stethoscope,
  X,
  FileText,
  FlaskConical,
  Calendar,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const QUERY_CATEGORIES = [
  { value: 'TREATMENT_NOT_IMPROVING', label: 'Treatment Not Improving' },
  { value: 'MEDICINE_SIDE_EFFECTS', label: 'Medicine Side Effects' },
  { value: 'QUESTION_ABOUT_PRESCRIBED_MEDICINE', label: 'Question About Prescribed Medicine' },
  { value: 'TREATMENT_CLARIFICATION', label: 'Treatment Clarification' },
  { value: 'OTHER_MEDICAL_CONCERN', label: 'Other Medical Concern' },
];

const SEVERITY_LEVELS = [
  { value: 'MILD', label: 'Mild', color: '#10b981', desc: 'Mild discomfort, does not interrupt daily tasks' },
  { value: 'MODERATE', label: 'Moderate', color: '#f59e0b', desc: 'Noticeable symptoms, moderate discomfort' },
  { value: 'SEVERE', label: 'Severe', color: '#ef4444', desc: 'Intense symptoms; if acute, seek emergency care immediately' },
];

const PatientContactDoctorPage = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Eligible records for query submission
  const [eligibleRecords, setEligibleRecords] = useState({ appointments: [], prescriptions: [] });
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    appointment: '',
    prescription: '',
    medicine_name: '',
    category: 'TREATMENT_NOT_IMPROVING',
    severity: 'MILD',
    started_at: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [selectedQuery, setSelectedQuery] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getMedicalQueries();
      setQueries(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load medical queries. Please try again.';
      if (err.response?.data?.detail) msg = err.response.data.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEligibleRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const recs = await patientService.getEligibleQueryRecords();
      setEligibleRecords(recs || { appointments: [], prescriptions: [] });
    } catch (err) {
      // Fallback
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Contact Doctor — CareFlow Patient Portal';
    fetchQueries();
    fetchEligibleRecords();
  }, [fetchQueries, fetchEligibleRecords]);

  const handleOpenSubmitModal = () => {
    setIsSubmitModalOpen(true);
    setFormErrors({});
    const defaultApt = eligibleRecords.appointments?.[0]?.id || '';
    const linkedRx = defaultApt
      ? eligibleRecords.prescriptions.find((p) => String(p.appointment_id) === String(defaultApt))
      : null;
    let defaultMedName = '';
    if (linkedRx && linkedRx.medicines && linkedRx.medicines.length > 0) {
      defaultMedName = linkedRx.medicines[0].medicine_name;
    }
    setFormData({
      appointment: defaultApt,
      prescription: linkedRx ? String(linkedRx.id) : '',
      medicine_name: defaultMedName,
      category: 'TREATMENT_NOT_IMPROVING',
      severity: 'MILD',
      started_at: '',
      description: '',
    });
  };

  const handleAppointmentChange = (aptId) => {
    const linkedRx = aptId
      ? eligibleRecords.prescriptions.find((p) => String(p.appointment_id) === String(aptId))
      : null;
    let defaultMedName = '';
    if (linkedRx && linkedRx.medicines && linkedRx.medicines.length > 0) {
      defaultMedName = linkedRx.medicines[0].medicine_name;
    }
    setFormData((prev) => ({
      ...prev,
      appointment: aptId,
      prescription: linkedRx ? String(linkedRx.id) : '',
      medicine_name: defaultMedName,
    }));
  };

  const handlePrescriptionChange = (rxId) => {
    const rx = eligibleRecords.prescriptions.find((p) => String(p.id) === String(rxId));
    let defaultMedName = '';
    if (rx && rx.medicines && rx.medicines.length > 0) {
      defaultMedName = rx.medicines[0].medicine_name;
    }
    setFormData((prev) => ({
      ...prev,
      prescription: rxId,
      medicine_name: defaultMedName,
    }));
  };

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.appointment) {
      errors.appointment = 'Please select the consultation this inquiry relates to.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Please provide a detailed description of your symptom or concern.';
    }
    if (!formData.started_at.trim()) {
      errors.started_at = 'Please specify approximately when these symptoms started.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        appointment: parseInt(formData.appointment, 10),
        prescription: formData.prescription ? parseInt(formData.prescription, 10) : null,
        medicine_name: formData.medicine_name.trim(),
        category: formData.category,
        severity: formData.severity,
        started_at: formData.started_at.trim(),
        description: formData.description.trim(),
      };

      const res = await patientService.submitMedicalQuery(payload);
      toast.success(
        `Medical inquiry #${res.query_id || ''} forwarded to Dr. ${res.doctor_name || 'your consulting physician'}.`,
        'Query Submitted'
      );
      setIsSubmitModalOpen(false);
      fetchQueries();
    } catch (err) {
      let msg = 'Failed to submit medical query. Please verify details and try again.';
      const resData = err.response?.data;
      if (resData) {
        if (typeof resData === 'string') msg = resData;
        else if (resData.detail) msg = resData.detail;
        else if (resData.error) msg = resData.error;
        else {
          setFormErrors(resData);
          const firstErr = Object.values(resData)[0];
          msg = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
        }
      }
      toast.error(msg, 'Submission Error');
      setFormErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Pending Review
          </span>
        );
      case 'UNDER_REVIEW':
        return <span className="admin-badge admin-badge-cyan">Under Review</span>;
      case 'RESPONSE_SENT':
        return <span className="admin-badge admin-badge-teal">Response Sent</span>;
      case 'FOLLOW_UP_REQUIRED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.35)',
            }}
          >
            Follow-up Advised
          </span>
        );
      case 'RESOLVED':
        return <span className="admin-badge admin-badge-success">Resolved</span>;
      default:
        return <span className="admin-badge">{status}</span>;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'SEVERE':
        return <span className="admin-badge admin-badge-danger">Severe</span>;
      case 'MODERATE':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Moderate
          </span>
        );
      case 'MILD':
      default:
        return <span className="admin-badge admin-badge-teal">Mild</span>;
    }
  };

  const selectedAptObj = eligibleRecords.appointments.find(
    (a) => String(a.id) === String(formData.appointment)
  );

  const selectedRxObj = eligibleRecords.prescriptions.find(
    (p) => String(p.id) === String(formData.prescription)
  );

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Contact Consulting Doctor</h2>
          <p className="admin-page-subtitle">
            Submit clinical queries regarding ongoing treatment, medication side-effects, or symptom changes directly to your treating physician
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleOpenSubmitModal}
            disabled={loadingRecords || eligibleRecords.appointments.length === 0}
            title={
              !loadingRecords && eligibleRecords.appointments.length === 0
                ? 'Complete a doctor consultation to access medical inquiries.'
                : 'Submit a new inquiry to your consulting doctor'
            }
          >
            <Send size={16} />
            <span>New Medical Inquiry</span>
          </button>
          {!loadingRecords && eligibleRecords.appointments.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
              Complete a doctor consultation to access medical inquiries.
            </span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MANDATORY EMERGENCY CARE SAFETY WARNING BANNER
      ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.22))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--admin-radius-sm)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)',
        }}
        role="alert"
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={20} />
        </div>
        <div style={{ flex: '1 1 auto' }}>
          <strong style={{ color: '#ef4444', fontSize: '0.95rem', display: 'block', marginBottom: '3px' }}>
            EMERGENCY MEDICAL WARNING
          </strong>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-main)', lineHeight: '1.45' }}>
            This messaging feature is designed strictly for non-urgent post-consultation inquiries. If you or the patient are experiencing <strong>chest pain, difficulty breathing, sudden numbness or paralysis, severe bleeding, or acute life-threatening distress</strong>, do not wait for a message reply. Call <strong>108 / Emergency Services</strong> or visit the nearest hospital casualty emergency room immediately.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Loading medical inquiries...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Inquiries</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchQueries}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Queries List / Table */}
      {!loading && !error && (
        <>
          {queries.length === 0 ? (
            <div className="admin-empty-table-card">
              <div className="admin-empty-icon-box">
                <MessageSquare size={32} />
              </div>
              <h3>No Medical Queries Submitted</h3>
              <p>
                Have questions regarding your prescribed medication or follow-up recovery? Click &quot;New Medical Inquiry&quot; to submit your question directly to your treating doctor.
              </p>
              {eligibleRecords.appointments.length > 0 ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={handleOpenSubmitModal}
                >
                  <Send size={16} />
                  <span>Submit Inquiry</span>
                </button>
              ) : (
                <div
                  className="admin-badge"
                  style={{
                    marginTop: '1rem',
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    padding: '0.5rem 0.85rem',
                  }}
                >
                  Complete a doctor consultation to access medical inquiries.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Query ID</th>
                      <th>Doctor</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Concern Summary</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th style={{ textAlign: 'center' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((q) => (
                        <tr key={q.id}>
                          <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                            {q.query_id}
                          </td>
                          <td className="font-semibold">
                            <div>Dr. {q.doctor_name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                              {q.doctor_specialization || 'Consulting Physician'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-main)' }}>
                              {q.category_display || q.category}
                            </span>
                          </td>
                          <td>{getSeverityBadge(q.severity)}</td>
                          <td style={{ maxWidth: '240px' }}>
                            <span
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontSize: '0.82rem',
                              }}
                              title={q.description}
                            >
                              {q.description}
                            </span>
                          </td>
                          <td>{getStatusBadge(q.status)}</td>
                          <td className="admin-font-mono" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                            {q.created_at ? q.created_at.slice(0, 10) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn-teal"
                              onClick={() => setSelectedQuery(q)}
                              title="View inquiry and doctor response"
                            >
                              <FileText size={15} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(queries.length / pageSize)}
                totalCount={queries.length}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          NEW MEDICAL QUERY MODAL
      ───────────────────────────────────────────────────────────── */}
      {isSubmitModalOpen && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsSubmitModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '620px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(2, 132, 199, 0.3))',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-cyan, #06b6d4)',
                      }}
                    >
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h3 className="admin-modal-title">Contact Treating Doctor</h3>
                      <p className="admin-modal-subtitle">
                        Submit clinical questions regarding your recent consultation or medications
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsSubmitModalOpen(false)}
                  disabled={isSubmitting}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitQuery}>
                <div className="admin-modal-body">
                  {formErrors.general && (
                    <div className="admin-alert admin-alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                      <AlertCircle size={16} />
                      <span>{formErrors.general}</span>
                    </div>
                  )}

                  {/* Consultation Selection */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="query-appointment">
                      Related Consultation / Doctor Visit <span className="admin-required">*</span>
                    </label>
                    <select
                      id="query-appointment"
                      className={`admin-input admin-form-select ${formErrors.appointment ? 'admin-input-error' : ''}`}
                      value={formData.appointment}
                      onChange={(e) => handleAppointmentChange(e.target.value)}
                      required
                    >
                      <option value="">— Select a consultation —</option>
                      {eligibleRecords.appointments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          #{apt.appointment_id} ({apt.appointment_date}) — Dr. {apt.doctor_name} ({apt.doctor_specialization})
                        </option>
                      ))}
                    </select>
                    {formErrors.appointment && (
                      <span className="admin-form-error">
                        <AlertCircle size={13} /> {formErrors.appointment}
                      </span>
                    )}

                    {selectedAptObj && (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--admin-card-border)',
                          borderRadius: 'var(--admin-radius-sm)',
                          padding: '0.65rem 0.85rem',
                          marginTop: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                        }}
                      >
                        <Stethoscope size={16} color="var(--primary-cyan, #06b6d4)" />
                        <span style={{ fontSize: '0.82rem' }}>
                          Inquiry directed to: <strong>Dr. {selectedAptObj.doctor_name}</strong> ({selectedAptObj.doctor_specialization})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Linked Prescription Selection */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="query-prescription">
                      Linked Prescription <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>(Optional)</span>
                    </label>
                    {eligibleRecords.prescriptions.filter((rx) => !formData.appointment || String(rx.appointment_id) === String(formData.appointment)).length > 0 ? (
                      <select
                        id="query-prescription"
                        className="admin-input admin-form-select"
                        value={formData.prescription}
                        onChange={(e) => handlePrescriptionChange(e.target.value)}
                      >
                        <option value="">— Select prescription (optional) —</option>
                        {eligibleRecords.prescriptions
                          .filter((rx) => !formData.appointment || String(rx.appointment_id) === String(formData.appointment))
                          .map((rx) => (
                            <option key={rx.id} value={rx.id}>
                              #{rx.prescription_id} ({rx.created_at?.slice(0, 10)}) — Dr. {rx.doctor_name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <select id="query-prescription" className="admin-input admin-form-select" disabled>
                        <option>No prescriptions linked to this consultation</option>
                      </select>
                    )}
                  </div>

                  {/* Medicine Name (if inquiry relates to medication) */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="query-medicine-name">
                      Relevant Medicine <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>(Optional)</span>
                    </label>
                    {selectedRxObj && selectedRxObj.medicines && selectedRxObj.medicines.length > 0 ? (
                      <select
                        id="query-medicine-name"
                        className="admin-input admin-form-select"
                        value={formData.medicine_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, medicine_name: e.target.value }))}
                      >
                        <option value="">— Select from prescribed medicines —</option>
                        {selectedRxObj.medicines.map((m, idx) => (
                          <option key={m.item_id || idx} value={m.medicine_name}>
                            {m.medicine_name} ({m.dosage || 'Standard Dosage'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="query-medicine-name"
                        type="text"
                        className="admin-input admin-form-input"
                        placeholder="Enter specific medicine name (e.g. Dolo 650, Paracetamol)..."
                        value={formData.medicine_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, medicine_name: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Query Category & Severity */}
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="query-category">
                        Category <span className="admin-required">*</span>
                      </label>
                      <select
                        id="query-category"
                        className="admin-input admin-form-select"
                        value={formData.category}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                        required
                      >
                        {QUERY_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="query-severity">
                        Severity Level <span className="admin-required">*</span>
                      </label>
                      <select
                        id="query-severity"
                        className="admin-input admin-form-select"
                        value={formData.severity}
                        onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value }))}
                        required
                      >
                        {SEVERITY_LEVELS.map((sev) => (
                          <option key={sev.value} value={sev.value}>
                            {sev.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Started At */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="query-started-at">
                      When Did These Symptoms Start? <span className="admin-required">*</span>
                    </label>
                    <input
                      id="query-started-at"
                      type="text"
                      className={`admin-input admin-form-input ${formErrors.started_at ? 'admin-input-error' : ''}`}
                      placeholder="e.g. Yesterday evening, 2 hours after morning dose, past 48 hours..."
                      value={formData.started_at}
                      onChange={(e) => setFormData((prev) => ({ ...prev, started_at: e.target.value }))}
                      required
                    />
                    {formErrors.started_at && (
                      <span className="admin-form-error">
                        <AlertCircle size={13} /> {formErrors.started_at}
                      </span>
                    )}
                  </div>

                  {/* Description Narrative */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="query-description">
                      Detailed Concern Narrative <span className="admin-required">*</span>
                    </label>
                    <textarea
                      id="query-description"
                      rows={4}
                      className={`admin-input admin-form-textarea ${formErrors.description ? 'admin-input-error' : ''}`}
                      placeholder="Describe your symptoms in detail, how you are feeling, any reactions observed, or questions about your recovery..."
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      required
                    />
                    {formErrors.description && (
                      <span className="admin-form-error">
                        <AlertCircle size={13} /> {formErrors.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsSubmitModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Sending to Doctor...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send to Doctor</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          QUERY DETAIL & DOCTOR RESPONSE MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedQuery && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setSelectedQuery(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '640px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-cyan, #06b6d4)',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="admin-modal-title">Medical Query {selectedQuery.query_id}</h3>
                      <p className="admin-modal-subtitle">
                        Consultation with Dr. {selectedQuery.doctor_name} ({selectedQuery.doctor_specialization})
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setSelectedQuery(null)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                {/* Meta Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--admin-card-border)',
                    borderRadius: 'var(--admin-radius-sm)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Status: </span>
                    {getStatusBadge(selectedQuery.status)}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Severity: </span>
                    {getSeverityBadge(selectedQuery.severity)}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Category: </span>
                    <strong>{selectedQuery.category_display || selectedQuery.category}</strong>
                  </div>
                </div>

                {/* Patient Inquiry Details */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-cyan, #06b6d4)', marginBottom: '0.4rem' }}>
                    Your Inquiry
                  </h4>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--admin-card-border)',
                      borderRadius: 'var(--admin-radius-sm)',
                      padding: '1rem',
                      fontSize: '0.88rem',
                      lineHeight: '1.5',
                      color: 'var(--admin-text-main)',
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem 0' }}>{selectedQuery.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                      <span>Onset: <strong>{selectedQuery.started_at}</strong></span>
                      {selectedQuery.medicine_name && (
                        <span>Medicine: <strong>{selectedQuery.medicine_name}</strong></span>
                      )}
                      <span>Submitted: <strong>{selectedQuery.created_at?.slice(0, 16).replace('T', ' ')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Physician Response Section */}
                <div className="medical-query-physician-section">
                  <div className="medical-query-physician-header">
                    <div className="medical-query-physician-title">
                      <Stethoscope size={18} />
                      <span>Physician Response</span>
                    </div>
                    {selectedQuery.doctor_response ? (
                      <span className="medical-query-status-badge resolved">
                        <CheckCircle2 size={13} />
                        <span>Response Delivered</span>
                      </span>
                    ) : (
                      <span className="medical-query-status-badge waiting">
                        <Clock size={13} />
                        <span>Awaiting Review</span>
                      </span>
                    )}
                  </div>

                  {selectedQuery.doctor_response ? (
                    <div className="medical-query-response-card">
                      <div className="medical-query-response-header">
                        <div className="medical-query-doctor-profile">
                          <div className="medical-query-doctor-avatar">
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <h5 className="medical-query-doctor-name">Dr. {selectedQuery.doctor_name}</h5>
                            <p className="medical-query-doctor-spec">{selectedQuery.doctor_specialization || 'Attending Physician'}</p>
                          </div>
                        </div>
                        <div className="medical-query-response-meta">
                          <Clock size={14} />
                          <span>Responded on {selectedQuery.responded_at ? selectedQuery.responded_at.slice(0, 16).replace('T', ' ') : 'Recently'}</span>
                        </div>
                      </div>

                      <p className="medical-query-response-text">
                        {selectedQuery.doctor_response}
                      </p>

                      {(selectedQuery.recommend_follow_up || selectedQuery.recommend_lab_tests) && (
                        <div className="medical-query-recommendations-list">
                          {selectedQuery.recommend_follow_up && (
                            <div className="medical-query-rec-item followup">
                              <Calendar size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <strong>In-Person Follow-Up Recommended</strong>
                                <p>Physician advises scheduling a follow-up consultation at your earliest convenience.</p>
                              </div>
                            </div>
                          )}
                          {selectedQuery.recommend_lab_tests && (
                            <div className="medical-query-rec-item lab">
                              <FlaskConical size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <strong>Recommended Diagnostic Laboratory Tests</strong>
                                <p>{selectedQuery.lab_test_recommendations || 'Diagnostic testing advised at hospital laboratory.'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="medical-query-response-footer">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ShieldCheck size={14} color="#10b981" />
                          <span>Verified Physician Clinical Response</span>
                        </span>
                        <span>Query ID: {selectedQuery.query_id}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="medical-query-waiting-card">
                      <div className="medical-query-waiting-header">
                        <div className="medical-query-waiting-icon-box">
                          <Clock size={20} />
                        </div>
                        <div className="medical-query-waiting-info">
                          <h5>Awaiting Physician Review</h5>
                          <p>Assigned to Dr. {selectedQuery.doctor_name} ({selectedQuery.doctor_specialization || 'Specialist'})</p>
                        </div>
                      </div>

                      <div className="medical-query-waiting-body">
                        Dr. {selectedQuery.doctor_name} has received this inquiry and will review your reported symptoms. You will receive an immediate notification as soon as the clinical instructions are dispatched.
                      </div>

                      <div className="medical-query-waiting-notice">
                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>
                          <strong>Important:</strong> If your symptoms rapidly worsen or you experience acute discomfort, please seek immediate emergency medical care or call the hospital emergency hotline.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setSelectedQuery(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PatientContactDoctorPage;
