import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import receptionistService from '../../services/receptionistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  FileCheck,
  Ban,
  Search,
  Eye,
  ArrowRight,
  Loader2,
  AlertCircle,
  UserPlus,
  Hourglass,
  CalendarPlus,
  X,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistOverviewPage = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    today_appointments: 0,
    upcoming_appointments: 0,
    registered_patients: 0,
    checked_in_today: 0,
    waiting_patients: 0,
    completed_today: 0,
    cancelled_today: 0,
  });

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Appointment for Details Modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [statsData, appointmentsData] = await Promise.all([
        receptionistService.getStats(),
        receptionistService.getAppointments({ appointment_date: todayStr }),
      ]);
      setStats(statsData || {});
      const list = Array.isArray(appointmentsData)
        ? appointmentsData
        : appointmentsData?.results || [];
      setTodayAppointments(list);
    } catch (err) {
      setError('Failed to load reception desk statistics and daily appointments. Please verify connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Receptionist Dashboard — CareFlow HMS';
    fetchOverviewData();
  }, [fetchOverviewData]);

  const handleCheckIn = async (appointmentId) => {
    setCheckingInId(appointmentId);
    try {
      const res = await receptionistService.checkInPatient(appointmentId);
      const msg = res?.message || 'Patient marked as arrived and placed in doctor consultation queue.';
      toast.success(msg, 'Check-in Confirmed');
      fetchOverviewData();
    } catch (err) {
      const errorMsg = 'Unable to check in patient: ' + (err?.response?.data?.error || err?.response?.data?.detail || err.message);
      toast.error(errorMsg, 'Check-in Failed');
    } finally {
      setCheckingInId(null);
    }
  };

  // Filter today's appointments
  const filteredAppointments = todayAppointments.filter((apt) => {
    const q = searchQuery.toLowerCase().trim();
    const patientName = (apt.patient_name || '').toLowerCase();
    const patientId = (apt.patient_id_code || '').toLowerCase();
    const doctorName = (apt.doctor_name || '').toLowerCase();
    const aptId = (apt.appointment_id || '').toLowerCase();
    const reason = (apt.reason_for_visit || '').toLowerCase();

    const matchesSearch =
      !q ||
      patientName.includes(q) ||
      patientId.includes(q) ||
      doctorName.includes(q) ||
      aptId.includes(q) ||
      reason.includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CHECKED_IN') return apt.is_checked_in;
    if (statusFilter === 'WAITING') {
      return (
        apt.is_checked_in &&
        (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED')
      );
    }
    return apt.status === statusFilter;
  });

  const getStatusBadge = (status, isCheckedIn) => {
    let badgeClass = 'admin-badge-requested';
    if (status === 'CONFIRMED' || isCheckedIn) badgeClass = 'admin-badge-accepted';
    if (status === 'IN_PROGRESS') badgeClass = 'admin-badge-in_progress';
    if (status === 'COMPLETED') badgeClass = 'admin-badge-completed';
    if (status === 'CANCELLED' || status === 'NO_SHOW') badgeClass = 'admin-badge-cancelled';

    return (
      <span className={`admin-badge ${badgeClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="admin-overview-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Reception & Front Desk Overview</h2>
          <p className="admin-page-subtitle">
            Monitor real-time patient arrivals, doctor appointments, check-ins, and queue activity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/receptionist/appointments?action=book')}
          >
            <CalendarPlus size={16} />
            <span>Book Appointment</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/receptionist/patients?action=register')}
          >
            <UserPlus size={16} />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <section className="admin-stat-grid" aria-label="Reception Operations Statistics">
        {/* Today's Appointments */}
        <div
          className="admin-stat-card admin-stat-card-navy"
          onClick={() => navigate('/receptionist/appointments?filter=today')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Today's Appointments</span>
            <div className="admin-stat-icon-box">
              <Calendar size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.today_appointments}</div>
          <div className="admin-stat-footer">
            <span>Scheduled for today</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div
          className="admin-stat-card admin-stat-card-cyan"
          onClick={() => navigate('/receptionist/appointments?filter=upcoming')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Upcoming</span>
            <div className="admin-stat-icon-box">
              <Clock size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.upcoming_appointments}</div>
          <div className="admin-stat-footer">
            <span>Future consultations booked</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Registered Patients */}
        <div
          className="admin-stat-card admin-stat-card-teal"
          onClick={() => navigate('/receptionist/patients')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Registered Patients</span>
            <div className="admin-stat-icon-box">
              <Users size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.registered_patients}</div>
          <div className="admin-stat-footer">
            <span>Active hospital profiles</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Checked-in Today */}
        <div
          className="admin-stat-card admin-stat-card-green"
          onClick={() => navigate('/receptionist/check-in')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Checked-in Today</span>
            <div className="admin-stat-icon-box">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.checked_in_today}</div>
          <div className="admin-stat-footer">
            <span>Patients arrived on premise</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Patients Waiting */}
        <div
          className="admin-stat-card admin-stat-card-amber"
          onClick={() => navigate('/receptionist/check-in')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Patients Waiting</span>
            <div className="admin-stat-icon-box">
              <Hourglass size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.waiting_patients}</div>
          <div className="admin-stat-footer">
            <span>Awaiting doctor call</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Completed Today */}
        <div
          className="admin-stat-card admin-stat-card-green"
          onClick={() => setStatusFilter('COMPLETED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Completed Today</span>
            <div className="admin-stat-icon-box">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.completed_today}</div>
          <div className="admin-stat-footer">
            <span>Consultations concluded</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>

        {/* Cancelled */}
        <div
          className="admin-stat-card admin-stat-card-red"
          onClick={() => setStatusFilter('CANCELLED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-top">
            <span className="admin-stat-title">Cancelled Today</span>
            <div className="admin-stat-icon-box">
              <Ban size={20} />
            </div>
          </div>
          <div className="admin-stat-count">{stats.cancelled_today}</div>
          <div className="admin-stat-footer">
            <span>Discontinued bookings</span>
            <ArrowRight size={14} className="admin-stat-arrow" />
          </div>
        </div>
      </section>

      {/* Quick Action Shortcuts Bar */}
      <div className="admin-content-card" style={{ padding: '1.25rem 1.5rem', marginTop: '0.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-heading-color)', marginBottom: '0.85rem' }}>
          Front-Desk Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => navigate('/receptionist/patients?action=register')}
          >
            <UserPlus size={15} />
            <span>Register New Patient</span>
          </button>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => navigate('/receptionist/appointments?action=book')}
          >
            <CalendarPlus size={15} />
            <span>Book New Appointment</span>
          </button>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => navigate('/receptionist/patients')}
          >
            <Search size={15} />
            <span>Search Patient Records</span>
          </button>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => navigate('/receptionist/check-in')}
          >
            <UserCheck size={15} />
            <span>Open Check-in & Waiting Room</span>
          </button>
          <button
            type="button"
            className="admin-action-btn"
            onClick={() => navigate('/receptionist/schedule')}
          >
            <Clock size={15} />
            <span>View Doctor Schedules</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="admin-tabs-row" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'ALL', label: "All Today's Appointments", count: todayAppointments.length },
          {
            key: 'WAITING',
            label: 'Waiting in Clinic',
            count: todayAppointments.filter((a) => a.is_checked_in && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED')).length,
          },
          {
            key: 'CHECKED_IN',
            label: 'Checked In',
            count: todayAppointments.filter((a) => a.is_checked_in).length,
          },
          {
            key: 'IN_PROGRESS',
            label: 'In Consultation',
            count: todayAppointments.filter((a) => a.status === 'IN_PROGRESS').length,
          },
          {
            key: 'COMPLETED',
            label: 'Completed',
            count: todayAppointments.filter((a) => a.status === 'COMPLETED').length,
          },
          {
            key: 'CANCELLED',
            label: 'Cancelled',
            count: todayAppointments.filter((a) => a.status === 'CANCELLED').length,
          },
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

      {/* Search & Records Count Controls */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient name, ID, doctor, appointment code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="admin-table-record-count">
          Showing {filteredAppointments.length} of {todayAppointments.length} appointments
        </span>
      </div>

      {/* Today's Appointments Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading today's clinical appointments and patient arrivals...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <Calendar size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Appointments Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--admin-text-muted)' }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No appointments match your search and filter criteria.'
              : "There are no appointments scheduled for today in the hospital system."}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/receptionist/appointments?action=book')}
          >
            <CalendarPlus size={16} />
            <span>Book an Appointment</span>
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient Details</th>
                <th>Doctor & Dept</th>
                <th>Slot Time</th>
                <th>Reason for Visit</th>
                <th>Status</th>
                <th>Check-in Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((apt) => {
                const canCheckIn =
                  !apt.is_checked_in &&
                  apt.status !== 'CANCELLED' &&
                  apt.status !== 'COMPLETED' &&
                  apt.status !== 'NO_SHOW';

                const patName =
                  apt.patient_name ||
                  (apt.patient_details
                    ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}`
                    : 'Patient');
                const docName =
                  apt.doctor_name ||
                  (apt.doctor_details?.user
                    ? `Dr. ${apt.doctor_details.user.first_name} ${apt.doctor_details.user.last_name}`
                    : apt.doctor_details?.full_name || 'Doctor');

                return (
                  <tr key={apt.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--admin-heading-color)' }}>
                        {apt.appointment_id || `#${apt.id}`}
                      </span>
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">{patName}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          ID: {apt.patient_id_code || apt.patient_details?.patient_id || 'Registered Patient'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>
                          {docName}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          {apt.doctor_details?.specialization || apt.doctor_department || apt.doctor_specialization || 'Clinical'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                        {apt.appointment_time}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--admin-text-muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={apt.reason_for_visit}
                      >
                        {apt.reason_for_visit || 'General Consultation'}
                      </span>
                    </td>
                    <td>{getStatusBadge(apt.status, apt.is_checked_in)}</td>
                    <td>
                      {apt.is_checked_in ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.8rem', fontWeight: 500 }}>
                          <UserCheck size={14} />
                          <span>
                            Arrived {apt.check_in_time ? new Date(apt.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-dim)' }}>
                          Awaiting Arrival
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Check-in Quick Button */}
                        {canCheckIn && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            title="Check In Patient"
                            disabled={checkingInId === apt.id}
                            onClick={() => handleCheckIn(apt.id)}
                          >
                            {checkingInId === apt.id ? (
                              <Loader2 size={13} className="spin-animation" />
                            ) : (
                              <UserCheck size={13} />
                            )}
                            <span>Check In</span>
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          title="View Appointment Details"
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
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
          MODAL: APPOINTMENT DETAILS
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isDetailsModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => setIsDetailsModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  className="admin-stat-icon-box"
                  style={{
                    background: 'rgba(14, 165, 233, 0.15)',
                    color: '#0ea5e9',
                    borderColor: 'rgba(14, 165, 233, 0.3)',
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    Appointment {selectedAppointment?.appointment_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Patient front-desk scheduling and intake records
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {selectedAppointment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.15rem',
                      borderRadius: 'var(--admin-radius-md)',
                      background: 'var(--admin-surface-secondary)',
                      border: '1px solid var(--admin-border-subtle)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                        Current Status
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(selectedAppointment.status, selectedAppointment.is_checked_in)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'block', textAlign: 'right' }}>
                        Check-in Status
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedAppointment.is_checked_in ? '#10b981' : 'var(--admin-text-dim)' }}>
                        {selectedAppointment.is_checked_in ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </div>
                  </div>

                  {/* Grid of Key Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="admin-glass-card" style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Patient Info
                      </span>
                      <div style={{ marginTop: '0.35rem', fontWeight: 600, color: 'var(--admin-heading-color)' }}>
                        {selectedAppointment.patient_name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-dim)' }}>
                        Identifier: {selectedAppointment.patient_id_code || `PAT-${selectedAppointment.patient}`}
                      </div>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Physician Assigned
                      </span>
                      <div style={{ marginTop: '0.35rem', fontWeight: 600, color: 'var(--admin-heading-color)' }}>
                        {selectedAppointment.doctor_name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-dim)' }}>
                        Department: {selectedAppointment.doctor_department || 'General Medicine'}
                      </div>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Appointment Date & Time
                      </span>
                      <div style={{ marginTop: '0.35rem', fontWeight: 600, color: 'var(--admin-heading-color)' }}>
                        {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}
                      </div>
                    </div>

                    <div className="admin-glass-card" style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                        Consultation Fee
                      </span>
                      <div style={{ marginTop: '0.35rem', fontWeight: 600, color: '#10b981' }}>
                        ₹{selectedAppointment.consultation_fee || '500.00'}
                      </div>
                    </div>
                  </div>

                  {/* Reason for Visit */}
                  <div className="admin-glass-card" style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                      Primary Reason for Visit
                    </span>
                    <p style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: 'var(--admin-text-main)', lineHeight: 1.5 }}>
                      {selectedAppointment.reason_for_visit || 'Routine health evaluation.'}
                    </p>
                  </div>

                  {/* Cancellation Reason if cancelled */}
                  {selectedAppointment.cancellation_reason && (
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>
                        Cancellation Reason
                      </span>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.88rem', color: 'var(--admin-text-main)' }}>
                        {selectedAppointment.cancellation_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </button>
              {selectedAppointment && !selectedAppointment.is_checked_in && selectedAppointment.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    handleCheckIn(selectedAppointment.id);
                    setIsDetailsModalOpen(false);
                  }}
                >
                  <UserCheck size={16} />
                  <span>Check In Patient</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default ReceptionistOverviewPage;
