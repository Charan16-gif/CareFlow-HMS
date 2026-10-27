import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Calendar,
  Clock,
  Search,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  User,
  FileText,
  Filter,
  FlaskConical,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const DoctorAppointmentsPage = () => {
  const navigate = useNavigate();

  const [appointmentsData, setAppointmentsData] = useState({
    all: [],
    today: [],
    upcoming: [],
    previous: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'upcoming' | 'today' | 'previous' | 'all'
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Details Modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Cancel Appointment Modal
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [completing, setCompleting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isDetailsModalOpen || isCancelModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailsModalOpen, isCancelModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCancelModalOpen && !cancelling) {
          setIsCancelModalOpen(false);
        } else if (isDetailsModalOpen) {
          setIsDetailsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsModalOpen, isCancelModalOpen, cancelling]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorService.getAppointments();
      setAppointmentsData(res);
    } catch (err) {
      let msg = 'Failed to load appointments from the hospital database.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setAppointmentsData({ all: [], today: [], upcoming: [], previous: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Appointments — CareFlow HMS Doctor';
    fetchAppointments();
  }, [fetchAppointments]);

  // Determine current list based on active tab
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'upcoming') list = appointmentsData.upcoming;
    else if (activeTab === 'today') list = appointmentsData.today;
    else if (activeTab === 'previous') list = appointmentsData.previous;
    else list = appointmentsData.all;

    return list.filter((apt) => {
      // Filter by status if not ALL
      if (statusFilter !== 'ALL' && apt.status !== statusFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientMatch = (apt.patient_name || '').toLowerCase().includes(q);
        const reasonMatch = (apt.reason_for_visit || '').toLowerCase().includes(q);
        const idMatch = (apt.appointment_id || '').toLowerCase().includes(q);
        const dateMatch = (apt.appointment_date || '').toLowerCase().includes(q);
        return patientMatch || reasonMatch || idMatch || dateMatch;
      }

      return true;
    });
  }, [appointmentsData, activeTab, statusFilter, searchQuery]);

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
      case 'CHECKED_OUT':
        return <span className="admin-badge admin-badge-green">Completed & Checked Out</span>;
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

  const handleOpenDetails = (apt) => {
    setSelectedAppointment(apt);
    setIsDetailsModalOpen(true);
  };

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
      const msg = `Appointment ${appointmentToCancel.appointment_id || `#${appointmentToCancel.id}`} with ${appointmentToCancel.patient_name || 'patient'} has been cancelled.`;
      toast.info(msg, 'Appointment Cancelled');
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);

      // If details modal was open with this appointment, update its status
      if (selectedAppointment && selectedAppointment.id === appointmentToCancel.id) {
        setSelectedAppointment((prev) => ({ ...prev, status: 'CANCELLED' }));
      }
      fetchAppointments();
    } catch (err) {
      let msg = 'Failed to cancel the appointment. Please check connection and try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      toast.error(msg, 'Cancellation Error');
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleCompleteConsultation = async (apt) => {
    if (!apt) return;
    setCompleting(true);
    try {
      await doctorService.completeConsultation(apt.id);
      toast.success(
        `Consultation completed for ${apt.patient_name || 'patient'}. Patient has been checked out successfully.`,
        'Consultation Completed'
      );
      if (selectedAppointment && selectedAppointment.id === apt.id) {
        setSelectedAppointment((prev) => ({
          ...prev,
          status: 'COMPLETED',
          is_checked_in: false,
          check_out_time: new Date().toISOString(),
        }));
      }
      fetchAppointments();
    } catch (err) {
      let msg = 'Failed to complete consultation. Please try again.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toast.error(msg, 'Error');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Appointments</h2>
          <p className="admin-page-subtitle">
            Review and monitor patient consultations scheduled with your practice
          </p>
        </div>

        <div className="admin-page-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/doctor/prescriptions')}
          >
            <FileText size={16} />
            <span>Prescriptions</span>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="admin-modal-tabs" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--admin-border)' }}>
        <button
          type="button"
          className={`admin-modal-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Calendar size={16} />
          <span>Upcoming Appointments ({appointmentsData.upcoming.length})</span>
        </button>
        <button
          type="button"
          className={`admin-modal-tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <Clock size={16} />
          <span>Today&apos;s Appointments ({appointmentsData.today.length})</span>
        </button>
        <button
          type="button"
          className={`admin-modal-tab ${activeTab === 'previous' ? 'active' : ''}`}
          onClick={() => setActiveTab('previous')}
        >
          <CheckCircle2 size={16} />
          <span>Previous Appointments ({appointmentsData.previous.length})</span>
        </button>
        <button
          type="button"
          className={`admin-modal-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Consultations ({appointmentsData.all.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="admin-table-controls" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient, reason, or appointment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <Filter size={15} className="admin-text-dim" />
          <select
            className="admin-input"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter appointments by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
          <span className="admin-table-record-count">
            {currentList.length} {currentList.length === 1 ? 'Appointment' : 'Appointments'}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving consultation records...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Appointments</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={fetchAppointments}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && currentList.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <Calendar size={32} />
          </div>
          <h3>No Appointments Found</h3>
          <p>
            {searchQuery
              ? `No appointments match "${searchQuery}". Try a different keyword.`
              : activeTab === 'today'
                ? 'You have no consultations scheduled for today.'
                : activeTab === 'upcoming'
                  ? 'No upcoming appointments scheduled in your calendar.'
                  : 'No appointments recorded in this section.'}
          </p>
        </div>
      )}

      {/* Appointments Table */}
      {!loading && !error && currentList.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Doctor patient appointments">
            <thead>
              <tr>
                <th scope="col">Appointment ID</th>
                <th scope="col">Patient</th>
                <th scope="col">Date & Time</th>
                <th scope="col">Reason for Visit</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((apt) => (
                <tr key={apt.id}>
                  {/* Appointment ID */}
                  <td className="admin-font-mono admin-font-semibold">
                    {apt.appointment_id || `#${apt.id}`}
                  </td>

                  {/* Patient Name */}
                  <td>
                    <div className="admin-user-cell">
                      <User size={15} className="admin-text-teal" />
                      <div>
                        <span className="admin-user-name" style={{ display: 'block' }}>
                          {apt.patient_name || (apt.patient_details ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}` : 'Patient')}
                        </span>
                        {apt.patient_id_code && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                            {apt.patient_id_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="admin-font-mono" style={{ fontSize: '0.85rem' }}>
                        {apt.appointment_date}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} />
                        {apt.appointment_time ? apt.appointment_time.slice(0, 5) : '—'}
                      </span>
                    </div>
                  </td>

                  {/* Reason for Visit */}
                  <td>
                    <span style={{ fontSize: '0.875rem' }}>
                      {apt.reason_for_visit || 'General Consultation'}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td>{getStatusBadge(apt.status)}</td>

                  {/* Actions */}
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn-view"
                        onClick={() => handleOpenDetails(apt)}
                        aria-label={`View details for appointment ${apt.appointment_id}`}
                        title="View Consultation Details"
                      >
                        <Eye size={15} />
                      </button>
                      {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-delete"
                          onClick={() => handleInitiateCancel(apt)}
                          aria-label={`Cancel appointment ${apt.appointment_id}`}
                          title="Cancel Appointment"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointment Details Modal */}
      {isDetailsModalOpen && selectedAppointment && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsDetailsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-details-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '580px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="appointment-details-title" className="admin-modal-title">
                    Consultation Details
                  </h3>
                  <p className="admin-modal-subtitle">
                    Appointment {selectedAppointment.appointment_id || `#${selectedAppointment.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                {/* Status and Patient Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--admin-surface-secondary)',
                    borderRadius: 'var(--admin-radius-sm)',
                    border: '1px solid var(--admin-border)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(20, 184, 166, 0.15)',
                        border: '1px solid rgba(20, 184, 166, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-teal, #14b8a6)',
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block' }}>
                        {selectedAppointment.patient_name || (selectedAppointment.patient_details ? `${selectedAppointment.patient_details.first_name} ${selectedAppointment.patient_details.last_name}` : 'Patient')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        Patient ID: {selectedAppointment.patient_id_code || 'CF-P'}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(selectedAppointment.status)}
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div className="admin-form-group">
                    <span className="admin-form-label" style={{ marginBottom: '0.2rem' }}>Appointment Date</span>
                    <span className="admin-font-mono" style={{ fontSize: '0.9rem' }}>
                      {selectedAppointment.appointment_date}
                    </span>
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label" style={{ marginBottom: '0.2rem' }}>Consultation Time</span>
                    <span className="admin-font-mono" style={{ fontSize: '0.9rem' }}>
                      {selectedAppointment.appointment_time ? selectedAppointment.appointment_time.slice(0, 5) : '—'}
                    </span>
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label" style={{ marginBottom: '0.2rem' }}>Assigned Doctor</span>
                    <span style={{ fontSize: '0.9rem' }}>
                      {selectedAppointment.doctor_name || 'Dr. Assigned'}
                    </span>
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label" style={{ marginBottom: '0.2rem' }}>Department / Specialization</span>
                    <span style={{ fontSize: '0.9rem' }}>
                      {selectedAppointment.doctor_department || selectedAppointment.doctor_specialization || 'General Medicine'}
                    </span>
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label" style={{ marginBottom: '0.2rem' }}>Visit & Checkout Status</span>
                    <span style={{ fontSize: '0.85rem' }}>
                      {selectedAppointment.check_out_time || ['COMPLETED', 'CHECKED_OUT'].includes(selectedAppointment.status) ? (
                        <span className="admin-badge admin-badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={13} /> Patient Checked Out
                        </span>
                      ) : selectedAppointment.is_checked_in ? (
                        <span className="admin-badge admin-badge-teal" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} /> Checked In (In Consultation)
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-gray">Awaiting Reception Check-In</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Primary Complaint / Reason for visit */}
                <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                  <span className="admin-form-label" style={{ marginBottom: '0.3rem' }}>Primary Complaint / Reason</span>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--admin-surface-secondary)',
                      borderRadius: 'var(--admin-radius-sm)',
                      border: '1px solid var(--admin-border)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedAppointment.reason_for_visit || 'No reason specified'}
                  </div>
                </div>

                {/* Authorized Clinical Notes if available */}
                {selectedAppointment.authorized_notes && (
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <span className="admin-form-label" style={{ marginBottom: '0.3rem' }}>Clinical Notes</span>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--admin-surface-secondary)',
                        borderRadius: 'var(--admin-radius-sm)',
                        border: '1px solid var(--admin-border)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedAppointment.authorized_notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'CHECKED_OUT' && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleInitiateCancel(selectedAppointment);
                      }}
                    >
                      <X size={16} />
                      <span>Cancel Appointment</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                  {selectedAppointment.status === 'COMPLETED' || selectedAppointment.status === 'CHECKED_OUT' || selectedAppointment.check_out_time ? (
                    <span
                      className="admin-badge admin-badge-green"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Consultation Completed & Checked Out</span>
                    </span>
                  ) : selectedAppointment.is_checked_in ? (
                    <>
                      {selectedAppointment.has_lab_test ? (
                        <span
                          className="admin-badge"
                          style={{
                            background: 'rgba(148, 163, 184, 0.15)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.75rem',
                          }}
                          title="A lab test request has already been ordered for this consultation"
                        >
                          <FlaskConical size={14} />
                          <span>Lab Test Ordered</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => {
                            setIsDetailsModalOpen(false);
                            navigate('/doctor/lab-tests', {
                              state: {
                                selectedPatientId: selectedAppointment.patient,
                                selectedAppointmentId: selectedAppointment.id,
                              },
                            });
                          }}
                        >
                          <FlaskConical size={16} />
                          <span>Order Lab Test</span>
                        </button>
                      )}

                      {selectedAppointment.has_prescription ? (
                        <span
                          className="admin-badge"
                          style={{
                            background: 'rgba(148, 163, 184, 0.15)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.75rem',
                          }}
                          title="A prescription has already been issued for this consultation"
                        >
                          <FileText size={14} />
                          <span>Prescription Issued</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={() => {
                            setIsDetailsModalOpen(false);
                            navigate('/doctor/prescriptions', {
                              state: {
                                selectedPatientId: selectedAppointment.patient,
                                selectedAppointmentId: selectedAppointment.id,
                              },
                            });
                          }}
                        >
                          <FileText size={16} />
                          <span>Write Prescription</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-btn admin-btn-success"
                        disabled={completing}
                        style={{ background: '#10b981', color: '#ffffff', borderColor: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                        onClick={() => handleCompleteConsultation(selectedAppointment)}
                      >
                        {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        <span>{completing ? 'Completing...' : 'Complete & Check Out'}</span>
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.45rem 0.85rem', borderRadius: 'var(--admin-radius-sm)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <AlertCircle size={15} />
                      <span>Reception check-in required to prescribe or order lab tests</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {isCancelModalOpen && appointmentToCancel && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => !cancelling && setIsCancelModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-apt-modal-title"
          >
            <div
              className="admin-modal-card admin-modal-card-danger"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '480px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="cancel-apt-modal-title" className="admin-modal-title" style={{ color: 'var(--admin-danger, #ef4444)' }}>
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

export default DoctorAppointmentsPage;
