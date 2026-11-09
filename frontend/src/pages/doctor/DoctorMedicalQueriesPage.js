import React, { useState, useEffect, useCallback, useMemo } from 'react';
import doctorService from '../../services/doctorService';
import Pagination from '../../components/common/Pagination';
import ModalPortal from '../../components/common/ModalPortal';
import {
  MessageSquare,
  AlertCircle,
  Loader2,
  FileText,
  X,
  Send,
  Filter,
  Search,
  Stethoscope,
  Pill,
  Eye,
  CheckCircle2,
  Clock,
  Calendar,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Queries' },
  { id: 'PENDING_REVIEW', label: 'Pending Review' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'RESPONSE_SENT', label: 'Response Sent' },
  { id: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Advised' },
  { id: 'RESOLVED', label: 'Resolved' },
];

const DoctorMedicalQueriesPage = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Response Modal State
  const [activeQuery, setActiveQuery] = useState(null);
  const [doctorResponse, setDoctorResponse] = useState('');
  const [recommendFollowUp, setRecommendFollowUp] = useState(false);
  const [recommendLabTests, setRecommendLabTests] = useState(false);
  const [labTestRecommendations, setLabTestRecommendations] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseErrors, setResponseErrors] = useState({});

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getDoctorMedicalQueries();
      setQueries(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load assigned medical queries. Please try again.';
      if (err.response?.data?.detail) msg = err.response.data.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Medical Queries — CareFlow Doctor Portal';
    fetchQueries();
  }, [fetchQueries]);

  const handleOpenResponseModal = (query) => {
    setActiveQuery(query);
    setDoctorResponse(query.doctor_response || '');
    setRecommendFollowUp(Boolean(query.recommend_follow_up));
    setRecommendLabTests(Boolean(query.recommend_lab_tests));
    setLabTestRecommendations(query.lab_test_recommendations || '');
    setMarkResolved(query.status === 'RESOLVED');
    setResponseErrors({});

    // If query is currently PENDING_REVIEW, automatically update to UNDER_REVIEW
    if (query.status === 'PENDING_REVIEW') {
      doctorService
        .updateMedicalQueryStatus(query.id, 'UNDER_REVIEW')
        .then(() => fetchQueries())
        .catch(() => {});
    }
  };

  const handleCloseResponseModal = () => {
    if (!isSubmitting) {
      setActiveQuery(null);
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    setResponseErrors({});

    if (!doctorResponse.trim() || doctorResponse.trim().length < 5) {
      setResponseErrors({ doctor_response: 'Please provide a clinical response (at least 5 characters).' });
      return;
    }

    if (recommendLabTests && !labTestRecommendations.trim()) {
      setResponseErrors({
        lab_test_recommendations: 'Please specify the recommended laboratory test names (e.g. CBC, Lipid Profile).',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        doctor_response: doctorResponse.trim(),
        recommend_follow_up: recommendFollowUp,
        recommend_lab_tests: recommendLabTests,
        lab_test_recommendations: recommendLabTests ? labTestRecommendations.trim() : '',
        mark_resolved: markResolved,
      };

      await doctorService.respondToMedicalQuery(activeQuery.id, payload);
      toast.success(
        `Clinical response dispatched to patient ${activeQuery.patient_name || ''} successfully.`,
        'Response Dispatched'
      );
      setActiveQuery(null);
      fetchQueries();
    } catch (err) {
      let msg = 'Failed to submit response. Please try again.';
      const resData = err.response?.data;
      if (resData) {
        if (typeof resData === 'string') msg = resData;
        else if (resData.detail) msg = resData.detail;
        else if (resData.error) msg = resData.error;
        else {
          setResponseErrors(resData);
          const firstErr = Object.values(resData)[0];
          msg = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
        }
      }
      toast.error(msg, 'Response Error');
      setResponseErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered queries
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const matchesSearch =
        !searchTerm ||
        (q.patient_name && q.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.query_id && q.query_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.medicine_name && q.medicine_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [queries, searchTerm, statusFilter]);

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

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Patient Medical Queries</h2>
          <p className="admin-page-subtitle">
            Review and respond to post-consultation symptom inquiries, side-effect reports, and treatment questions from your patients
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="admin-table-controls" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient, query ID, medicine, symptoms..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search medical queries"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <Filter size={15} className="admin-text-dim" />
          <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Status:</span>
          <select
            className="admin-input"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter inquiries by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="admin-table-record-count">
            {filteredQueries.length} {filteredQueries.length === 1 ? 'Inquiry' : 'Inquiries'}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Loading patient inquiries...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Queries</h3>
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

      {/* Empty State */}
      {!loading && !error && filteredQueries.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <MessageSquare size={32} />
          </div>
          <h3>No Medical Queries Found</h3>
          <p>
            {queries.length === 0
              ? 'You currently have no patient inquiries awaiting clinical review.'
              : 'No queries match your active search and filter criteria.'}
          </p>
        </div>
      )}

      {/* Queries Table */}
      {!loading && !error && filteredQueries.length > 0 && (
        <>
          <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Query ID</th>
                      <th>Patient</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Symptom Summary</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                      <th style={{ textAlign: 'center' }}>Clinical Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueries
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((q) => (
                        <tr key={q.id}>
                          <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                            {q.query_id}
                          </td>
                          <td className="font-semibold">
                            {q.patient_name || 'Patient'}
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
                            {q.status === 'RESOLVED' ? (
                              <button
                                type="button"
                                className="admin-action-btn admin-action-btn-secondary"
                                onClick={() => handleOpenResponseModal(q)}
                                title="View finalized clinical query details and response"
                              >
                                <Eye size={15} />
                                <span>View</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-action-btn admin-action-btn-teal"
                                onClick={() => handleOpenResponseModal(q)}
                                title="Review symptoms and formulate response"
                              >
                                <FileText size={15} />
                                <span>{q.doctor_response ? 'View / Update' : 'Respond'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredQueries.length / pageSize)}
                totalCount={filteredQueries.length}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}

      {/* ─────────────────────────────────────────────────────────────
          CLINICAL RESPONSE MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeQuery && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={handleCloseResponseModal}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '680px' }}
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
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h3 className="admin-modal-title">Clinical Review: {activeQuery.query_id}</h3>
                      <p className="admin-modal-subtitle">
                        Patient: <strong>{activeQuery.patient_name}</strong> • Consultation: #{activeQuery.appointment_id || activeQuery.appointment}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={handleCloseResponseModal}
                  disabled={isSubmitting}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {activeQuery.status === 'RESOLVED' ? (
                <>
                  <div className="admin-modal-body">
                    {/* Patient Concern Summary Card */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--admin-card-border)',
                        borderRadius: 'var(--admin-radius-sm)',
                        padding: '1rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="admin-badge admin-badge-teal">
                            {activeQuery.category_display || activeQuery.category}
                          </span>
                          {getSeverityBadge(activeQuery.severity)}
                        </div>
                        <span className="admin-font-mono" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                          Onset: {activeQuery.started_at}
                        </span>
                      </div>

                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--admin-text-main)', lineHeight: '1.5' }}>
                        {activeQuery.description}
                      </p>

                      {activeQuery.medicine_name && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--primary-cyan, #06b6d4)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                          <Pill size={14} />
                          <span>Referenced Medicine: <strong>{activeQuery.medicine_name}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Physician Response Section (Read-Only) */}
                    <div className="medical-query-physician-section">
                      <div className="medical-query-physician-header">
                        <div className="medical-query-physician-title">
                          <Stethoscope size={18} />
                          <span>Physician Clinical Response</span>
                        </div>
                        <span className="medical-query-status-badge resolved">
                          <CheckCircle2 size={13} />
                          <span>Resolved (Finalized)</span>
                        </span>
                      </div>

                      <div className="medical-query-response-card">
                        <div className="medical-query-response-header">
                          <div className="medical-query-doctor-profile">
                            <div className="medical-query-doctor-avatar">
                              <Stethoscope size={20} />
                            </div>
                            <div>
                              <h5 className="medical-query-doctor-name">Dr. {activeQuery.doctor_name || 'Attending Physician'}</h5>
                              <p className="medical-query-doctor-spec">{activeQuery.doctor_specialization || 'Clinical Specialist'}</p>
                            </div>
                          </div>
                          <div className="medical-query-response-meta">
                            <Clock size={14} />
                            <span>Responded on {activeQuery.responded_at ? activeQuery.responded_at.slice(0, 16).replace('T', ' ') : 'Recently'}</span>
                          </div>
                        </div>

                        <p className="medical-query-response-text">
                          {activeQuery.doctor_response || 'No clinical instructions provided.'}
                        </p>

                        {(activeQuery.recommend_follow_up || activeQuery.recommend_lab_tests) && (
                          <div className="medical-query-recommendations-list">
                            {activeQuery.recommend_follow_up && (
                              <div className="medical-query-rec-item followup">
                                <Calendar size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                  <strong>In-Person Follow-Up Recommended</strong>
                                  <p>Patient was advised to schedule an in-person follow-up appointment.</p>
                                </div>
                              </div>
                            )}
                            {activeQuery.recommend_lab_tests && (
                              <div className="medical-query-rec-item lab">
                                <FlaskConical size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                  <strong>Recommended Diagnostic Laboratory Tests</strong>
                                  <p>{activeQuery.lab_test_recommendations || 'Diagnostic testing advised at hospital laboratory.'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="medical-query-response-footer">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <ShieldCheck size={14} color="#10b981" />
                            <span>Finalized Record • Modifications Locked</span>
                          </span>
                          <span>Query ID: {activeQuery.query_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-modal-footer">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={handleCloseResponseModal}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmitResponse}>
                  <div className="admin-modal-body">
                    {responseErrors.general && (
                      <div className="admin-alert admin-alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                        <AlertCircle size={16} />
                        <span>{responseErrors.general}</span>
                      </div>
                    )}

                    {/* Patient Concern Summary Card */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--admin-card-border)',
                        borderRadius: 'var(--admin-radius-sm)',
                        padding: '1rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="admin-badge admin-badge-teal">
                            {activeQuery.category_display || activeQuery.category}
                          </span>
                          {getSeverityBadge(activeQuery.severity)}
                        </div>
                        <span className="admin-font-mono" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                          Onset: {activeQuery.started_at}
                        </span>
                      </div>

                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--admin-text-main)', lineHeight: '1.5' }}>
                        {activeQuery.description}
                      </p>

                      {activeQuery.medicine_name && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--primary-cyan, #06b6d4)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                          <Pill size={14} />
                          <span>Referenced Medicine: <strong>{activeQuery.medicine_name}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Doctor Response Textarea */}
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="doctor-response-text">
                        Doctor Clinical Response <span className="admin-required">*</span>
                      </label>
                      <textarea
                        id="doctor-response-text"
                        rows={4}
                        className={`admin-input admin-form-textarea ${responseErrors.doctor_response ? 'admin-input-error' : ''}`}
                        placeholder="Write your authoritative clinical instructions, reassurance, dosage guidance, or next steps..."
                        value={doctorResponse}
                        onChange={(e) => setDoctorResponse(e.target.value)}
                        required
                      />
                      {responseErrors.doctor_response && (
                        <span className="admin-form-error">
                          <AlertCircle size={13} /> {responseErrors.doctor_response}
                        </span>
                      )}
                    </div>

                    {/* Recommendations Row */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--admin-card-border)',
                        borderRadius: 'var(--admin-radius-sm)',
                        padding: '0.85rem 1rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', display: 'block', marginBottom: '0.65rem' }}>
                        CLINICAL RECOMMENDATIONS & ACTIONS
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                          <input
                            type="checkbox"
                            checked={recommendFollowUp}
                            onChange={(e) => setRecommendFollowUp(e.target.checked)}
                            style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                          />
                          <span style={{ color: 'var(--admin-text-main)' }}>
                            Recommend Patient to Schedule an In-Person Follow-Up Consultation
                          </span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                          <input
                            type="checkbox"
                            checked={recommendLabTests}
                            onChange={(e) => setRecommendLabTests(e.target.checked)}
                            style={{ accentColor: 'var(--primary-cyan, #06b6d4)', width: '16px', height: '16px' }}
                          />
                          <span style={{ color: 'var(--admin-text-main)' }}>
                            Recommend Diagnostic Laboratory Tests
                          </span>
                        </label>

                        {recommendLabTests && (
                          <div style={{ marginLeft: '1.6rem', marginTop: '0.25rem' }}>
                            <input
                              type="text"
                              className={`admin-input admin-form-input ${responseErrors.lab_test_recommendations ? 'admin-input-error' : ''}`}
                              placeholder="Specify recommended tests (e.g. Complete Blood Count, Dengue Serology, LFT)..."
                              value={labTestRecommendations}
                              onChange={(e) => setLabTestRecommendations(e.target.value)}
                              required
                            />
                            {responseErrors.lab_test_recommendations && (
                              <span className="admin-form-error">
                                <AlertCircle size={13} /> {responseErrors.lab_test_recommendations}
                              </span>
                            )}
                          </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                          <input
                            type="checkbox"
                            checked={markResolved}
                            onChange={(e) => setMarkResolved(e.target.checked)}
                            style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                          />
                          <span style={{ color: 'var(--admin-text-main)' }}>
                            Mark Query as Resolved (Patient question is completely answered)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="admin-modal-footer">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={handleCloseResponseModal}
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
                          <span>Sending Response...</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Send Clinical Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default DoctorMedicalQueriesPage;
