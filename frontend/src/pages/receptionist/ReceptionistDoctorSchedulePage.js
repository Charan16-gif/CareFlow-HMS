import React, { useState, useEffect, useMemo, useCallback } from 'react';
import receptionistService from '../../services/receptionistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Stethoscope,
  Calendar,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Filter,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistDoctorSchedulePage = () => {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  // Selected Doctor for slot inspection
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Slot inspection state
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [inspectDate, setInspectDate] = useState(todayStr);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Fetch doctors and patients
  const fetchDoctorsAndPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsData, ptsData] = await Promise.all([
        receptionistService.getDoctors({ page_size: 100 }),
        receptionistService.getPatients({ page_size: 100 }),
      ]);
      const docList = Array.isArray(docsData) ? docsData : (docsData.results || []);
      const patList = Array.isArray(ptsData) ? ptsData : (ptsData.results || []);
      setDoctors(docList);
      setPatients(patList);
      if (docList.length > 0 && !selectedDoctor) {
        setSelectedDoctor(docList[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch doctor schedules.');
    } finally {
      setLoading(false);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    document.title = 'Doctor Schedule — CareFlow HMS Receptionist';
    fetchDoctorsAndPatients();
  }, [fetchDoctorsAndPatients]);

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

  // Load available slots when selectedDoctor or inspectDate changes
  useEffect(() => {
    if (selectedDoctor && inspectDate) {
      let isMounted = true;
      setLoadingSlots(true);
      receptionistService.getAvailableSlots(selectedDoctor.id, inspectDate)
        .then((res) => {
          if (isMounted) {
            setSlots(filterCompletedSlots(res?.available_slots || [], inspectDate));
          }
        })
        .catch(() => {
          if (isMounted) setSlots([]);
        })
        .finally(() => {
          if (isMounted) setLoadingSlots(false);
        });
      return () => { isMounted = false; };
    }
  }, [selectedDoctor, inspectDate, filterCompletedSlots]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    doctors.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set).sort();
  }, [doctors]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (selectedDepartment !== 'ALL' && doc.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${doc.first_name || ''} ${doc.last_name || ''}`.toLowerCase();
        const spec = (doc.specialization || '').toLowerCase();
        const dept = (doc.department || '').toLowerCase();
        const docId = (doc.doctor_id || '').toLowerCase();
        if (!fullName.includes(q) && !spec.includes(q) && !dept.includes(q) && !docId.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [doctors, selectedDepartment, searchQuery]);

  // Filtered patients for dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 15);
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const phone = (p.phone_number || '').toLowerCase();
      const id = String(p.id);
      return name.includes(q) || phone.includes(q) || id.includes(q);
    }).slice(0, 20);
  }, [patients, patientSearch]);

  // Open booking modal for a specific slot
  const handleOpenSlotBooking = (slotTime) => {
    setBookingSlot(slotTime);
    setBookingPatientId('');
    setBookingReason('');
    setBookingError('');
    setPatientSearch('');
    setIsBookModalOpen(true);
  };

  // Submit booking from schedule view
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    if (!bookingPatientId) {
      setBookingError('Please select a registered patient.');
      return;
    }
    if (!bookingSlot) {
      setBookingError('Please select an available appointment slot.');
      return;
    }

    try {
      setBookingSubmitting(true);
      await receptionistService.bookAppointment({
        patient: bookingPatientId,
        doctor: selectedDoctor.id,
        appointment_date: inspectDate,
        appointment_time: bookingSlot,
        reason_for_visit: bookingReason.trim() || 'Scheduled via Doctor Schedule Inspector',
        reason: bookingReason.trim() || 'Scheduled via Doctor Schedule Inspector',
      });
      setIsBookModalOpen(false);
      toast.success(`Appointment successfully booked for ${inspectDate} at ${bookingSlot}!`, 'Appointment Booked');
      const res = await receptionistService.getAvailableSlots(selectedDoctor.id, inspectDate);
      setSlots(filterCompletedSlots(res?.available_slots || [], inspectDate));
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
      setBookingError(msg || 'Failed to book slot. It may have just been reserved.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="receptionist-page">
      {/* Page Header */}
      <div className="dash-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dash-title" style={{ margin: 0 }}>Doctor Schedule & Slots</h1>
          <p className="dash-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Check consulting doctors, office hours, working days, and real-time appointment availability.
          </p>
        </div>
      </div>



      {/* Filter / Search Bar */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              className="dash-input"
              placeholder="Search doctor name, specialization, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ opacity: 0.7 }} />
            <select
              className="dash-input"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            >
              <option value="ALL">All Departments ({doctors.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Doctors List (Left) + Slot Inspector (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Doctor Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope size={18} style={{ color: '#0ea5e9' }} />
            <span>Consulting Doctors ({filteredDoctors.length})</span>
          </h3>

          {loading ? (
            <div className="dash-card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.7 }}>
              <Loader2 size={28} className="spin-icon" style={{ margin: '0 auto 0.5rem' }} />
              <p>Loading medical staff directory...</p>
            </div>
          ) : error ? (
            <div className="dash-card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 0.5rem' }} />
              <p>{error}</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="dash-card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.7 }}>
              <p>No doctors match the selected search or department.</p>
            </div>
          ) : (
            filteredDoctors.map((doc) => {
              const isSelected = selectedDoctor?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`dash-card ${isSelected ? 'active-doctor-card' : ''}`}
                  onClick={() => setSelectedDoctor(doc)}
                  style={{
                    padding: '1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected ? '0 0 15px rgba(2, 132, 199, 0.2)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          Dr. {doc.first_name} {doc.last_name}
                        </span>
                        <span className="dash-badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {doc.doctor_id || `#${doc.id}`}
                        </span>
                      </div>
                      <div style={{ color: '#0ea5e9', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.2rem' }}>
                        {doc.specialization} • {doc.department}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.15rem' }}>
                        {doc.qualification || 'MBBS'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="dash-badge badge-success" style={{ fontSize: '0.8rem' }}>
                        ₹{doc.consultation_fee || '0'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', opacity: 0.75 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} />
                      <span>{doc.start_time?.slice(0, 5)} - {doc.end_time?.slice(0, 5)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} />
                      <span>{doc.available_days || 'Mon - Fri'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Real-time Slot Availability Inspector */}
        <div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#10b981' }} />
            <span>Schedule & Slot Inspector</span>
          </h3>

          {selectedDoctor ? (
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              {/* Doctor header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                    Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                  </h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
                    {selectedDoctor.specialization} ({selectedDoctor.department})
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Hours</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedDoctor.start_time?.slice(0, 5)} – {selectedDoctor.end_time?.slice(0, 5)}
                  </div>
                </div>
              </div>

              {/* Date Selector */}
              <div style={{ margin: '1.25rem 0' }}>
                <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Check Date
                </label>
                <input
                  type="date"
                  className="dash-input"
                  value={inspectDate}
                  min={todayStr}
                  onChange={(e) => setInspectDate(e.target.value)}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              {/* Working Days Reminder */}
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
                <strong>Consultation Days:</strong> {selectedDoctor.available_days || 'Monday to Friday'}
              </div>

              {/* Slots Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Available 30-Min Slots</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.65 }}>
                    {slots.length} slot{slots.length !== 1 ? 's' : ''} free
                  </span>
                </div>

                {loadingSlots ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                    <Loader2 size={22} className="spin-icon" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>Querying calendar slots...</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="dash-alert dash-alert-warning" style={{ fontSize: '0.85rem', padding: '1rem' }}>
                    No available appointment slots. Please choose another date or doctor.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.6rem' }}>
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleOpenSlotBooking(slot)}
                        className="dash-btn dash-btn-secondary"
                        title={`Click to book ${slot}`}
                        style={{
                          padding: '0.5rem 0.25rem',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#34d399',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', opacity: 0.6, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                Click any green time slot to open the direct front-desk booking form for that slot.
              </div>
            </div>
          ) : (
            <div className="dash-card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>
              <p>Select a doctor on the left to inspect their schedule.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: DIRECT SLOT BOOKING ─── */}
      {isBookModalOpen && selectedDoctor && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !bookingSubmitting && setIsBookModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Plus size={20} style={{ color: '#0ea5e9' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Book Selected Slot</h3>
                </div>
                <button className="dash-btn-icon" onClick={() => !bookingSubmitting && setIsBookModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                  <div className="dash-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div><strong>Doctor:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name} ({selectedDoctor.specialization})</div>
                    <div><strong>Date & Time:</strong> {inspectDate} at {bookingSlot}</div>
                    <div><strong>Consultation Fee:</strong> ₹{selectedDoctor.consultation_fee || '0'}</div>
                  </div>

                  {bookingError && (
                    <div className="dash-alert dash-alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {bookingError}
                    </div>
                  )}

                  {/* Patient Search & Select */}
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
                      {filteredPatients.map((p) => {
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

                  {/* Reason for Visit */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Chief Complaint / Reason
                    </label>
                    <textarea
                      className="dash-input"
                      rows={2}
                      placeholder="e.g., Follow-up, Routine consultation, Chest pain..."
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                    />
                  </div>
                </div>

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
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? 'Confirming...' : 'Confirm Appointment'}
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

export default ReceptionistDoctorSchedulePage;
