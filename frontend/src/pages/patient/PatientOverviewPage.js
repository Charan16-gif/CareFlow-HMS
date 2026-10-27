import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import {
  Calendar,
  FileText,
  Pill,
  AlertCircle,
  Loader2,
  ArrowRight,
  Plus,
  Info,
} from 'lucide-react';

const PatientOverviewPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await patientService.getOverviewData();
      setData(res);
    } catch (err) {
      let msg = 'Failed to load your healthcare records. Please check connectivity and try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Patient Overview — CareFlow HMS';
    fetchOverview();
  }, []);

  const nextAppointment = data?.appointments?.next || null;
  const otherUpcoming = data?.appointments?.upcoming?.slice(1) || [];
  const currentPrescription = data?.prescriptions?.current || null;

  const summaryCards = [
    {
      id: 'appointments',
      title: 'Upcoming Appointments',
      count: data?.counts?.upcomingAppointments ?? 0,
      icon: Calendar,
      color: 'teal',
      path: '/patient/appointments',
      description: nextAppointment
        ? `Next: ${nextAppointment.appointment_date} at ${nextAppointment.appointment_time?.slice(0, 5)}`
        : 'No upcoming visits scheduled',
    },
    {
      id: 'prescriptions',
      title: 'Active Prescriptions',
      count: data?.counts?.activePrescriptions ?? 0,
      icon: FileText,
      color: 'cyan',
      path: '/patient/prescriptions',
      description: currentPrescription
        ? `Prescribed by ${currentPrescription.doctor_name || 'Doctor'}`
        : 'No active prescriptions',
    },
    {
      id: 'medicines',
      title: 'Prescribed Medicines',
      count: data?.counts?.prescribedMedicines ?? 0,
      icon: Pill,
      color: 'navy',
      path: '/patient/medicines',
      description: 'Medicines available to order from pharmacy',
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
            Scheduled (Pending Confirmation)
          </span>
        );
      case 'IN_PROGRESS':
        return <span className="admin-badge admin-badge-cyan">In Progress</span>;
      case 'COMPLETED':
        return <span className="admin-badge admin-badge-success">Completed</span>;
      case 'CANCELLED':
        return <span className="admin-badge admin-badge-danger">Cancelled</span>;
      default:
        return <span className="admin-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Patient Overview</h2>
          <p className="admin-page-subtitle">
            Your upcoming clinical consultations, active prescriptions, and medicine orders
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => navigate('/patient/appointments?action=book')}
        >
          <Plus size={16} />
          <span>Book an Appointment</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving your clinical health records and appointments...</p>
        </div>
      )}

      {/* Error State with Retry */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Healthcare Overview</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchOverview}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Real Patient Data */}
      {!loading && !error && data && (
        <>
          {/* Quick Navigation / Metrics Cards Grid */}
          <section className="admin-cards-grid" aria-label="Patient Quick Navigation Cards">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="admin-summary-card"
                  onClick={() => navigate(card.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(card.path);
                    }
                  }}
                  aria-label={`${card.title}: ${card.count}. Click to navigate.`}
                >
                  <div className="admin-card-top">
                    <span className="admin-card-title">{card.title}</span>
                    <div className={`admin-card-icon-box admin-icon-${card.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="admin-card-count">{card.count}</div>
                  <div className="admin-card-bottom">
                    <span className="admin-card-desc">{card.description}</span>
                    <span className="admin-card-link">
                      <span>View</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Middle Two-Column Grid: Next Appointment & Current Prescription */}
          <div className="admin-dashboard-two-col">
            {/* ─── NEXT APPOINTMENT PANEL ──────────────────────────────── */}
            <section
              className="admin-dashboard-panel"
              aria-label="Upcoming Consultation Details"
            >
              <div className="admin-panel-header">
                <div>
                  <h3 className="admin-panel-title">Current / Next Appointment</h3>
                  <p className="admin-panel-desc">
                    Your next confirmed or pending consultation slot with the hospital care team
                  </p>
                </div>
                <div className="admin-panel-badge">
                  <Calendar size={14} />
                  <span>Scheduled Care</span>
                </div>
              </div>

              <div className="admin-panel-body">
                {nextAppointment ? (
                  <div
                    style={{
                      background: 'var(--admin-surface-secondary)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 'var(--admin-radius-md)',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--primary-cyan, #06b6d4)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Appointment #{nextAppointment.appointment_id}
                        </span>
                        <h4
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--admin-heading-color)',
                            margin: '0.25rem 0',
                          }}
                        >
                          {nextAppointment.doctor_name || 'Doctor'}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                          {nextAppointment.doctor_specialization ||
                            nextAppointment.doctor_department ||
                            'General Consultation'}
                        </span>
                      </div>
                      <div>{getStatusBadge(nextAppointment.status)}</div>
                    </div>

                    <div
                      className="admin-details-grid"
                      style={{
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        background: 'transparent',
                        padding: 0,
                      }}
                    >
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Date</span>
                        <span className="admin-detail-value font-semibold">
                          {nextAppointment.appointment_date}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Time Slot</span>
                        <span className="admin-detail-value font-semibold admin-font-mono">
                          {nextAppointment.appointment_time?.slice(0, 5) || '—'}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Consultation Fee</span>
                        <span className="admin-detail-value font-semibold">
                          ₹{nextAppointment.consultation_fee || '500.00'}
                        </span>
                      </div>
                    </div>

                    {nextAppointment.reason_for_visit && (
                      <div
                        style={{
                          background: 'var(--admin-card-bg)',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--admin-radius-sm)',
                          border: '1px solid var(--admin-border-subtle)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--admin-text-muted)',
                            display: 'block',
                            marginBottom: '0.2rem',
                          }}
                        >
                          Reason for Consultation
                        </span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>
                          {nextAppointment.reason_for_visit}
                        </p>
                      </div>
                    )}

                    {/* Notice if status is pending confirmation */}
                    {nextAppointment.status === 'SCHEDULED' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: 'var(--admin-radius-sm)',
                          fontSize: '0.825rem',
                          color: '#f59e0b',
                        }}
                      >
                        <Info size={16} style={{ flexShrink: 0 }} />
                        <span>
                          This appointment is awaiting front-desk receptionist verification. Your consultation slot is held.
                        </span>
                      </div>
                    )}

                    {otherUpcoming.length > 0 && (
                      <p
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--admin-text-muted)',
                          margin: '0.25rem 0 0',
                        }}
                      >
                        + You have <strong>{otherUpcoming.length}</strong> additional future appointment(s) scheduled.
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <Link
                        to="/patient/appointments"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                      >
                        <span>View All Appointments</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="admin-graph-empty-state">
                    <div className="admin-empty-icon-box">
                      <Calendar size={32} />
                    </div>
                    <h4>No Upcoming Appointments</h4>
                    <p>
                      You have no upcoming appointments currently scheduled with our clinical specialists.
                    </p>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      onClick={() => navigate('/patient/appointments?action=book')}
                    >
                      <Plus size={14} />
                      <span>Book Your Appointment</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ─── CURRENT PRESCRIPTION PANEL ──────────────────────────── */}
            <section
              className="admin-dashboard-panel"
              aria-label="Active Prescription Summary"
            >
              <div className="admin-panel-header">
                <div>
                  <h3 className="admin-panel-title">Current Active Prescription</h3>
                  <p className="admin-panel-desc">
                    Medications and timing prescribed by your attending doctor
                  </p>
                </div>
                <div className="admin-panel-badge">
                  <FileText size={14} />
                  <span>Doctor Prescribed</span>
                </div>
              </div>

              <div className="admin-panel-body">
                {currentPrescription ? (
                  <div
                    style={{
                      background: 'var(--admin-surface-secondary)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 'var(--admin-radius-md)',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--primary-teal, #14b8a6)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Prescription #{currentPrescription.prescription_id}
                        </span>
                        <h4
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--admin-heading-color)',
                            margin: '0.25rem 0',
                          }}
                        >
                          {currentPrescription.doctor_name
                            ? (currentPrescription.doctor_name.startsWith('Dr.') ? currentPrescription.doctor_name : `Dr. ${currentPrescription.doctor_name}`)
                            : 'Doctor'}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                          Prescribed on {currentPrescription.created_at?.slice(0, 10)}
                        </span>
                      </div>
                      <div>
                        <span className="admin-badge admin-badge-teal">
                          {currentPrescription.status}
                        </span>
                      </div>
                    </div>

                    {currentPrescription.diagnosis && (
                      <div
                        style={{
                          background: 'var(--admin-card-bg)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--admin-radius-sm)',
                          border: '1px solid var(--admin-border-subtle)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--admin-text-muted)',
                            display: 'block',
                            marginBottom: '0.2rem',
                          }}
                        >
                          Clinical Diagnosis
                        </span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>
                          {currentPrescription.diagnosis}
                        </p>
                      </div>
                    )}

                    {/* Prescribed Medicines Quick List */}
                    <div>
                      <span
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: 'var(--admin-text-muted)',
                          display: 'block',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Prescribed Medicines ({currentPrescription.items?.length || 0})
                      </span>

                      {currentPrescription.items && currentPrescription.items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {currentPrescription.items.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.65rem 0.85rem',
                                background: 'var(--admin-card-bg)',
                                borderRadius: 'var(--admin-radius-sm)',
                                border: '1px solid var(--admin-border-subtle)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Pill size={16} color="var(--primary-cyan, #06b6d4)" />
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>
                                    {item.medicine_name} {item.medicine_strength || ''}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                    Dosage: {item.dosage || '—'} • {item.frequency || 'As directed'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="admin-font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                  Qty: {item.quantity_prescribed}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-dim)' }}>
                          No specific line items recorded.
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.5rem',
                      }}
                    >
                      <Link
                        to="/patient/medicines"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                      >
                        <Pill size={14} />
                        <span>Order Prescribed Medicines</span>
                      </Link>

                      <Link
                        to="/patient/prescriptions"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                      >
                        <span>Full Prescriptions</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="admin-graph-empty-state">
                    <div className="admin-empty-icon-box">
                      <FileText size={32} />
                    </div>
                    <h4>No Active Prescription</h4>
                    <p>
                      You currently have no active doctor prescriptions pending in the pharmacy dispensary.
                    </p>
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      onClick={() => navigate('/patient/prescriptions')}
                    >
                      <span>View Past Prescriptions</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientOverviewPage;
