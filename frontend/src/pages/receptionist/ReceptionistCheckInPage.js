import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import receptionistService from '../../services/receptionistService';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Check,
  RotateCcw,
  Loader2,
  UserCheck,
  Calendar,
  Hourglass,
  Receipt,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistCheckInPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all_today'); // 'all_today' | 'waiting_room' | 'pending_arrival' | 'completed' | 'arrived'

  // Today ISO date (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const fetchTodayAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await receptionistService.getAppointments({ appointment_date: todayStr });
      const list = Array.isArray(data) ? data : (data.results || []);
      setAppointments(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch today appointments.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    document.title = 'Check-in & Waiting Room — CareFlow HMS';
    fetchTodayAppointments();
    const timer = setInterval(() => {
      fetchTodayAppointments();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchTodayAppointments]);

  // Handle Check-in
  const handleCheckIn = async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await receptionistService.checkInPatient(appointmentId);
      const successMessage = 'Patient marked as arrived and placed in doctor consultation queue.';
      toast.success(successMessage, 'Check-in Confirmed');
      fetchTodayAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to process check-in.';
      const errText = typeof msg === 'string' ? msg : JSON.stringify(msg);
      toast.error(errText, 'Check-in Error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Undo Check-in
  const handleUndoCheckIn = async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await receptionistService.undoCheckIn(appointmentId);
      const undoMsg = 'Patient check-in status reverted.';
      toast.info(undoMsg, 'Check-in Reverted');
      fetchTodayAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to undo check-in.';
      const errText = typeof msg === 'string' ? msg : JSON.stringify(msg);
      toast.error(errText, 'Revert Error');
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to determine if patient consultation has concluded
  const isAppointmentConsulted = (a) =>
    a.status === 'COMPLETED' ||
    a.status === 'CHECKED_OUT' ||
    Boolean(a.check_out_time) ||
    a.visit_status === 'Consulted' ||
    a.visit_status === 'Checked Out';

  // Waiting list: checked in and awaiting doctor (not consulted/completed/cancelled)
  const waitingList = useMemo(() => {
    return appointments.filter(
      (a) => a.is_checked_in && !isAppointmentConsulted(a) && a.status !== 'CANCELLED'
    );
  }, [appointments]);

  // Checked-in count
  const checkedInCount = useMemo(() => {
    return appointments.filter((a) => a.is_checked_in).length;
  }, [appointments]);

  // Pending arrival count
  const pendingArrivalCount = useMemo(() => {
    return appointments.filter(
      (a) => !a.is_checked_in && a.status !== 'CANCELLED' && !isAppointmentConsulted(a)
    ).length;
  }, [appointments]);

  // Completed / Consulted count
  const completedCount = useMemo(() => {
    return appointments.filter((a) => isAppointmentConsulted(a)).length;
  }, [appointments]);

  // Filtered appointments by search and tab
  const displayedAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (activeTab === 'waiting_room') {
        if (!app.is_checked_in || isAppointmentConsulted(app) || app.status === 'CANCELLED') return false;
      } else if (activeTab === 'pending_arrival') {
        if (app.is_checked_in || app.status === 'CANCELLED' || isAppointmentConsulted(app)) return false;
      } else if (activeTab === 'completed') {
        if (!isAppointmentConsulted(app)) return false;
      } else if (activeTab === 'arrived') {
        if (!app.is_checked_in) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patName = `${app.patient_details?.first_name || ''} ${app.patient_details?.last_name || ''}`.toLowerCase();
        const docName = `${app.doctor_details?.user?.first_name || ''} ${app.doctor_details?.user?.last_name || ''}`.toLowerCase();
        const idStr = String(app.id || '');
        if (!patName.includes(q) && !docName.includes(q) && !idStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, activeTab, searchQuery]);

  // Format elapsed wait time
  const getElapsedWaitTime = (checkInTimeStr) => {
    if (!checkInTimeStr) return 'Just now';
    const checkIn = new Date(checkInTimeStr);
    const now = new Date();
    const diffMs = now - checkIn;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  return (
    <div className="receptionist-page">
      {/* Page Header */}
      <div className="dash-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dash-title" style={{ margin: 0 }}>Check-in & Waiting Room</h1>
          <p className="dash-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Manage today&apos;s arriving patients, confirm attendance, and monitor the live consultation queue.
          </p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn-secondary"
          onClick={fetchTodayAppointments}
          title="Refresh patient queue"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RotateCcw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Overview Stat Cards (Clickable Filter Shortcuts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          className="dash-stat-card"
          onClick={() => setActiveTab('all_today')}
          style={{ padding: '1.25rem', cursor: 'pointer', border: activeTab === 'all_today' ? '1px solid #38bdf8' : undefined }}
          title="Click to view all appointments today"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Today&apos;s Total</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.25rem' }}>{appointments.length}</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Calendar size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Scheduled today</div>
        </div>

        <div
          className="dash-stat-card"
          onClick={() => setActiveTab('waiting_room')}
          style={{ padding: '1.25rem', cursor: 'pointer', border: activeTab === 'waiting_room' ? '1px solid #f59e0b' : undefined }}
          title="Click to view live waiting room queue"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Currently Waiting</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>{waitingList.length}</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Hourglass size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Checked in, awaiting doctor</div>
        </div>

        <div
          className="dash-stat-card"
          onClick={() => setActiveTab('pending_arrival')}
          style={{ padding: '1.25rem', cursor: 'pointer', border: activeTab === 'pending_arrival' ? '1px solid #c084fc' : undefined }}
          title="Click to view expected arrivals not yet checked in"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Awaiting Arrival</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.25rem' }}>{pendingArrivalCount}</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Expected at reception</div>
        </div>

        <div
          className="dash-stat-card"
          onClick={() => setActiveTab('completed')}
          style={{ padding: '1.25rem', cursor: 'pointer', border: activeTab === 'completed' ? '1px solid #10b981' : undefined }}
          title="Click to view completed visits"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Consulted / Done</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>{completedCount}</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Completed visits</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              className={`dash-btn ${activeTab === 'all_today' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('all_today')}
              style={{ fontSize: '0.85rem' }}
            >
              Today&apos;s Appointments ({appointments.length})
            </button>
            <button
              className={`dash-btn ${activeTab === 'waiting_room' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('waiting_room')}
              style={{ fontSize: '0.85rem' }}
            >
              Waiting Room ({waitingList.length})
            </button>
            <button
              className={`dash-btn ${activeTab === 'pending_arrival' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('pending_arrival')}
              style={{ fontSize: '0.85rem' }}
            >
              Awaiting Arrival ({pendingArrivalCount})
            </button>
            <button
              className={`dash-btn ${activeTab === 'completed' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('completed')}
              style={{ fontSize: '0.85rem' }}
            >
              Consulted / Done ({completedCount})
            </button>
            <button
              className={`dash-btn ${activeTab === 'arrived' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('arrived')}
              style={{ fontSize: '0.85rem' }}
            >
              All Arrived ({checkedInCount})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              className="dash-input"
              placeholder="Search patient, doctor, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>
            <Loader2 size={32} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <p>Loading today&apos;s queue...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
            <button className="dash-btn dash-btn-secondary" onClick={fetchTodayAppointments}>
              Retry
            </button>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', opacity: 0.7 }}>
            <UserCheck size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No Patients In This List</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {activeTab === 'waiting_room'
                ? 'No patients currently waiting in the consultation queue. (All arrived patients have been consulted or are in with the doctor).'
                : activeTab === 'completed'
                ? 'No completed appointments recorded yet today.'
                : activeTab === 'pending_arrival'
                ? 'No pending arrivals awaiting check-in.'
                : 'No appointments match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="dash-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Appt ID</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Patient Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Consulting Doctor</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Scheduled Time</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Arrival / Check-in</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Queue Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Reception Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedAppointments.map((app) => {
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
                  const isProcessing = processingId === app.id;
                  const isConsulted = isAppointmentConsulted(app);
                  const canCheckIn = !app.is_checked_in && app.status !== 'CANCELLED' && !isConsulted;

                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{app.appointment_id || `#${app.id}`}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{patName}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
                          {(app.patient_id_code || app.patient_details?.patient_id) ? `ID: ${app.patient_id_code || app.patient_details.patient_id}` : 'Registered Patient'}
                          {app.patient_details?.phone_number && ` • ${app.patient_details.phone_number}`}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{docName}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
                          {app.doctor_details?.specialization || 'Consultant'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                          <Clock size={13} style={{ opacity: 0.7 }} />
                          <span>{app.appointment_time}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isConsulted ? (
                          <span className="dash-badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={12} />
                            <span>Checked Out</span>
                          </span>
                        ) : app.is_checked_in ? (
                          <div>
                            <span className="dash-badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Check size={12} />
                              <span>Checked In</span>
                            </span>
                            {app.check_in_time && (
                              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                {getElapsedWaitTime(app.check_in_time)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', opacity: 0.55 }}>Not checked in</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isConsulted ? (
                          <span className="dash-badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={12} />
                            <span>Consultation Done</span>
                          </span>
                        ) : app.status === 'CANCELLED' ? (
                          <span className="dash-badge badge-danger">Cancelled</span>
                        ) : app.is_checked_in ? (
                          <span className="dash-badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Hourglass size={12} />
                            <span>In Waiting Room</span>
                          </span>
                        ) : (
                          <span className="dash-badge badge-neutral">Scheduled</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {canCheckIn ? (
                          <button
                            className="dash-btn dash-btn-success"
                            onClick={() => handleCheckIn(app.id)}
                            disabled={isProcessing}
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            {isProcessing ? (
                              <Loader2 size={14} className="spin-icon" />
                            ) : (
                              <Check size={14} />
                            )}
                            <span>Check-In</span>
                          </button>
                        ) : isConsulted ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                            <span className="dash-badge badge-success" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={12} />
                              <span>Checked Out</span>
                            </span>
                            <button
                              type="button"
                              className="dash-btn dash-btn-secondary"
                              onClick={() => navigate('/receptionist/payments')}
                              title="Go to billing to view or print official receipt"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Receipt size={13} style={{ color: '#10b981' }} />
                              <span>Billing & Receipt</span>
                            </button>
                          </div>
                        ) : app.is_checked_in ? (
                          <button
                            className="dash-btn dash-btn-secondary"
                            onClick={() => handleUndoCheckIn(app.id)}
                            disabled={isProcessing}
                            title="Revert check-in status"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', opacity: 0.8 }}
                          >
                            <RotateCcw size={13} />
                            <span>Undo</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.85rem', opacity: 0.4 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionistCheckInPage;
