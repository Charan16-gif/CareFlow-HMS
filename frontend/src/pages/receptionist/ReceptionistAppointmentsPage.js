import React, { useState, useEffect, useMemo, useCallback } from 'react';
import receptionistService from '../../services/receptionistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Calendar,
  Clock,
  Search,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Check,
  CalendarCheck,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const formatSlotDisplay = (t) => {
  if (!t) return '';
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return t;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${parts[1]} ${ampm}`;
};

const ReceptionistAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Filtering
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'previous' | 'completed' | 'cancelled' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Doctors & Patients for booking/rescheduling
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  // Booking form state
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Cancel form state
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Fetch appointments list
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await receptionistService.getAppointments();
      const list = Array.isArray(data) ? data : (data.results || []);
      setAppointments(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load appointments from hospital database.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch doctors and patients for modals
  const fetchLookups = useCallback(async () => {
    try {
      const [docsData, ptsData] = await Promise.all([
        receptionistService.getDoctors({ page_size: 100 }),
        receptionistService.getPatients({ page_size: 100 }),
      ]);
      setDoctors(Array.isArray(docsData) ? docsData : (docsData.results || []));
      setPatients(Array.isArray(ptsData) ? ptsData : (ptsData.results || []));
    } catch (err) {
      console.error('Error fetching lookups:', err);
    }
  }, []);

  useEffect(() => {
    document.title = 'Appointments — CareFlow HMS Receptionist';
    fetchAppointments();
    fetchLookups();
  }, [fetchAppointments, fetchLookups]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isBookModalOpen || isRescheduleModalOpen || isCancelModalOpen || isDetailsModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBookModalOpen, isRescheduleModalOpen, isCancelModalOpen, isDetailsModalOpen]);

  // Exclude past/completed time slots for today
  const filterCompletedSlots = useCallback((slotList, selectedDate) => {
    if (!Array.isArray(slotList) || !selectedDate) return slotList || [];
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    if (selectedDate < today) return [];
    if (selectedDate === today) {
      const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      return slotList.filter((s) => {
        const slotTime = s.length === 5 ? `${s}:00` : s;
        return slotTime > curTime;
      });
    }
    return slotList;
  }, []);

  // Load slots when Doctor + Date changes in Book modal
  useEffect(() => {
    if (bookingDoctorId && bookingDate) {
      let isMounted = true;
      setLoadingSlots(true);
      setBookingSlot('');
      receptionistService.getAvailableSlots(bookingDoctorId, bookingDate)
        .then((res) => {
          if (isMounted) {
            setAvailableSlots(filterCompletedSlots(res?.available_slots || [], bookingDate));
          }
        })
        .catch(() => {
          if (isMounted) setAvailableSlots([]);
        })
        .finally(() => {
          if (isMounted) setLoadingSlots(false);
        });
      return () => { isMounted = false; };
    } else {
      setAvailableSlots([]);
      setBookingSlot('');
    }
  }, [bookingDoctorId, bookingDate, filterCompletedSlots]);

  // Load slots when Date changes in Reschedule modal
  useEffect(() => {
    if (selectedAppointment && rescheduleDate) {
      let isMounted = true;
      setLoadingRescheduleSlots(true);
      setRescheduleSlot('');
      const docId = selectedAppointment.doctor_details?.id || selectedAppointment.doctor;
      receptionistService.getAvailableSlots(docId, rescheduleDate)
        .then((res) => {
          if (isMounted) {
            setRescheduleSlots(filterCompletedSlots(res?.available_slots || [], rescheduleDate));
          }
        })
        .catch(() => {
          if (isMounted) setRescheduleSlots([]);
        })
        .finally(() => {
          if (isMounted) setLoadingRescheduleSlots(false);
        });
      return () => { isMounted = false; };
    } else {
      setRescheduleSlots([]);
      setRescheduleSlot('');
    }
  }, [selectedAppointment, rescheduleDate, filterCompletedSlots]);

  // Today ISO date (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filtered appointments by tab and search
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const appDate = app.appointment_date;
      const status = app.status;

      // Tab check
      if (activeTab === 'today') {
        if (appDate !== todayStr) return false;
      } else if (activeTab === 'upcoming') {
        if (appDate < todayStr || status === 'COMPLETED' || status === 'CANCELLED') return false;
      } else if (activeTab === 'previous') {
        if (appDate >= todayStr && status !== 'COMPLETED') return false;
      } else if (activeTab === 'completed') {
        if (status !== 'COMPLETED') return false;
      } else if (activeTab === 'cancelled') {
        if (status !== 'CANCELLED') return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patName = `${app.patient_details?.first_name || ''} ${app.patient_details?.last_name || ''}`.toLowerCase();
        const docName = `${app.doctor_details?.user?.first_name || ''} ${app.doctor_details?.user?.last_name || ''}`.toLowerCase();
        const reason = (app.reason || '').toLowerCase();
        const idStr = String(app.id || '');
        if (!patName.includes(q) && !docName.includes(q) && !reason.includes(q) && !idStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, activeTab, searchQuery, todayStr]);

  // Filtered patients for booking dropdown
  const filteredBookingPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 15);
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const phone = (p.phone_number || '').toLowerCase();
      const id = String(p.id);
      return fullName.includes(q) || phone.includes(q) || id.includes(q);
    }).slice(0, 20);
  }, [patients, patientSearch]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let previous = 0;
    let completed = 0;
    let cancelled = 0;

    appointments.forEach((a) => {
      if (a.appointment_date === todayStr) today++;
      if (a.appointment_date >= todayStr && a.status !== 'COMPLETED' && a.status !== 'CANCELLED') upcoming++;
      if (a.appointment_date < todayStr || a.status === 'COMPLETED') previous++;
      if (a.status === 'COMPLETED') completed++;
      if (a.status === 'CANCELLED') cancelled++;
    });

    return {
      all: appointments.length,
      today,
      upcoming,
      previous,
      completed,
      cancelled,
    };
  }, [appointments, todayStr]);

  // Open Book Modal
  const handleOpenBookModal = () => {
    setBookingPatientId('');
    setBookingDoctorId('');
    setBookingDate(todayStr);
    setBookingSlot('');
    setBookingReason('');
    setPatientSearch('');
    setIsBookModalOpen(true);
  };

  // Submit Book Appointment
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setActionErrorMsg('');
    if (!bookingPatientId) {
      setActionErrorMsg('Please select a registered patient.');
      return;
    }
    if (!bookingDoctorId) {
      setActionErrorMsg('Please select a consulting doctor.');
      return;
    }
    if (!bookingDate) {
      setActionErrorMsg('Please choose an appointment date.');
      return;
    }
    if (!bookingSlot) {
      setActionErrorMsg('Please select an available appointment time slot.');
      return;
    }

    try {
      setBookingSubmitting(true);
      await receptionistService.bookAppointment({
        patient: bookingPatientId,
        doctor: bookingDoctorId,
        appointment_date: bookingDate,
        appointment_time: bookingSlot,
        reason_for_visit: bookingReason.trim() || 'General Consultation',
        reason: bookingReason.trim() || 'General Consultation',
      });
      setIsBookModalOpen(false);
      toast.success('Appointment booked successfully!', 'Appointment Booked');
      fetchAppointments();
    } catch (err) {
      const data = err?.response?.data;
      let msg = data?.detail || data?.error || data?.non_field_errors?.[0];
      if (!msg && data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          msg = `${firstKey.replace(/_/g, ' ')}: ${data[firstKey][0]}`;
        } else if (firstKey && typeof data[firstKey] === 'string') {
          msg = `${firstKey.replace(/_/g, ' ')}: ${data[firstKey]}`;
        }
      }
      toast.error(msg || 'Failed to book appointment. Please verify availability.', 'Booking Error');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenRescheduleModal = (app) => {
    setSelectedAppointment(app);
    setRescheduleDate(app.appointment_date || todayStr);
    setRescheduleSlot('');
    setIsRescheduleModalOpen(true);
  };

  // Submit Reschedule Appointment
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleSlot) {
      toast.warning('Please pick a date and select an available time slot.', 'Validation Warning');
      return;
    }

    try {
      setRescheduleSubmitting(true);
      await receptionistService.rescheduleAppointment(selectedAppointment.id, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleSlot,
      });
      setIsRescheduleModalOpen(false);
      toast.success('Appointment rescheduled successfully.', 'Appointment Rescheduled');
      fetchAppointments();
    } catch (err) {
      const data = err?.response?.data;
      let msg = data?.detail || data?.error || data?.non_field_errors?.[0];
      if (!msg && data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          msg = `${firstKey.replace(/_/g, ' ')}: ${data[firstKey][0]}`;
        } else if (firstKey && typeof data[firstKey] === 'string') {
          msg = `${firstKey.replace(/_/g, ' ')}: ${data[firstKey]}`;
        }
      }
      toast.error(msg || 'Failed to reschedule appointment. The slot may already be booked.', 'Reschedule Error');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (app) => {
    setSelectedAppointment(app);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  // Submit Cancel Appointment
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setCancelSubmitting(true);
      await receptionistService.cancelAppointment(selectedAppointment.id, cancellationReason);
      setIsCancelModalOpen(false);
      toast.success('Appointment has been cancelled successfully.', 'Appointment Cancelled');
      fetchAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to cancel appointment.';
      const errStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      toast.error(errStr, 'Cancellation Error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Quick Check-in action from table
  const handleCheckIn = async (appId) => {
    try {
      await receptionistService.checkInPatient(appId);
      toast.success('Patient marked as arrived and placed in doctor consultation queue.', 'Check-in Confirmed');
      fetchAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Unable to check in patient.';
      const errStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      toast.error(errStr, 'Check-in Error');
    }
  };

  // Open Details Modal
  const handleOpenDetailsModal = (app) => {
    setSelectedAppointment(app);
    setIsDetailsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="dash-badge badge-success">Confirmed</span>;
      case 'SCHEDULED':
        return <span className="dash-badge badge-warning">Scheduled</span>;
      case 'COMPLETED':
      case 'CHECKED_OUT':
        return <span className="dash-badge badge-info">Checked Out</span>;
      case 'CANCELLED':
        return <span className="dash-badge badge-danger">Cancelled</span>;
      default:
        return <span className="dash-badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="receptionist-page">
      {/* Page Title & Booking Action */}
      <div className="dash-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dash-title" style={{ margin: 0 }}>Appointment Management</h1>
          <p className="dash-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Book, reschedule, view, and track patient appointments across all hospital departments.
          </p>
        </div>
        <button
          className="dash-btn dash-btn-primary"
          onClick={handleOpenBookModal}
          id="receptionist-book-appointment-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          <span>Book Appointment</span>
        </button>
      </div>


      {/* Filter Tabs & Search Bar */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              className={`dash-btn ${activeTab === 'today' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('today')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Today ({tabCounts.today})
            </button>
            <button
              className={`dash-btn ${activeTab === 'upcoming' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('upcoming')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Upcoming ({tabCounts.upcoming})
            </button>
            <button
              className={`dash-btn ${activeTab === 'previous' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('previous')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Previous ({tabCounts.previous})
            </button>
            <button
              className={`dash-btn ${activeTab === 'completed' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('completed')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Completed ({tabCounts.completed})
            </button>
            <button
              className={`dash-btn ${activeTab === 'cancelled' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('cancelled')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              Cancelled ({tabCounts.cancelled})
            </button>
            <button
              className={`dash-btn ${activeTab === 'all' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('all')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            >
              All ({tabCounts.all})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              className="dash-input"
              placeholder="Search by patient, doctor, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>
            <Loader2 size={32} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <p>Loading appointments from database...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
            <button className="dash-btn dash-btn-secondary" onClick={fetchAppointments}>
              Retry Connection
            </button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', opacity: 0.7 }}>
            <Calendar size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No Appointments Found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {searchQuery ? 'No appointments match your search criteria.' : `No appointments in the "${activeTab}" view.`}
            </p>
          </div>
        ) : (
          <div className="dash-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Appt ID</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Patient</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Doctor</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Date & Time</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Arrival / Check-in</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((app) => {
                  const patName =
                    app.patient_name ||
                    (app.patient_details
                      ? `${app.patient_details.first_name} ${app.patient_details.last_name}`
                      : 'Patient');
                  const docName =
                    app.doctor_name ||
                    (app.doctor_details?.user
                      ? `Dr. ${app.doctor_details.user.first_name} ${app.doctor_details.user.last_name}`
                      : app.doctor_details?.full_name || 'Doctor');
                  const canCheckIn = (app.status === 'SCHEDULED' || app.status === 'CONFIRMED') && !app.is_checked_in;
                  const canReschedule = app.status === 'SCHEDULED' || app.status === 'CONFIRMED';
                  const canCancel = app.status !== 'CANCELLED' && app.status !== 'COMPLETED';

                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{app.appointment_id || `#${app.id}`}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{patName}</div>
                        {(app.patient_id_code || app.patient_details?.patient_id || app.patient_details?.phone_number) && (
                          <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
                            {app.patient_id_code || app.patient_details?.patient_id}
                            {(app.patient_id_code || app.patient_details?.patient_id) && app.patient_details?.phone_number && ' • '}
                            {app.patient_details?.phone_number}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>{docName}</div>
                        {app.doctor_details?.specialization && (
                          <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>{app.doctor_details.specialization}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
                          <Calendar size={13} style={{ opacity: 0.7 }} />
                          <span>{app.appointment_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', opacity: 0.7 }}>
                          <Clock size={13} />
                          <span>{app.appointment_time}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>{getStatusBadge(app.status)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {app.status === 'COMPLETED' || app.status === 'CHECKED_OUT' || app.visit_status === 'Checked Out' ? (
                          <span className="dash-badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={12} />
                            <span>Checked Out</span>
                          </span>
                        ) : app.is_checked_in ? (
                          <span className="dash-badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={12} />
                            <span>Checked In</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Not arrived</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {canCheckIn && (
                            <button
                              className="dash-btn dash-btn-success"
                              onClick={() => handleCheckIn(app.id)}
                              title="Check-in Patient"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                            >
                              Check-In
                            </button>
                          )}
                          <button
                            className="dash-btn dash-btn-secondary"
                            onClick={() => handleOpenDetailsModal(app)}
                            title="View Details"
                            style={{ padding: '0.35rem 0.55rem' }}
                          >
                            <Eye size={15} />
                          </button>
                          {canReschedule && (
                            <button
                              className="dash-btn dash-btn-secondary"
                              onClick={() => handleOpenRescheduleModal(app)}
                              title="Reschedule Appointment"
                              style={{ padding: '0.35rem 0.55rem' }}
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              className="dash-btn dash-btn-danger"
                              onClick={() => handleOpenCancelModal(app)}
                              title="Cancel Appointment"
                              style={{ padding: '0.35rem 0.55rem' }}
                            >
                              <Ban size={15} />
                            </button>
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
      </div>

      {/* ─── MODAL: BOOK APPOINTMENT ─── */}
      {isBookModalOpen && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !bookingSubmitting && setIsBookModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CalendarCheck size={20} style={{ color: '#0ea5e9' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Book New Appointment</h3>
                </div>
                <button className="dash-btn-icon" onClick={() => !bookingSubmitting && setIsBookModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                  {actionErrorMsg && (
                    <div className="dash-alert dash-alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {actionErrorMsg}
                    </div>
                  )}

                  {/* Patient Selection with Quick Filter */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Select Patient <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="dash-input"
                      placeholder="Search patient name, phone, or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}
                    />
                    <select
                      className="dash-input"
                      value={bookingPatientId}
                      onChange={(e) => setBookingPatientId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Patient --</option>
                      {filteredBookingPatients.map((p) => {
                        const name = p.full_name || `${p.first_name} ${p.last_name}`.trim();
                        const identifier = p.patient_id ? `${p.patient_id} • ` : '';
                        const phone = p.phone_number || 'No phone';
                        return (
                          <option key={p.id} value={p.id}>
                            {name} ({identifier}{phone})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Doctor Selection */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Consulting Doctor <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="dash-input"
                      value={bookingDoctorId}
                      onChange={(e) => setBookingDoctorId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Doctor --</option>
                      {doctors.map((d) => {
                        const doctorName = d.full_name
                          ? (d.full_name.startsWith('Dr.') ? d.full_name : `Dr. ${d.full_name}`)
                          : d.first_name
                          ? `Dr. ${d.first_name} ${d.last_name || ''}`.trim()
                          : 'Doctor';
                        return (
                          <option key={d.id} value={d.id}>
                            {doctorName} - {d.specialization || d.department || 'General Medicine'} (Fee: ₹{d.consultation_fee || '0'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Date Selection */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Appointment Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="dash-input"
                      value={bookingDate}
                      min={todayStr}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Available Slot Picker */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Available Time Slot <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {!bookingDoctorId || !bookingDate ? (
                      <div style={{ fontSize: '0.85rem', opacity: 0.6, fontStyle: 'italic' }}>
                        Select a doctor and appointment date to inspect real-time slot availability.
                      </div>
                    ) : loadingSlots ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7, fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Checking doctor calendar & slot availability...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="dash-alert dash-alert-warning" style={{ fontSize: '0.85rem' }}>
                        No available appointment slots. Please choose another date or doctor.
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', padding: '0.25rem' }}>
                          {availableSlots.map((slot) => {
                            const isSelected = bookingSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setBookingSlot(slot)}
                                className={`dash-btn ${isSelected ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
                                style={{
                                  padding: '0.45rem 0.25rem',
                                  fontSize: '0.82rem',
                                  textAlign: 'center',
                                  borderRadius: '6px',
                                  fontWeight: isSelected ? 600 : 400,
                                  border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.12)',
                                }}
                              >
                                {formatSlotDisplay(slot)}
                              </button>
                            );
                          })}
                        </div>
                        {bookingSlot && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: 500 }}>
                            Selected Time: {formatSlotDisplay(bookingSlot)} ({bookingSlot})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reason for Visit */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Reason for Visit / Chief Complaint
                    </label>
                    <textarea
                      className="dash-input"
                      rows={2}
                      placeholder="e.g., General checkup, Fever & cough, Follow-up consultation..."
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="dash-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-secondary"
                    onClick={() => setIsBookModalOpen(false)}
                    disabled={bookingSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dash-btn dash-btn-primary"
                    disabled={bookingSubmitting || !bookingSlot}
                  >
                    {bookingSubmitting ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Confirming Booking...</span>
                      </span>
                    ) : (
                      'Confirm Appointment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MODAL: RESCHEDULE APPOINTMENT ─── */}
      {isRescheduleModalOpen && selectedAppointment && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !rescheduleSubmitting && setIsRescheduleModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <RotateCcw size={20} style={{ color: '#0ea5e9' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Reschedule Appointment ({selectedAppointment.appointment_id || `#${selectedAppointment.id}`})</h3>
                </div>
                <button className="dash-btn-icon" onClick={() => !rescheduleSubmitting && setIsRescheduleModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                  <div className="dash-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div><strong>Patient:</strong> {selectedAppointment.patient_details?.first_name} {selectedAppointment.patient_details?.last_name}</div>
                    <div><strong>Doctor:</strong> Dr. {selectedAppointment.doctor_details?.user?.first_name} {selectedAppointment.doctor_details?.user?.last_name}</div>
                    <div><strong>Current Schedule:</strong> {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}</div>
                  </div>

                  {actionErrorMsg && (
                    <div className="dash-alert dash-alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {actionErrorMsg}
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Select New Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="dash-input"
                      value={rescheduleDate}
                      min={todayStr}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Select New Time Slot <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {loadingRescheduleSlots ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7, fontSize: '0.85rem' }}>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Loading available slots...</span>
                      </div>
                    ) : rescheduleSlots.length === 0 ? (
                      <div className="dash-alert dash-alert-warning" style={{ fontSize: '0.85rem' }}>
                        No available appointment slots. Please choose another date or doctor.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', padding: '0.25rem' }}>
                        {rescheduleSlots.map((slot) => {
                          const isSelected = rescheduleSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setRescheduleSlot(slot)}
                              className={`dash-btn ${isSelected ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
                              style={{
                                padding: '0.45rem 0.25rem',
                                fontSize: '0.82rem',
                                textAlign: 'center',
                                borderRadius: '6px',
                                fontWeight: isSelected ? 600 : 400,
                                border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.12)',
                              }}
                            >
                              {formatSlotDisplay(slot)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {rescheduleSlot && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: 500 }}>
                        Selected Time: {formatSlotDisplay(rescheduleSlot)} ({rescheduleSlot})
                      </div>
                    )}
                  </div>
                </div>

                <div className="dash-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-secondary"
                    onClick={() => setIsRescheduleModalOpen(false)}
                    disabled={rescheduleSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dash-btn dash-btn-primary"
                    disabled={rescheduleSubmitting || !rescheduleSlot}
                  >
                    {rescheduleSubmitting ? 'Rescheduling...' : 'Save New Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MODAL: CANCEL APPOINTMENT ─── */}
      {isCancelModalOpen && selectedAppointment && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !cancelSubmitting && setIsCancelModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Ban size={20} style={{ color: '#ef4444' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Cancel Appointment ({selectedAppointment.appointment_id || `#${selectedAppointment.id}`})</h3>
                </div>
                <button className="dash-btn-icon" onClick={() => !cancelSubmitting && setIsCancelModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCancelSubmit} style={{ padding: '1.5rem' }}>
                <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Are you sure you want to cancel the appointment for{' '}
                  <strong>
                    {selectedAppointment.patient_name || `${selectedAppointment.patient_details?.first_name || ''} ${selectedAppointment.patient_details?.last_name || ''}`.trim() || 'Patient'}
                  </strong>{' '}
                  on <strong>{selectedAppointment.appointment_date}</strong> at{' '}
                  <strong>{selectedAppointment.appointment_time}</strong>?
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Cancellation Reason (Optional)
                  </label>
                  <textarea
                    className="dash-input"
                    rows={3}
                    placeholder="e.g., Patient requested cancellation, Scheduling conflict..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-secondary"
                    onClick={() => setIsCancelModalOpen(false)}
                    disabled={cancelSubmitting}
                  >
                    Keep Appointment
                  </button>
                  <button
                    type="submit"
                    className="dash-btn dash-btn-danger"
                    disabled={cancelSubmitting}
                  >
                    {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MODAL: APPOINTMENT DETAILS ─── */}
      {isDetailsModalOpen && selectedAppointment && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => setIsDetailsModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Calendar size={20} style={{ color: '#0ea5e9' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Appointment Details ({selectedAppointment.appointment_id || `#${selectedAppointment.id}`})</h3>
                </div>
                <button className="dash-btn-icon" onClick={() => setIsDetailsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="dash-card" style={{ padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Patient Information</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {selectedAppointment.patient_name || `${selectedAppointment.patient_details?.first_name || ''} ${selectedAppointment.patient_details?.last_name || ''}`.trim() || 'Patient'}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      ID: {selectedAppointment.patient_id_code || selectedAppointment.patient_details?.patient_id || 'Registered Patient'}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Phone: {selectedAppointment.patient_details?.phone_number || 'N/A'}</div>
                  </div>

                  <div className="dash-card" style={{ padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Consulting Doctor</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {selectedAppointment.doctor_name || (selectedAppointment.doctor_details?.user?.first_name ? `Dr. ${selectedAppointment.doctor_details.user.first_name} ${selectedAppointment.doctor_details.user.last_name}` : 'Doctor')}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {selectedAppointment.doctor_details?.specialization || 'Consultant'}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Department: {selectedAppointment.doctor_details?.department || 'General'}
                    </div>
                  </div>
                </div>

                <div className="dash-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ opacity: 0.6 }}>Date:</span>{' '}
                      <strong>{selectedAppointment.appointment_date}</strong>
                    </div>
                    <div>
                      <span style={{ opacity: 0.6 }}>Time:</span>{' '}
                      <strong>{selectedAppointment.appointment_time}</strong>
                    </div>
                    <div>
                      <span style={{ opacity: 0.6 }}>Status:</span>{' '}
                      {getStatusBadge(selectedAppointment.status)}
                    </div>
                    <div>
                      <span style={{ opacity: 0.6 }}>Check-In:</span>{' '}
                      {selectedAppointment.is_checked_in ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Arrived</span>
                      ) : (
                        <span style={{ opacity: 0.7 }}>Pending</span>
                      )}
                    </div>
                  </div>
                  {selectedAppointment.check_in_time && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.75 }}>
                      Checked-in timestamp: {new Date(selectedAppointment.check_in_time).toLocaleString()}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 600, marginBottom: '0.25rem' }}>Reason for Visit:</div>
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {selectedAppointment.reason || 'No specific complaint recorded.'}
                  </div>
                </div>

                {selectedAppointment.cancellation_reason && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.25rem' }}>Cancellation Reason:</div>
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', fontSize: '0.85rem', color: '#fca5a5' }}>
                      {selectedAppointment.cancellation_reason}
                    </div>
                  </div>
                )}
              </div>

              <div className="dash-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                {(!selectedAppointment.is_checked_in && (selectedAppointment.status === 'SCHEDULED' || selectedAppointment.status === 'CONFIRMED')) && (
                  <button
                    className="dash-btn dash-btn-success"
                    onClick={() => {
                      handleCheckIn(selectedAppointment.id);
                      setIsDetailsModalOpen(false);
                    }}
                  >
                    Check-In Patient
                  </button>
                )}
                <button className="dash-btn dash-btn-secondary" onClick={() => setIsDetailsModalOpen(false)}>
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

export default ReceptionistAppointmentsPage;
