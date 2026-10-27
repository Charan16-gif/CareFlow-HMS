import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import receptionistService from '../../services/receptionistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Users,
  Search,
  UserPlus,
  Eye,
  Edit2,
  AlertCircle,
  Loader2,
  X,
  CalendarPlus,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistPatientsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Registration Form
  const [registerData, setRegisterData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    gender: 'MALE',
    blood_group: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // Edit Form
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    gender: 'MALE',
    blood_group: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await receptionistService.getPatients();
      const list = Array.isArray(data) ? data : data?.results || [];
      setPatients(list);
    } catch (err) {
      setError('Failed to load patient records from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Patient Management — CareFlow HMS Receptionist';
    fetchPatients();
  }, [fetchPatients]);

  // Handle URL query parameter trigger (?action=register)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'register') {
      setIsRegisterModalOpen(true);
    }
  }, [location.search]);

  // Open View Modal & Load Patient Appointments
  const handleOpenViewModal = async (patient) => {
    setSelectedPatient(patient);
    setIsViewModalOpen(true);
    setLoadingAppointments(true);
    try {
      const res = await receptionistService.getAppointments({ patient: patient.id });
      const list = Array.isArray(res) ? res : res?.results || [];
      setPatientAppointments(list);
    } catch (err) {
      setPatientAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (patient) => {
    setSelectedPatient(patient);
    setEditData({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      phone_number: patient.phone_number || '',
      email: patient.email || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || 'MALE',
      blood_group: patient.blood_group || '',
      address: patient.address || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relation: patient.emergency_contact_relation || '',
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  // Submit Patient Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterErrors({});

    const errors = {};
    if (!registerData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!registerData.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!registerData.phone_number.trim()) errors.phone_number = 'Phone number is required.';

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    setSubmittingRegister(true);
    try {
      const payload = {
        first_name: registerData.first_name.trim(),
        last_name: registerData.last_name.trim(),
        phone_number: registerData.phone_number.trim(),
        email: registerData.email.trim() || null,
        date_of_birth: registerData.date_of_birth || null,
        gender: registerData.gender,
        blood_group: registerData.blood_group || null,
        address: registerData.address.trim() || null,
        emergency_contact_name: registerData.emergency_contact_name.trim() || null,
        emergency_contact_phone: registerData.emergency_contact_phone.trim() || null,
        emergency_contact_relation: registerData.emergency_contact_relation.trim() || null,
      };

      const created = await receptionistService.registerPatient(payload);
      const succ = `Patient ${created.full_name} (${created.patient_id}) registered successfully!`;
      toast.success(succ, 'Patient Registered');

      setIsRegisterModalOpen(false);
      setRegisterData({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        date_of_birth: '',
        gender: 'MALE',
        blood_group: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',
      });
      fetchPatients();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setRegisterErrors(data);
      } else {
        setRegisterErrors({ non_field_errors: 'Failed to register patient. Please verify your entries.' });
      }
      toast.error('Failed to register patient. Please verify your entries.', 'Registration Error');
    } finally {
      setSubmittingRegister(false);
    }
  };

  // Submit Patient Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrors({});

    const errors = {};
    if (!editData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!editData.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!editData.phone_number.trim()) errors.phone_number = 'Phone number is required.';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload = {
        first_name: editData.first_name.trim(),
        last_name: editData.last_name.trim(),
        phone_number: editData.phone_number.trim(),
        email: editData.email.trim() || null,
        date_of_birth: editData.date_of_birth || null,
        gender: editData.gender,
        blood_group: editData.blood_group || null,
        address: editData.address.trim() || null,
        emergency_contact_name: editData.emergency_contact_name.trim() || null,
        emergency_contact_phone: editData.emergency_contact_phone.trim() || null,
        emergency_contact_relation: editData.emergency_contact_relation.trim() || null,
      };

      const updated = await receptionistService.updatePatient(selectedPatient.id, payload);
      const succ = `Patient ${updated.full_name} records updated successfully.`;
      toast.success(succ, 'Record Updated');

      setIsEditModalOpen(false);
      fetchPatients();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setEditErrors(data);
      } else {
        setEditErrors({ non_field_errors: 'Unable to update patient demographic records.' });
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Filtered Patients
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (p.full_name || `${p.first_name} ${p.last_name}`).toLowerCase();
    const pid = (p.patient_id || '').toLowerCase();
    const phone = (p.phone_number || '').toLowerCase();
    const email = (p.email || '').toLowerCase();

    const matchesSearch =
      !q || name.includes(q) || pid.includes(q) || phone.includes(q) || email.includes(q);

    if (!matchesSearch) return false;

    if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;

    return true;
  });

  return (
    <div className="admin-overview-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Patient Demographics & Registration</h2>
          <p className="admin-page-subtitle">
            Manage hospital patient intake records, register new patients, and verify contact profiles.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => setIsRegisterModalOpen(true)}
        >
          <UserPlus size={16} />
          <span>Register New Patient</span>
        </button>
      </div>



      {/* Error Alert */}
      {error && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Gender Filter Controls */}
      <div className="admin-table-controls" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="admin-search-wrapper" style={{ flex: '1 1 320px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by patient name, ID, phone number, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Gender:</label>
          <select
            className="admin-form-input"
            style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="ALL">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <span className="admin-table-record-count">
          Showing {filteredPatients.length} of {patients.length} patients
        </span>
      </div>

      {/* Patients Table */}
      {loading ? (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving registered hospital patient demographic profiles...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <Users size={32} />
          </div>
          <h3 style={{ marginTop: '0.75rem', marginBottom: '0.35rem', color: 'var(--admin-heading-color)' }}>
            No Patient Records Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--admin-text-muted)' }}>
            {searchQuery || genderFilter !== 'ALL'
              ? 'No registered patients match your search criteria.'
              : 'There are currently no patient records registered in the system.'}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => setIsRegisterModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>Register First Patient</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop / Tablet Table View (>= 768px) */}
          <div className="receptionist-patient-desktop-table admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Age / DOB</th>
                  <th>Gender</th>
                  <th>Blood Group</th>
                  <th>Phone Number</th>
                  <th>Email Address</th>
                  <th>Registered Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const patientName =
                    p.full_name ||
                    `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
                    'Patient';
                  const age =
                    p.age !== undefined && p.age !== null
                      ? p.age
                      : p.date_of_birth
                      ? Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
                      : null;

                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--admin-heading-color)' }}>
                          {p.patient_id}
                        </span>
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-name">{patientName}</span>
                          {p.address && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-dim)' }}>
                              {p.address.slice(0, 24)}...
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)' }}>
                          {age !== null ? `${age} yrs` : '—'}
                        </span>
                        {p.date_of_birth && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>
                            {p.date_of_birth}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="admin-role-badge">
                          <span>{p.gender}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: p.blood_group ? '#ef4444' : 'var(--admin-text-dim)' }}>
                          {p.blood_group || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)' }}>
                          {p.phone_number || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: 'var(--admin-text-muted)' }}>
                          {p.email || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: 'var(--admin-text-dim)' }}>
                          {p.registration_date || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="View Patient Record & History"
                            onClick={() => handleOpenViewModal(p)}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="Edit Demographic Details"
                            onClick={() => handleOpenEditModal(p)}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            title="Book an Appointment"
                            onClick={() => navigate(`/receptionist/appointments?action=book&patientId=${p.id}`)}
                          >
                            <CalendarPlus size={13} />
                            <span>Book</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View (< 768px) */}
          <div className="receptionist-patient-mobile-cards">
            {filteredPatients.map((p) => {
              const patientName =
                p.full_name ||
                `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
                'Patient';
              const age =
                p.age !== undefined && p.age !== null
                  ? p.age
                  : p.date_of_birth
                  ? Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
                  : null;

              return (
                <div key={`mob-${p.id}`} className="receptionist-patient-card">
                  <div className="receptionist-patient-card-header">
                    <div>
                      <h4 className="receptionist-patient-card-title">{patientName}</h4>
                      <span className="receptionist-patient-card-id">{p.patient_id}</span>
                    </div>
                    <span className="admin-role-badge">
                      <span>{p.gender}</span>
                    </span>
                  </div>

                  <div className="receptionist-patient-card-grid">
                    <div className="receptionist-patient-card-field">
                      <span className="receptionist-patient-card-label">Age / DOB</span>
                      <span className="receptionist-patient-card-val">
                        {age !== null ? `${age} yrs` : '—'} {p.date_of_birth ? `(${p.date_of_birth})` : ''}
                      </span>
                    </div>
                    <div className="receptionist-patient-card-field">
                      <span className="receptionist-patient-card-label">Blood Group</span>
                      <span className="receptionist-patient-card-val" style={{ color: p.blood_group ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                        {p.blood_group || '—'}
                      </span>
                    </div>
                    <div className="receptionist-patient-card-field">
                      <span className="receptionist-patient-card-label">Phone</span>
                      <span className="receptionist-patient-card-val">{p.phone_number || '—'}</span>
                    </div>
                    <div className="receptionist-patient-card-field">
                      <span className="receptionist-patient-card-label">Email</span>
                      <span className="receptionist-patient-card-val">{p.email || '—'}</span>
                    </div>
                    {p.address && (
                      <div className="receptionist-patient-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="receptionist-patient-card-label">Address</span>
                        <span className="receptionist-patient-card-val">{p.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="receptionist-patient-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary receptionist-patient-card-btn"
                      onClick={() => handleOpenViewModal(p)}
                    >
                      <Eye size={15} />
                      <span>View Record</span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary receptionist-patient-card-btn"
                      onClick={() => handleOpenEditModal(p)}
                    >
                      <Edit2 size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary receptionist-patient-card-btn"
                      onClick={() => navigate(`/receptionist/appointments?action=book&patientId=${p.id}`)}
                    >
                      <CalendarPlus size={15} />
                      <span>Book Appt</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REGISTER NEW PATIENT
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isRegisterModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !submittingRegister && setIsRegisterModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px' }}
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
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Register New Patient</h3>
                  <p className="admin-modal-subtitle">Record hospital intake and demographic details</p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !submittingRegister && setIsRegisterModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {registerErrors.non_field_errors && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{registerErrors.non_field_errors}</span>
                  </div>
                )}

                {/* Name Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Ramesh"
                      value={registerData.first_name}
                      onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                    />
                    {registerErrors.first_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {registerErrors.first_name}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Kumar"
                      value={registerData.last_name}
                      onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                    />
                    {registerErrors.last_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {registerErrors.last_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. 9876543210"
                      value={registerData.phone_number}
                      onChange={(e) => setRegisterData({ ...registerData, phone_number: e.target.value })}
                    />
                    {registerErrors.phone_number && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {registerErrors.phone_number}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Email Address</label>
                    <input
                      type="email"
                      className="admin-form-input"
                      placeholder="e.g. ramesh@example.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    />
                    {registerErrors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {registerErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Demographics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="admin-form-input"
                      value={registerData.date_of_birth}
                      onChange={(e) => setRegisterData({ ...registerData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Gender</label>
                    <select
                      className="admin-form-input"
                      value={registerData.gender}
                      onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Blood Group</label>
                    <select
                      className="admin-form-input"
                      value={registerData.blood_group}
                      onChange={(e) => setRegisterData({ ...registerData, blood_group: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Residential Address</label>
                  <textarea
                    rows={2}
                    className="admin-form-input"
                    placeholder="Street, City, Postal Code"
                    value={registerData.address}
                    onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="admin-glass-card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-heading-color)', display: 'block', marginBottom: '0.75rem' }}>
                    Emergency Contact Details (Optional)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Contact Person</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="Relative / Friend"
                        value={registerData.emergency_contact_name}
                        onChange={(e) => setRegisterData({ ...registerData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Phone Number</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="Emergency Phone"
                        value={registerData.emergency_contact_phone}
                        onChange={(e) => setRegisterData({ ...registerData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Relationship</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="e.g. Spouse, Parent"
                        value={registerData.emergency_contact_relation}
                        onChange={(e) => setRegisterData({ ...registerData, emergency_contact_relation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsRegisterModalOpen(false)}
                  disabled={submittingRegister}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submittingRegister}
                >
                  {submittingRegister ? (
                    <>
                      <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT PATIENT DETAILS
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isEditModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => !submittingEdit && setIsEditModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px' }}
          >
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  className="admin-stat-icon-box"
                  style={{
                    background: 'rgba(20, 184, 166, 0.15)',
                    color: '#14b8a6',
                    borderColor: 'rgba(20, 184, 166, 0.3)',
                  }}
                >
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Edit Patient Record</h3>
                  <p className="admin-modal-subtitle">
                    Patient ID: {selectedPatient?.patient_id} ({selectedPatient?.full_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => !submittingEdit && setIsEditModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {editErrors.non_field_errors && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{editErrors.non_field_errors}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editData.first_name}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                    />
                    {editErrors.first_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {editErrors.first_name}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editData.last_name}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                    />
                    {editErrors.last_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {editErrors.last_name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editData.phone_number}
                      onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                    />
                    {editErrors.phone_number && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {editErrors.phone_number}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Email Address</label>
                    <input
                      type="email"
                      className="admin-form-input"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                    {editErrors.email && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {editErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="admin-form-input"
                      value={editData.date_of_birth}
                      onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Gender</label>
                    <select
                      className="admin-form-input"
                      value={editData.gender}
                      onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Blood Group</label>
                    <select
                      className="admin-form-input"
                      value={editData.blood_group}
                      onChange={(e) => setEditData({ ...editData, blood_group: e.target.value })}
                    >
                      <option value="">Select...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Residential Address</label>
                  <textarea
                    rows={2}
                    className="admin-form-input"
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="admin-glass-card" style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-heading-color)', display: 'block', marginBottom: '0.75rem' }}>
                    Emergency Contact Details
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Name</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={editData.emergency_contact_name}
                        onChange={(e) => setEditData({ ...editData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Phone</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={editData.emergency_contact_phone}
                        onChange={(e) => setEditData({ ...editData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Relation</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        value={editData.emergency_contact_relation}
                        onChange={(e) => setEditData({ ...editData, emergency_contact_relation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submittingEdit}
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Demographic Updates</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW PATIENT PROFILE & APPOINTMENT HISTORY
      ───────────────────────────────────────────────────────────── */}
      <ModalPortal isOpen={isViewModalOpen}>
        <div className="admin-modal-backdrop" onClick={() => setIsViewModalOpen(false)}>
          <div
            className="admin-modal-card admin-modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px' }}
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
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {selectedPatient?.full_name}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Patient Identifier: {selectedPatient?.patient_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsViewModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {selectedPatient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Demographics Card */}
                  <div className="admin-glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Phone</span>
                        <div style={{ fontWeight: 600, color: 'var(--admin-heading-color)' }}>{selectedPatient.phone_number || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Email</span>
                        <div style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>{selectedPatient.email || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Gender & Blood</span>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>
                          {selectedPatient.gender} | <span style={{ color: '#ef4444' }}>{selectedPatient.blood_group || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Date of Birth</span>
                        <div style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>{selectedPatient.date_of_birth || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Registration Date</span>
                        <div style={{ fontWeight: 500, color: 'var(--admin-text-main)' }}>{selectedPatient.registration_date || '—'}</div>
                      </div>
                    </div>

                    {selectedPatient.address && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Residential Address</span>
                        <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-main)', marginTop: '0.2rem' }}>{selectedPatient.address}</div>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Card */}
                  {selectedPatient.emergency_contact_name && (
                    <div className="admin-glass-card" style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Emergency Contact
                      </span>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>Name:</span>{' '}
                          <strong>{selectedPatient.emergency_contact_name}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>Phone:</span>{' '}
                          <strong>{selectedPatient.emergency_contact_phone || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>Relation:</span>{' '}
                          <strong>{selectedPatient.emergency_contact_relation || '—'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Appointment History */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-heading-color)', marginBottom: '0.75rem' }}>
                      Appointment & Visit History
                    </h4>
                    {loadingAppointments ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <Loader2 size={24} className="spinner-icon admin-spinner-teal" />
                      </div>
                    ) : patientAppointments.length === 0 ? (
                      <div style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '8px', background: 'var(--admin-surface-secondary)' }}>
                        <p style={{ margin: 0, color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                          No appointment history found for this patient.
                        </p>
                      </div>
                    ) : (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Doctor</th>
                              <th>Date & Time</th>
                              <th>Status</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientAppointments.map((apt) => (
                              <tr key={apt.id}>
                                <td style={{ fontFamily: 'monospace' }}>{apt.appointment_id}</td>
                                <td>{apt.doctor_name}</td>
                                <td>{apt.appointment_date} {apt.appointment_time}</td>
                                <td>
                                  <span className={`admin-badge admin-badge-${apt.status.toLowerCase()}`}>
                                    {apt.status}
                                  </span>
                                </td>
                                <td>{apt.reason_for_visit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(selectedPatient);
                }}
              >
                <Edit2 size={15} />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  navigate(`/receptionist/appointments?action=book&patientId=${selectedPatient?.id}`);
                }}
              >
                <CalendarPlus size={15} />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default ReceptionistPatientsPage;
