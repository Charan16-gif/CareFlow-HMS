import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import authService from '../../services/authService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const DoctorOverviewPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation State
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const doctorProfile = authService.getUserProfile();
  const doctorName = doctorProfile
    ? (doctorProfile.first_name ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name || ''}`.trim() : doctorProfile.username)
    : 'Doctor';

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorService.getOverviewData();
      setData(res);
    } catch (err) {
      let msg = 'Failed to load doctor dashboard records. Please check connection and try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Doctor Overview — CareFlow HMS';
    fetchOverview();
  }, []);

  // Lock body scroll when cancel modal is open
  useEffect(() => {
    if (isCancelModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCancelModalOpen]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCancelModalOpen && !cancelling) {
        setIsCancelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCancelModalOpen, cancelling]);

  const handleInitiateCancel = (apt) => {
    setAppointmentToCancel(apt);
    setCancelError('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setCancelling(true);
    setCancelError('');
    try {
      await doctorService.cancelAppointment(appointmentToCancel.id);
      const msg = `Appointment for ${appointmentToCancel.patient_name || 'patient'} has been cancelled.`;
      toast.success(msg, 'Appointment Cancelled');
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      fetchOverview();
    } catch (err) {
      let msg = 'Failed to cancel the appointment. Please try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setCancelError(msg);
      toast.error(msg, 'Cancellation Failed');
    } finally {
      setCancelling(false);
    }
  };

  // Format today's date in Simple English
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const summaryCards = [
    {
      id: 'today',
      title: "Today's Appointments",
      count: data?.counts?.todayAppointments ?? 0,
      icon: Clock,
      color: 'teal',
      path: '/doctor/appointments',
      description: data?.todaySchedule?.length > 0
        ? `${data.todaySchedule.length} consultation${data.todaySchedule.length === 1 ? '' : 's'} scheduled for today`
        : 'No consultations scheduled for today',
    },
    {
      id: 'upcoming',
      title: 'Upcoming Appointments',
      count: data?.counts?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: 'navy',
      path: '/doctor/appointments',
      description: data?.upcomingAppointments?.length > 0
        ? `Next: ${data.upcomingAppointments[0].appointment_date} at ${data.upcomingAppointments[0].appointment_time?.slice(0, 5)}`
        : 'No upcoming appointments scheduled',
    },
    {
      id: 'completed',
      title: 'Completed Appointments',
      count: data?.counts?.completedAppointments ?? 0,
      icon: CheckCircle2,
      color: 'green',
      path: '/doctor/appointments',
      description: 'Consultations marked as finished',
    },
    {
      id: 'pending',
      title: 'Pending Appointments',
      count: data?.counts?.pendingAppointments ?? 0,
      icon: AlertTriangle,
      color: 'cyan',
      path: '/doctor/appointments',
      description: 'Scheduled or confirmed bookings',
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="admin-badge admin-badge-teal">Confirmed</span>;
      case 'SCHEDULED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            Scheduled
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}
          >
            In Progress
          </span>
        );
      case 'COMPLETED':
        return <span className="admin-badge admin-badge-green">Completed</span>;
      case 'CANCELLED':
        return <span className="admin-badge admin-badge-red">Cancelled</span>;
      case 'NO_SHOW':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(156, 163, 175, 0.15)',
              color: '#9ca3af',
              border: '1px solid rgba(156, 163, 175, 0.35)',
            }}
          >
            No Show
          </span>
        );
      default:
        return <span className="admin-badge admin-badge-teal">{status || 'Scheduled'}</span>;
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <span
              className="admin-badge admin-badge-teal"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Doctor Dashboard
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
              • {formattedToday}
            </span>
          </div>
          <h2 className="admin-page-title">
            Welcome back, {doctorName}
          </h2>
          <p className="admin-page-subtitle">
            Here is your daily clinical overview, scheduled consultations, and patient activity.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <Link to="/doctor/prescriptions" className="admin-btn admin-btn-primary">
            <FileText size={16} />
            <span>Write Prescription</span>
          </Link>
          <Link to="/doctor/schedule" className="admin-btn admin-btn-outline">
            <Clock size={16} />
            <span>View Schedule</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving your clinical consultations and statistics...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Dashboard Data</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={fetchOverview}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Key Metric Summary Cards */}
          <section className="admin-stat-grid" aria-label="Appointment Statistics">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className={`admin-stat-card admin-stat-card-${card.color}`}
                  onClick={() => navigate(card.path)}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(card.path);
                  }}
                  aria-label={`${card.title}: ${card.count}`}
                >
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">{card.title}</span>
                    <div className="admin-stat-icon-box">
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="admin-stat-count">{card.count}</div>
                  <div className="admin-stat-footer">
                    <span>{card.description}</span>
                    <ArrowRight size={14} className="admin-stat-arrow" />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Main Two-Column Layout: Today's Schedule & Upcoming Consultations */}
          <div className="admin-overview-grid" style={{ marginTop: '1.75rem' }}>
            {/* Left Column: Today's Schedule */}
            <div className="admin-card" style={{ height: 'fit-content' }}>
              <div
                className="admin-card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid var(--admin-border)',
                }}
              >
                <div>
                  <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} className="admin-text-teal" />
                    <span>Today&apos;s Schedule</span>
                  </h3>
                  <p className="admin-card-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Consultation timetable for {formattedToday}
                  </p>
                </div>
                <span className="admin-badge admin-badge-teal">
                  {data.todaySchedule.length} Consultation{data.todaySchedule.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="admin-card-body" style={{ padding: '1.25rem 0 0' }}>
                {data.todaySchedule.length === 0 ? (
                  <div className="admin-empty-table-card" style={{ padding: '2.5rem 1rem' }}>
                    <div className="admin-empty-icon-box">
                      <Clock size={28} />
                    </div>
                    <h4>No Appointments Scheduled for Today</h4>
                    <p style={{ maxWidth: '340px', margin: '0.4rem auto 0' }}>
                      You have no patient consultations scheduled for today. Check your upcoming schedule or view all appointments.
                    </p>
                    <Link
                      to="/doctor/appointments"
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      style={{ marginTop: '1rem' }}
                    >
                      View All Appointments
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.todaySchedule.map((apt) => (
                      <div
                        key={apt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          background: 'var(--admin-surface-secondary)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--admin-radius-sm)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              padding: '0.4rem 0.65rem',
                              background: 'rgba(20, 184, 166, 0.12)',
                              border: '1px solid rgba(20, 184, 166, 0.25)',
                              borderRadius: '6px',
                              textAlign: 'center',
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-teal, #14b8a6)', display: 'block' }}>
                              {apt.appointment_time ? apt.appointment_time.slice(0, 5) : '—'}
                            </span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <User size={14} className="admin-text-teal" />
                              <strong style={{ fontSize: '0.9rem' }}>
                                {apt.patient_name || (apt.patient_details ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}` : 'Patient')}
                              </strong>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', margin: '0.15rem 0 0' }}>
                              {apt.reason_for_visit ? `Reason: ${apt.reason_for_visit}` : 'General consultation'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {getStatusBadge(apt.status)}
                          <Link
                            to="/doctor/appointments"
                            className="admin-icon-btn admin-icon-btn-view"
                            title="View appointment details"
                            aria-label={`View consultation with ${apt.patient_name}`}
                          >
                            <ArrowRight size={14} />
                          </Link>
                          {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn-delete"
                              onClick={() => handleInitiateCancel(apt)}
                              title="Cancel appointment"
                              aria-label={`Cancel appointment with ${apt.patient_name}`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Upcoming Appointments Preview & Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Upcoming Appointments Card */}
              <div className="admin-card">
                <div
                  className="admin-card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--admin-border)',
                  }}
                >
                  <div>
                    <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={18} className="admin-text-navy" />
                      <span>Upcoming Consultations</span>
                    </h3>
                    <p className="admin-card-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Next scheduled visits across your practice
                    </p>
                  </div>
                  <Link
                    to="/doctor/appointments"
                    className="admin-table-action-link"
                    style={{ fontSize: '0.8rem' }}
                  >
                    View All
                  </Link>
                </div>

                <div className="admin-card-body" style={{ padding: '1.25rem 0 0' }}>
                  {data.upcomingAppointments.length === 0 ? (
                    <div className="admin-empty-table-card" style={{ padding: '2rem 1rem' }}>
                      <div className="admin-empty-icon-box">
                        <Calendar size={26} />
                      </div>
                      <h4>No Upcoming Appointments</h4>
                      <p style={{ fontSize: '0.85rem' }}>
                        You have no upcoming consultations in the calendar.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {data.upcomingAppointments.slice(0, 4).map((apt) => (
                        <div
                          key={apt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 0.9rem',
                            background: 'var(--admin-surface-secondary)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: 'var(--admin-radius-sm)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <User size={13} className="admin-text-teal" />
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                {apt.patient_name || (apt.patient_details ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}` : 'Patient')}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                              {apt.appointment_date} at {apt.appointment_time?.slice(0, 5) || '09:00'}
                              {apt.reason_for_visit && ` • ${apt.reason_for_visit}`}
                            </span>
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  className="admin-card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => navigate('/doctor/schedule')}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate('/doctor/schedule');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(20, 184, 166, 0.12)',
                        color: 'var(--primary-teal, #14b8a6)',
                      }}
                    >
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>My Schedule</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        View timetable
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: 0 }}>
                    Chronological timetable of all your consultations.
                  </p>
                </div>

                <div
                  className="admin-card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => navigate('/doctor/prescriptions')}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate('/doctor/prescriptions');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Prescriptions</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        {data.counts.totalPrescriptions} Authored
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: 0 }}>
                    Create, view, update, and manage patient prescriptions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {isCancelModalOpen && appointmentToCancel && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => !cancelling && setIsCancelModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-overview-apt-title"
          >
            <div
              className="admin-modal-card admin-modal-card-danger"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '480px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="cancel-overview-apt-title" className="admin-modal-title" style={{ color: 'var(--admin-danger, #ef4444)' }}>
                    Cancel Appointment
                  </h3>
                  <p className="admin-modal-subtitle">
                    Appointment {appointmentToCancel.appointment_id || `#${appointmentToCancel.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={cancelling}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                {cancelError && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div
                  style={{
                    padding: '1rem',
                    background: 'var(--admin-surface-secondary)',
                    borderRadius: 'var(--admin-radius-sm)',
                    border: '1px solid var(--admin-border)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--admin-text-muted)' }}>Patient: </span>
                      <strong>{appointmentToCancel.patient_name || (appointmentToCancel.patient_details ? `${appointmentToCancel.patient_details.first_name} ${appointmentToCancel.patient_details.last_name}` : 'Patient')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--admin-text-muted)' }}>Date & Time: </span>
                      <span className="admin-font-mono">
                        {appointmentToCancel.appointment_date} at {appointmentToCancel.appointment_time ? appointmentToCancel.appointment_time.slice(0, 5) : '—'}
                      </span>
                    </div>
                    {appointmentToCancel.reason_for_visit && (
                      <div>
                        <span style={{ color: 'var(--admin-text-muted)' }}>Reason: </span>
                        <span>{appointmentToCancel.reason_for_visit}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-dim)', margin: 0 }}>
                  Are you sure you want to cancel this scheduled consultation? The appointment status will be updated to <strong>Cancelled</strong>.
                </p>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={cancelling}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default DoctorOverviewPage;
