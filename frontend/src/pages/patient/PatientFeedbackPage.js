import React, { useState, useEffect, useCallback } from 'react';
import patientService from '../../services/patientService';
import Pagination from '../../components/common/Pagination';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  X,
  MessageSquare,
  ThumbsUp,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const EXPERIENCE_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: '#10b981' },
  { value: 'GOOD', label: 'Good', color: '#06b6d4' },
  { value: 'AVERAGE', label: 'Average', color: '#f59e0b' },
  { value: 'POOR', label: 'Poor', color: '#ef4444' },
];

const COMMUNICATION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: '#10b981' },
  { value: 'GOOD', label: 'Good', color: '#06b6d4' },
  { value: 'POOR', label: 'Poor', color: '#ef4444' },
];

const SATISFACTION_OPTIONS = [
  { value: 'SATISFIED', label: 'Satisfied', color: '#10b981' },
  { value: 'NEUTRAL', label: 'Neutral', color: '#f59e0b' },
  { value: 'UNSATISFIED', label: 'Unsatisfied', color: '#ef4444' },
];

const PatientFeedbackPage = () => {
  const [activeTab, setActiveTab] = useState('eligible'); // 'eligible' | 'history'
  const [eligibleAppointments, setEligibleAppointments] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Review Form Modal State
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [experience, setExperience] = useState('EXCELLENT');
  const [communication, setCommunication] = useState('EXCELLENT');
  const [satisfaction, setSatisfaction] = useState('SATISFIED');
  const [comments, setComments] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eligibleRes, historyRes] = await Promise.all([
        patientService.getEligibleFeedbackAppointments(),
        patientService.getFeedbackHistory(),
      ]);
      const rawEligible = Array.isArray(eligibleRes) ? eligibleRes : eligibleRes?.results || [];
      const completedOnly = rawEligible.filter(
        (a) => a.status === 'COMPLETED' || a.status === 'CHECKED_OUT' || a.is_completed === true
      );
      setEligibleAppointments(completedOnly);
      setFeedbackHistory(Array.isArray(historyRes) ? historyRes : historyRes?.results || []);
    } catch (err) {
      let msg = 'Failed to load consultation feedback data. Please try again.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Consultation Feedback — CareFlow Patient Portal';
    fetchData();
  }, [fetchData]);

  const handleOpenReviewModal = (apt) => {
    const isCompleted = apt.status === 'COMPLETED' || apt.status === 'CHECKED_OUT' || apt.is_completed === true;
    if (!isCompleted) {
      toast.error('Feedback can only be submitted after consultation is completed.', 'Feedback Restricted');
      return;
    }
    setSelectedAppointment(apt);
    setRating(5);
    setHoverRating(0);
    setExperience('EXCELLENT');
    setCommunication('EXCELLENT');
    setSatisfaction('SATISFIED');
    setComments('');
    setFormErrors({});
  };

  const handleCloseReviewModal = () => {
    if (!isSubmitting) {
      setSelectedAppointment(null);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!selectedAppointment) return;
    const isCompleted = selectedAppointment.status === 'COMPLETED' || selectedAppointment.status === 'CHECKED_OUT' || selectedAppointment.is_completed === true;
    if (!isCompleted) {
      toast.error('Feedback can only be submitted after consultation is completed.', 'Feedback Restricted');
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setFormErrors({ rating: 'Please select a rating between 1 and 5 stars.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        appointment: selectedAppointment.id,
        doctor_rating: rating,
        consultation_experience: experience,
        doctor_communication: communication,
        overall_satisfaction: satisfaction,
        comments: comments.trim(),
      };

      await patientService.submitFeedback(payload);
      toast.success(
        `Thank you! Feedback for Dr. ${selectedAppointment.doctor_name} submitted successfully.`,
        'Feedback Recorded'
      );
      setSelectedAppointment(null);
      fetchData();
      setActiveTab('history');
    } catch (err) {
      let msg = 'Failed to submit feedback. Please check your submission and try again.';
      const resData = err.response?.data;
      if (resData) {
        if (typeof resData === 'string') msg = resData;
        else if (resData.detail) msg = resData.detail;
        else if (resData.appointment) {
          msg = Array.isArray(resData.appointment) ? resData.appointment[0] : resData.appointment;
        } else if (resData.non_field_errors) {
          msg = resData.non_field_errors[0];
        }
      }
      toast.error(msg, 'Feedback Error');
      setFormErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (count, interactive = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = interactive ? (hoverRating || rating) >= i : count >= i;
      stars.push(
        <button
          key={i}
          type="button"
          disabled={!interactive}
          style={{
            background: 'none',
            border: 'none',
            cursor: interactive ? 'pointer' : 'default',
            padding: interactive ? '2px' : '1px',
            color: filled ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            transition: 'transform 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={() => interactive && setHoverRating(i)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && setRating(i)}
          aria-label={`${i} Star${i > 1 ? 's' : ''}`}
        >
          <Star
            size={interactive ? 26 : 16}
            fill={filled ? '#fbbf24' : 'transparent'}
            stroke={filled ? '#fbbf24' : 'currentColor'}
          />
        </button>
      );
    }
    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>{stars}</div>;
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Consultation Feedback</h2>
          <p className="admin-page-subtitle">
            Share your consultation experience and review ratings for your treating physicians
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-row" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'eligible' ? 'active' : ''}`}
            onClick={() => setActiveTab('eligible')}
          >
            <Sparkles size={16} />
            <span>Eligible for Review ({eligibleAppointments.length})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Award size={16} />
            <span>My Submitted Reviews ({feedbackHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Loading consultation records...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Feedback</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchData}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* TAB 1: ELIGIBLE APPOINTMENTS FOR REVIEW */}
          {activeTab === 'eligible' && (
            <>
              {/* Consultation Completion Policy Banner */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--admin-radius-sm)',
                  padding: '0.85rem 1.15rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={18} style={{ color: 'var(--primary-cyan, #06b6d4)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)', lineHeight: '1.45' }}>
                  <strong>Consultation Feedback Policy:</strong> In accordance with hospital protocol, patient reviews, doctor ratings, and consultation feedback can <strong>only be submitted after your consultation has been completed</strong> by your attending physician.
                </span>
              </div>

              {eligibleAppointments.length === 0 ? (
                <div className="admin-empty-table-card">
                  <div className="admin-empty-icon-box">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3>All Consultations Reviewed</h3>
                  <p>
                    You have submitted feedback for all your completed consultations. New appointments will appear here once marked completed.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                  {eligibleAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="admin-card"
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <span className="admin-badge admin-badge-teal admin-font-mono">
                            {apt.appointment_id}
                          </span>
                          <span className="admin-badge admin-badge-success">
                            Completed Visit
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: 'rgba(6, 182, 212, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary-cyan, #06b6d4)',
                            }}
                          >
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-main)' }}>
                              Dr. {apt.doctor_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-cyan, #06b6d4)' }}>
                              {apt.doctor_specialization || 'Consulting Physician'}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          <span>Visited on {apt.appointment_date} at {apt.appointment_time?.slice(0, 5)}</span>
                        </div>

                        {apt.health_problem && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-main)', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--admin-text-muted)' }}>Concern: </span>
                            <strong>{apt.health_problem}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        onClick={() => handleOpenReviewModal(apt)}
                      >
                        <Star size={16} />
                        <span>Leave Feedback & Rating</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: MY SUBMITTED FEEDBACK HISTORY */}
          {activeTab === 'history' && (
            <>
              {feedbackHistory.length === 0 ? (
                <div className="admin-empty-table-card">
                  <div className="admin-empty-icon-box">
                    <MessageSquare size={32} />
                  </div>
                  <h3>No Feedback Submitted Yet</h3>
                  <p>
                    When you complete appointments and rate your doctors, your consultation reviews will be archived here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Appointment</th>
                          <th>Doctor</th>
                          <th>Rating</th>
                          <th>Experience</th>
                          <th>Communication</th>
                          <th>Satisfaction</th>
                          <th>Comments</th>
                          <th>Submitted On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedbackHistory
                          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                          .map((fb) => (
                            <tr key={fb.id}>
                              <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                                {fb.appointment_id || `#${fb.appointment}`}
                              </td>
                              <td className="font-semibold">
                                <div>Dr. {fb.doctor_name}</div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                                  {fb.doctor_specialization}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {renderStars(fb.doctor_rating)}
                                  <span className="admin-font-mono font-semibold" style={{ fontSize: '0.85rem' }}>
                                    {fb.doctor_rating}/5
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className="admin-badge"
                                  style={{
                                    background: 'rgba(6, 182, 212, 0.12)',
                                    color: 'var(--primary-cyan, #06b6d4)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {fb.consultation_experience}
                                </span>
                              </td>
                              <td>
                                <span className="admin-badge admin-badge-teal">
                                  {fb.doctor_communication}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="admin-badge"
                                  style={{
                                    background:
                                      fb.overall_satisfaction === 'SATISFIED'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : fb.overall_satisfaction === 'NEUTRAL'
                                          ? 'rgba(245, 158, 11, 0.15)'
                                          : 'rgba(239, 68, 68, 0.15)',
                                    color:
                                      fb.overall_satisfaction === 'SATISFIED'
                                        ? '#10b981'
                                        : fb.overall_satisfaction === 'NEUTRAL'
                                          ? '#f59e0b'
                                          : '#ef4444',
                                  }}
                                >
                                  {fb.overall_satisfaction}
                                </span>
                              </td>
                              <td style={{ maxWidth: '240px' }}>
                                {fb.comments ? (
                                  <span
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      fontSize: '0.82rem',
                                    }}
                                    title={fb.comments}
                                  >
                                    "{fb.comments}"
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-dim)' }}>
                                    No written remarks
                                  </span>
                                )}
                              </td>
                              <td className="admin-font-mono" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                                {fb.created_at ? fb.created_at.slice(0, 10) : '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(feedbackHistory.length / pageSize)}
                    totalCount={feedbackHistory.length}
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBMIT FEEDBACK MODAL (Glassmorphism & Reusable Components)
      ───────────────────────────────────────────────────────────── */}
      {selectedAppointment && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={handleCloseReviewModal}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '580px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.3))',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                      }}
                    >
                      <Star size={18} />
                    </div>
                    <div>
                      <h3 className="admin-modal-title">Consultation Feedback</h3>
                      <p className="admin-modal-subtitle">
                        Rate your experience with Dr. {selectedAppointment.doctor_name}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={handleCloseReviewModal}
                  disabled={isSubmitting}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitFeedback}>
                <div className="admin-modal-body">
                  {formErrors.general && (
                    <div className="admin-alert admin-alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                      <AlertCircle size={16} />
                      <span>{formErrors.general}</span>
                    </div>
                  )}

                  {/* Consultation Summary Banner */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--admin-card-border)',
                      borderRadius: 'var(--admin-radius-sm)',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text-main)' }}>
                        Dr. {selectedAppointment.doctor_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary-cyan, #06b6d4)' }}>
                        {selectedAppointment.doctor_specialization || 'Physician'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                      <div>Appt: {selectedAppointment.appointment_id}</div>
                      <div>Date: {selectedAppointment.appointment_date}</div>
                    </div>
                  </div>

                  {/* 1. Doctor Rating (1 to 5 Stars) */}
                  <div className="admin-form-group" style={{ textAlign: 'center', margin: '1.25rem 0' }}>
                    <label className="admin-form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Doctor Rating <span className="admin-required">*</span>
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      {renderStars(rating, true)}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-cyan, #06b6d4)', display: 'block', marginTop: '4px' }}>
                      {rating === 5 && 'Outstanding (5 Stars)'}
                      {rating === 4 && 'Very Good (4 Stars)'}
                      {rating === 3 && 'Average (3 Stars)'}
                      {rating === 2 && 'Needs Improvement (2 Stars)'}
                      {rating === 1 && 'Unsatisfactory (1 Star)'}
                    </span>
                    {formErrors.rating && (
                      <span className="admin-form-error" style={{ justifyContent: 'center' }}>
                        <AlertCircle size={13} /> {formErrors.rating}
                      </span>
                    )}
                  </div>

                  {/* 2. Consultation Experience */}
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Consultation Experience <span className="admin-required">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`booking-slot-chip ${experience === opt.value ? 'selected' : ''}`}
                          style={{
                            padding: '0.5rem 0.25rem',
                            textAlign: 'center',
                            fontWeight: experience === opt.value ? 700 : 500,
                          }}
                          onClick={() => setExperience(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Doctor Communication */}
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Doctor Communication <span className="admin-required">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {COMMUNICATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`booking-slot-chip ${communication === opt.value ? 'selected' : ''}`}
                          style={{
                            padding: '0.5rem 0.25rem',
                            textAlign: 'center',
                            fontWeight: communication === opt.value ? 700 : 500,
                          }}
                          onClick={() => setCommunication(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Overall Satisfaction */}
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Overall Satisfaction <span className="admin-required">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {SATISFACTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`booking-slot-chip ${satisfaction === opt.value ? 'selected' : ''}`}
                          style={{
                            padding: '0.5rem 0.25rem',
                            textAlign: 'center',
                            fontWeight: satisfaction === opt.value ? 700 : 500,
                          }}
                          onClick={() => setSatisfaction(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Optional Comments */}
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="feedback-comments">
                      Additional Comments / Feedback <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>(Optional)</span>
                    </label>
                    <textarea
                      id="feedback-comments"
                      rows={3}
                      className="admin-input admin-form-textarea"
                      placeholder="Share additional remarks regarding the diagnosis, bedside manner, or hospital facility..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      maxLength={1000}
                    />
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleCloseReviewModal}
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
                        <span>Submitting Feedback...</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp size={16} />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PatientFeedbackPage;

