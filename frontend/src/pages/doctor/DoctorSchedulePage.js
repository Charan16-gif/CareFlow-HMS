import React, { useState, useEffect, useMemo } from 'react';
import doctorService from '../../services/doctorService';
import {
  Clock,
  Calendar,
  Search,
  AlertCircle,
  Loader2,
  User,
  Info,
  CalendarDays,
} from 'lucide-react';

const DoctorSchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'upcoming' | 'today' | 'past'

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getSchedule();
      setSchedule(data);
    } catch (err) {
      let msg = 'Failed to load schedule from the clinical database.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'My Schedule — CareFlow HMS Doctor';
    fetchSchedule();
  }, []);

  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      // Filter tab
      if (filterType === 'upcoming' && !item.isUpcoming) return false;
      if (filterType === 'today' && !item.isToday) return false;
      if (filterType === 'past' && !item.isPast) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientMatch = (item.patient_name || '').toLowerCase().includes(q);
        const reasonMatch = (item.reason_for_visit || '').toLowerCase().includes(q);
        const idMatch = (item.appointment_id || '').toLowerCase().includes(q);
        const dateMatch = (item.appointment_date || '').toLowerCase().includes(q);
        return patientMatch || reasonMatch || idMatch || dateMatch;
      }
      return true;
    });
  }, [schedule, filterType, searchQuery]);

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

  const getTimelineBadge = (item) => {
    if (item.isToday) {
      return (
        <span
          className="admin-badge"
          style={{
            background: 'rgba(20, 184, 166, 0.15)',
            color: 'var(--primary-teal, #14b8a6)',
            border: '1px solid rgba(20, 184, 166, 0.35)',
            fontWeight: 700,
          }}
        >
          Today
        </span>
      );
    }
    if (item.isUpcoming) {
      return (
        <span
          className="admin-badge"
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          Upcoming
        </span>
      );
    }
    return (
      <span
        className="admin-badge"
        style={{
          background: 'rgba(107, 114, 128, 0.12)',
          color: '#9ca3af',
          border: '1px solid rgba(107, 114, 128, 0.25)',
        }}
      >
        Past
      </span>
    );
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">My Schedule</h2>
          <p className="admin-page-subtitle">
            Chronological timetable of your consultation appointments and clinic hours
          </p>
        </div>
      </div>

      {/* View-Only Clinical Guidance Policy Banner */}
      <div className="admin-info-banner">
        <div className="admin-info-banner-icon">
          <Info size={18} />
        </div>
        <div>
          <strong>View-Only Schedule:</strong> Your clinical timetable is populated in real-time from the hospital appointment system. Doctors can view all scheduled consultation slots. Schedule edits and patient booking are handled by hospital intake.
        </div>
      </div>

      {/* Table Filter Tabs and Search Bar */}
      <div className="admin-table-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        {/* Filter Tabs */}
        <div className="admin-modal-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button
            type="button"
            className={`admin-modal-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <span>All ({schedule.length})</span>
          </button>
          <button
            type="button"
            className={`admin-modal-tab ${filterType === 'today' ? 'active' : ''}`}
            onClick={() => setFilterType('today')}
          >
            <span>Today ({schedule.filter((s) => s.isToday).length})</span>
          </button>
          <button
            type="button"
            className={`admin-modal-tab ${filterType === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilterType('upcoming')}
          >
            <span>Upcoming ({schedule.filter((s) => s.isUpcoming).length})</span>
          </button>
          <button
            type="button"
            className={`admin-modal-tab ${filterType === 'past' ? 'active' : ''}`}
            onClick={() => setFilterType('past')}
          >
            <span>Past ({schedule.filter((s) => s.isPast).length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="admin-search-wrapper" style={{ marginLeft: 'auto' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient, reason, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading your clinical timetable...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Schedule</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={fetchSchedule}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSchedule.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <CalendarDays size={32} />
          </div>
          <h3>No Appointments Found</h3>
          <p>
            {searchQuery
              ? `No appointments match your search "${searchQuery}".`
              : filterType === 'today'
              ? 'You have no appointments scheduled for today.'
              : filterType === 'upcoming'
              ? 'You have no upcoming consultations scheduled in your calendar.'
              : 'There are currently no consultation appointments in your timetable.'}
          </p>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && filteredSchedule.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Doctor schedule timetable">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Date</th>
                <th scope="col">Patient</th>
                <th scope="col">Timeline</th>
                <th scope="col">Reason for Visit</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.map((apt) => (
                <tr
                  key={apt.id}
                  style={{
                    background: apt.isToday ? 'rgba(20, 184, 166, 0.04)' : undefined,
                  }}
                >
                  {/* Time */}
                  <td className="admin-font-mono admin-font-semibold" style={{ color: 'var(--primary-teal, #14b8a6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Clock size={14} className="admin-text-teal" />
                      <span>{apt.appointment_time ? apt.appointment_time.slice(0, 5) : '—'}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={14} className="admin-text-dim" />
                      <span className="admin-font-mono">{apt.appointment_date}</span>
                    </div>
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

                  {/* Timeline Badge */}
                  <td>{getTimelineBadge(apt)}</td>

                  {/* Reason for Visit */}
                  <td>
                    <span style={{ fontSize: '0.875rem' }}>
                      {apt.reason_for_visit || 'General Consultation'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>{getStatusBadge(apt.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedulePage;
