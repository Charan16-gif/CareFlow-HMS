import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  User,
  Pill,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const DoctorPrescriptionsPage = () => {
  const location = useLocation();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown reference data
  const [eligiblePatients, setEligiblePatients] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);
  const [loadingRefData, setLoadingRefData] = useState(false);

  // View Details Modal
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    patient: '',
    appointment: null,
    diagnosis: '',
    clinical_notes: '',
    prescription_items: [
      {
        medicine: '',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice daily after food)',
        duration: '5 Days',
        quantity_prescribed: 10,
        instructions: 'Take after meals with water',
      },
    ],
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrescriptionId, setEditPrescriptionId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    patient: '',
    patient_name: '',
    diagnosis: '',
    clinical_notes: '',
    prescription_items: [],
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modal
  const [toDelete, setToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      isDetailsModalOpen || isCreateModalOpen || isEditModalOpen || isDeleteModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailsModalOpen, isCreateModalOpen, isEditModalOpen, isDeleteModalOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        if (isCreateModalOpen) setIsCreateModalOpen(false);
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsModalOpen, isCreateModalOpen, isEditModalOpen, isDeleteModalOpen]);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getPrescriptions(searchQuery);
      setPrescriptions(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load prescriptions from the pharmacy database.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadReferenceData = useCallback(async () => {
    setLoadingRefData(true);
    try {
      const [patientsRes, medicinesRes] = await Promise.all([
        doctorService.getEligiblePatients('', 'prescription'),
        doctorService.getMedicines(),
      ]);
      setEligiblePatients(patientsRes);
      setMedicinesList(Array.isArray(medicinesRes) ? medicinesRes.filter((m) => m.is_active !== false) : []);
    } catch (err) {
      // Fallback
    } finally {
      setLoadingRefData(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Prescriptions — CareFlow HMS Doctor';
    fetchPrescriptions();
    loadReferenceData();
  }, [fetchPrescriptions, loadReferenceData]);

  // Check if opened from appointment navigation with preselected patient
  useEffect(() => {
    if (location.state?.selectedPatientId) {
      setCreateFormData((prev) => ({
        ...prev,
        patient: location.state.selectedPatientId,
        appointment: location.state.selectedAppointmentId || null,
      }));
      setIsCreateModalOpen(true);
    }
  }, [location.state]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              border: '1px solid rgba(6, 182, 212, 0.35)',
            }}
          >
            Pending
          </span>
        );
      case 'PARTIALLY_DISPENSED':
        return (
          <span
            className="admin-badge"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            Partially Dispensed
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            className="admin-badge admin-badge-green"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            Completed
          </span>
        );
      case 'DISPENSED':
        return <span className="admin-badge admin-badge-green">Dispensed</span>;
      case 'CANCELLED':
        return <span className="admin-badge admin-badge-red">Cancelled</span>;
      default:
        return <span className="admin-badge admin-badge-teal">{status || 'Pending'}</span>;
    }
  };

  // ─── VIEW DETAILS ───────────────────────────────────────────────
  const handleOpenDetails = async (rx) => {
    setIsDetailsModalOpen(true);
    try {
      const detailed = await doctorService.getPrescriptionDetails(rx.id);
      setSelectedPrescription(detailed);
    } catch (err) {
      setSelectedPrescription(rx);
    }
  };

  // ─── CREATE PRESCRIPTION ────────────────────────────────────────
  const handleOpenCreate = () => {
    loadReferenceData();
    const firstPatient = eligiblePatients.length > 0 ? eligiblePatients[0] : null;
    setCreateFormData({
      patient: firstPatient ? firstPatient.id : '',
      appointment: firstPatient?.appointment_id || null,
      diagnosis: '',
      clinical_notes: '',
      prescription_items: [
        {
          medicine: medicinesList.length > 0 ? medicinesList[0].id : '',
          dosage: '1 Tablet',
          frequency: '1-0-1 (Twice daily after food)',
          duration: '5 Days',
          quantity_prescribed: 10,
          instructions: 'Take after meals with water',
        },
      ],
    });
    setCreateErrors({});
    setIsCreateModalOpen(true);
  };

  const handleAddCreateItem = () => {
    setCreateFormData((prev) => ({
      ...prev,
      prescription_items: [
        ...prev.prescription_items,
        {
          medicine: medicinesList.length > 0 ? medicinesList[0].id : '',
          dosage: '1 Tablet',
          frequency: '1-0-1 (Twice daily after food)',
          duration: '5 Days',
          quantity_prescribed: 10,
          instructions: 'Take after meals',
        },
      ],
    }));
  };

  const handleRemoveCreateItem = (index) => {
    if (createFormData.prescription_items.length <= 1) return;
    setCreateFormData((prev) => ({
      ...prev,
      prescription_items: prev.prescription_items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateItemChange = (index, field, value) => {
    setCreateFormData((prev) => {
      const updated = [...prev.prescription_items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, prescription_items: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateErrors({});

    const errors = {};
    if (!createFormData.patient || eligiblePatients.length === 0) {
      errors.patient = 'Please select a checked-in patient assigned to your care.';
    }
    if (!createFormData.diagnosis.trim()) {
      errors.diagnosis = 'Clinical diagnosis is required.';
    }
    if (!createFormData.prescription_items || createFormData.prescription_items.length === 0) {
      errors.items = 'At least one medicine item is required.';
    } else {
      createFormData.prescription_items.forEach((item, idx) => {
        if (!item.medicine) {
          errors[`item_${idx}_medicine`] = 'Please select a medicine.';
        }
        if (!item.quantity_prescribed || parseInt(item.quantity_prescribed, 10) <= 0) {
          errors[`item_${idx}_qty`] = 'Quantity must be at least 1.';
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        patient: parseInt(createFormData.patient, 10),
        diagnosis: createFormData.diagnosis.trim(),
        clinical_notes: createFormData.clinical_notes.trim(),
        prescription_items: createFormData.prescription_items.map((item) => ({
          medicine: parseInt(item.medicine, 10),
          dosage: item.dosage.trim() || '1 Tablet',
          frequency: item.frequency.trim() || '1-0-1',
          duration: item.duration.trim() || '5 Days',
          quantity_prescribed: parseInt(item.quantity_prescribed, 10) || 1,
          instructions: item.instructions.trim(),
        })),
      };

      if (createFormData.appointment) {
        payload.appointment = createFormData.appointment;
      }

      const res = await doctorService.createPrescription(payload);
      const successMessage = `Prescription ${res.prescription_id || 'record'} created and forwarded to pharmacy successfully!`;
      toast.success(successMessage, 'Prescription Created');
      setIsCreateModalOpen(false);
      fetchPrescriptions();
    } catch (err) {
      let msg = 'Failed to create prescription. Please check fields and try again.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.detail) {
          msg = err.response.data.detail;
        } else if (err.response.data.appointment) {
          msg = Array.isArray(err.response.data.appointment) ? err.response.data.appointment[0] : err.response.data.appointment;
        } else if (err.response.data.patient) {
          msg = Array.isArray(err.response.data.patient) ? err.response.data.patient[0] : err.response.data.patient;
        } else {
          setCreateErrors(err.response.data);
          const firstErr = Object.values(err.response.data)[0];
          toast.error(Array.isArray(firstErr) ? firstErr[0] : String(firstErr), 'Prescription Error');
          return;
        }
      }
      toast.error(msg, 'Prescription Error');
      setCreateErrors({ general: msg });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // ─── EDIT PRESCRIPTION ──────────────────────────────────────────
  const handleOpenEdit = async (rx) => {
    setEditPrescriptionId(rx.id);
    setEditErrors({});

    let detailed = rx;
    try {
      detailed = await doctorService.getPrescriptionDetails(rx.id);
    } catch (err) {
      // Use rx summary
    }

    const items = (detailed.items || []).map((it) => ({
      medicine: typeof it.medicine === 'object' ? it.medicine.id : it.medicine,
      dosage: it.dosage || '1 Tablet',
      frequency: it.frequency || '1-0-1',
      duration: it.duration || '5 Days',
      quantity_prescribed: it.quantity_prescribed || 1,
      instructions: it.instructions || '',
    }));

    setEditFormData({
      patient: typeof detailed.patient === 'object' ? detailed.patient.id : detailed.patient,
      patient_name: detailed.patient_name || 'Patient',
      diagnosis: detailed.diagnosis || '',
      clinical_notes: detailed.clinical_notes || '',
      prescription_items: items.length > 0 ? items : [
        {
          medicine: medicinesList.length > 0 ? medicinesList[0].id : '',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          quantity_prescribed: 10,
          instructions: '',
        },
      ],
    });

    setIsEditModalOpen(true);
  };

  const handleAddEditItem = () => {
    setEditFormData((prev) => ({
      ...prev,
      prescription_items: [
        ...prev.prescription_items,
        {
          medicine: medicinesList.length > 0 ? medicinesList[0].id : '',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          quantity_prescribed: 10,
          instructions: '',
        },
      ],
    }));
  };

  const handleRemoveEditItem = (index) => {
    if (editFormData.prescription_items.length <= 1) return;
    setEditFormData((prev) => ({
      ...prev,
      prescription_items: prev.prescription_items.filter((_, i) => i !== index),
    }));
  };

  const handleEditItemChange = (index, field, value) => {
    setEditFormData((prev) => {
      const updated = [...prev.prescription_items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, prescription_items: updated };
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErrors({});

    const errors = {};
    if (!editFormData.diagnosis.trim()) {
      errors.diagnosis = 'Diagnosis is required.';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        patient: editFormData.patient,
        diagnosis: editFormData.diagnosis.trim(),
        clinical_notes: editFormData.clinical_notes.trim(),
        prescription_items: editFormData.prescription_items.map((item) => ({
          medicine: parseInt(item.medicine, 10),
          dosage: item.dosage.trim() || '1 Tablet',
          frequency: item.frequency.trim() || '1-0-1',
          duration: item.duration.trim() || '5 Days',
          quantity_prescribed: parseInt(item.quantity_prescribed, 10) || 1,
          instructions: item.instructions.trim(),
        })),
      };

      await doctorService.updatePrescription(editPrescriptionId, payload);
      toast.success('Prescription updated successfully.', 'Prescription Updated');
      setIsEditModalOpen(false);
      fetchPrescriptions();
    } catch (err) {
      let msg = 'Failed to update prescription. Please try again.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else setEditErrors(err.response.data);
      }
      setEditErrors({ general: msg });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ─── DELETE PRESCRIPTION ────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      await doctorService.deletePrescription(toDelete.id);
      toast.success(`Prescription ${toDelete.prescription_id || `#${toDelete.id}`} was deleted successfully.`, 'Prescription Deleted');
      setIsDeleteModalOpen(false);
      setToDelete(null);
      fetchPrescriptions();
    } catch (err) {
      let msg = 'Cannot delete this prescription record. Prescriptions that have been dispensed or linked to inventory records are protected.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.error) msg = err.response.data.error;
      }
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── COMPLETE PRESCRIPTION & AUTO CHECKOUT ──────────────────────
  const handleCompletePrescription = async (rx) => {
    try {
      setCompletingId(rx.id);
      await doctorService.completePrescription(rx.id);
      const successMessage = `Prescription ${rx.prescription_id || rx.id} marked as Completed. Associated patient visit automatically checked out!`;
      toast.success(successMessage, 'Prescription Completed');
      fetchPrescriptions();
      if (selectedPrescription && selectedPrescription.id === rx.id) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to complete prescription.';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg), 'Error Completing Prescription');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Prescriptions</h2>
          <p className="admin-page-subtitle">
            Create, view, update, and manage prescriptions for your patients
          </p>
        </div>

        <div className="admin-page-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>Create Prescription</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-table-controls">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by prescription ID, patient name, or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchPrescriptions();
            }}
          />
        </div>
        <span className="admin-table-record-count">
          {prescriptions.length} {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving your patient prescriptions...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Prescriptions</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={fetchPrescriptions}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && prescriptions.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <FileText size={32} />
          </div>
          <h3>No Prescriptions Found</h3>
          <p>
            {searchQuery
              ? `No prescriptions match "${searchQuery}". Try a different keyword.`
              : 'You have not authored any prescriptions yet. Click "Create Prescription" to write one for an eligible patient.'}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>Create First Prescription</span>
          </button>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && prescriptions.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Doctor prescription records">
            <thead>
              <tr>
                <th scope="col">Prescription ID</th>
                <th scope="col">Patient</th>
                <th scope="col">Date Issued</th>
                <th scope="col">Diagnosis</th>
                <th scope="col">Medicines</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => {
                const itemCount = rx.items ? rx.items.length : 0;
                const canEdit = rx.status === 'PENDING';
                return (
                  <tr key={rx.id}>
                    {/* Prescription ID */}
                    <td className="admin-font-mono admin-font-semibold">
                      {rx.prescription_id || `#${rx.id}`}
                    </td>

                    {/* Patient */}
                    <td>
                      <div className="admin-user-cell">
                        <User size={14} className="admin-text-teal" />
                        <span className="admin-user-name">
                          {rx.patient_name || 'Patient'}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={13} className="admin-text-dim" />
                        <span>{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>

                    {/* Diagnosis */}
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {rx.diagnosis ? (rx.diagnosis.length > 40 ? `${rx.diagnosis.slice(0, 40)}...` : rx.diagnosis) : '—'}
                      </span>
                    </td>

                    {/* Medicines count */}
                    <td>
                      <span className="admin-badge admin-badge-teal">
                        <Pill size={11} />
                        <span>{itemCount} {itemCount === 1 ? 'medicine' : 'medicines'}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(rx.status)}</td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="admin-action-btn-group">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-view"
                          onClick={() => handleOpenDetails(rx)}
                          aria-label={`View details for prescription ${rx.prescription_id || rx.id}`}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {rx.status === 'PENDING' && (
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-edit"
                            onClick={() => handleCompletePrescription(rx)}
                            disabled={completingId === rx.id}
                            aria-label={`Complete prescription ${rx.prescription_id || rx.id} and check out patient`}
                            title="Complete Prescription (Auto Check-Out Visit)"
                            style={{
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.35)',
                              background: 'rgba(16, 185, 129, 0.1)',
                            }}
                          >
                            {completingId === rx.id ? (
                              <Loader2 size={15} className="spinner-icon" />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-edit"
                            onClick={() => handleOpenEdit(rx)}
                            aria-label={`Edit prescription ${rx.prescription_id || rx.id}`}
                            title="Edit Prescription"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-delete"
                          onClick={() => {
                            setToDelete(rx);
                            setDeleteError('');
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label={`Delete prescription ${rx.prescription_id || rx.id}`}
                          title="Delete Prescription"
                        >
                          <Trash2 size={15} />
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
          CREATE PRESCRIPTION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsCreateModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-prescription-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="create-prescription-title" className="admin-modal-title">
                    Create New Prescription
                  </h3>
                  <p className="admin-modal-subtitle">
                    Prescribe medications for patients connected to your clinical practice
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} noValidate>
                <div className="admin-modal-body">
                  {createErrors.general && (
                    <div className="admin-alert admin-alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                      <AlertCircle size={16} />
                      <span>{createErrors.general}</span>
                    </div>
                  )}

                  {/* Patient Eligibility Guidance */}
                  {eligiblePatients.length === 0 && (
                    <div className="admin-info-banner" style={{ marginBottom: '1rem' }}>
                      <div className="admin-info-banner-icon">
                        <Info size={16} />
                      </div>
                      <div style={{ fontSize: '0.825rem' }}>
                        <strong>No Eligible Patients Found:</strong> Doctors can prescribe only to patients who have scheduled consultations or existing treatment with you. Patients will appear here once an appointment is created.
                      </div>
                    </div>
                  )}

                  {/* Select Patient */}
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label" htmlFor="create-rx-patient">
                      Select Patient (Checked-in & Assigned Only) *
                    </label>
                    {loadingRefData ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
                        <span>Loading checked-in patients...</span>
                      </div>
                    ) : eligiblePatients.length === 0 ? (
                      <div
                        style={{
                          padding: '0.85rem 1rem',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '8px',
                          color: '#f59e0b',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <span>
                          No active checked-in patients are currently assigned to your care. Prescriptions can only be written for patients who have checked in and have not yet checked out.
                        </span>
                      </div>
                    ) : (
                      <select
                        id="create-rx-patient"
                        className={`admin-input ${createErrors.patient ? 'admin-input-error' : ''}`}
                        value={createFormData.patient}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const foundPatient = eligiblePatients.find((p) => String(p.id) === String(selectedId));
                          setCreateFormData((prev) => ({
                            ...prev,
                            patient: selectedId,
                            appointment: foundPatient?.appointment_id || prev.appointment || null,
                          }));
                        }}
                        required
                      >
                        <option value="">-- Choose an active checked-in patient --</option>
                        {eligiblePatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || `${p.first_name} ${p.last_name}`} ({p.patient_id || p.patient_id_code}) — Checked In {p.appointment_code ? `[Apt: ${p.appointment_code}]` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {createErrors.patient && (
                      <span className="admin-form-error">{createErrors.patient}</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'block', marginTop: '0.35rem' }}>
                      Only active checked-in patients are eligible. Only one prescription can be issued per consultation; second prescriptions are strictly prevented.
                    </span>
                  </div>

                  {/* Diagnosis */}
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label" htmlFor="create-rx-diagnosis">
                      Diagnosis & Clinical Findings *
                    </label>
                    <textarea
                      id="create-rx-diagnosis"
                      className={`admin-input ${createErrors.diagnosis ? 'admin-input-error' : ''}`}
                      rows={2}
                      placeholder="e.g. Acute viral bronchitis with fever"
                      value={createFormData.diagnosis}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                      required
                    />
                    {createErrors.diagnosis && (
                      <span className="admin-form-error">{createErrors.diagnosis}</span>
                    )}
                  </div>

                  {/* Clinical Notes */}
                  <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="admin-form-label" htmlFor="create-rx-notes">
                      Physician Advice & Clinical Notes (Optional)
                    </label>
                    <textarea
                      id="create-rx-notes"
                      className="admin-input"
                      rows={2}
                      placeholder="e.g. Ensure adequate rest, plenty of warm fluids, return in 5 days if fever persists."
                      value={createFormData.clinical_notes}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, clinical_notes: e.target.value }))}
                    />
                  </div>

                  {/* Prescription Line Items */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Pill size={16} className="admin-text-teal" />
                        <span>Prescribed Medicines ({createFormData.prescription_items.length})</span>
                      </h4>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={handleAddCreateItem}
                      >
                        <Plus size={14} />
                        <span>Add Medicine</span>
                      </button>
                    </div>

                    {createErrors.items && (
                      <span className="admin-form-error" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        {createErrors.items}
                      </span>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {createFormData.prescription_items.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '1rem',
                            background: 'var(--admin-surface-secondary)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: 'var(--admin-radius-sm)',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-teal, #14b8a6)' }}>
                              Medicine #{index + 1}
                            </span>
                            {createFormData.prescription_items.length > 1 && (
                              <button
                                type="button"
                                className="admin-icon-btn admin-icon-btn-delete"
                                onClick={() => handleRemoveCreateItem(index)}
                                title="Remove medicine"
                                aria-label={`Remove medicine #${index + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label className="admin-form-label">Select Medicine *</label>
                              <select
                                className="admin-input"
                                value={item.medicine}
                                onChange={(e) => handleCreateItemChange(index, 'medicine', e.target.value)}
                                required
                              >
                                <option value="">-- Choose medicine --</option>
                                {medicinesList.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.dosage_form}, {m.strength || 'standard'}) • Stock: {m.stock_quantity}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-form-label">Dosage</label>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="e.g. 1 Tablet, 500mg"
                                value={item.dosage}
                                onChange={(e) => handleCreateItemChange(index, 'dosage', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label className="admin-form-label">Frequency</label>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="e.g. 1-0-1 (Twice daily)"
                                value={item.frequency}
                                onChange={(e) => handleCreateItemChange(index, 'frequency', e.target.value)}
                              />
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-form-label">Duration</label>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="e.g. 5 Days, 2 Weeks"
                                value={item.duration}
                                onChange={(e) => handleCreateItemChange(index, 'duration', e.target.value)}
                              />
                            </div>

                            <div className="admin-form-group" style={{ maxWidth: '120px' }}>
                              <label className="admin-form-label">Quantity *</label>
                              <input
                                type="number"
                                min={1}
                                className="admin-input"
                                value={item.quantity_prescribed}
                                onChange={(e) => handleCreateItemChange(index, 'quantity_prescribed', e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="admin-form-group" style={{ marginTop: '0.5rem' }}>
                            <label className="admin-form-label">Usage Instructions</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. Take after food with warm water"
                              value={item.instructions}
                              onChange={(e) => handleCreateItemChange(index, 'instructions', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmittingCreate || eligiblePatients.length === 0}
                  >
                    {isSubmittingCreate ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Save & Issue Prescription</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW DETAILS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isDetailsModalOpen && selectedPrescription && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsDetailsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-prescription-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="view-prescription-title" className="admin-modal-title">
                    Prescription Details
                  </h3>
                  <p className="admin-modal-subtitle">
                    {selectedPrescription.prescription_id || `#${selectedPrescription.id}`}
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
                {/* Header Banner */}
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
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Patient</span>
                    <strong style={{ display: 'block', fontSize: '1rem' }}>
                      {selectedPrescription.patient_name || 'Patient'}
                    </strong>
                  </div>
                  <div>{getStatusBadge(selectedPrescription.status)}</div>
                </div>

                {/* Meta details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <span className="admin-form-label">Date Issued</span>
                    <span className="admin-font-mono" style={{ fontSize: '0.875rem' }}>
                      {selectedPrescription.created_at
                        ? new Date(selectedPrescription.created_at).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="admin-form-label">Prescribing Doctor</span>
                    <span style={{ fontSize: '0.875rem' }}>
                      {selectedPrescription.doctor_name || 'Dr. Assigned'}
                    </span>
                  </div>
                </div>

                {/* Diagnosis */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <span className="admin-form-label">Diagnosis</span>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--admin-surface-secondary)',
                      borderRadius: 'var(--admin-radius-sm)',
                      border: '1px solid var(--admin-border)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {selectedPrescription.diagnosis || 'No diagnosis recorded'}
                  </div>
                </div>

                {/* Clinical Notes */}
                {selectedPrescription.clinical_notes && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="admin-form-label">Physician Notes</span>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--admin-surface-secondary)',
                        borderRadius: 'var(--admin-radius-sm)',
                        border: '1px solid var(--admin-border)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {selectedPrescription.clinical_notes}
                    </div>
                  </div>
                )}

                {/* Medicines List Table */}
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Pill size={16} className="admin-text-teal" />
                    <span>Prescribed Line Items</span>
                  </h4>

                  {(!selectedPrescription.items || selectedPrescription.items.length === 0) ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                      No items recorded in this prescription.
                    </p>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th>Qty</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPrescription.items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td>
                                <strong>{it.medicine_name || `Medicine #${it.medicine}`}</strong>
                                {it.instructions && (
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                                    {it.instructions}
                                  </span>
                                )}
                              </td>
                              <td>{it.dosage || '—'}</td>
                              <td>{it.frequency || '—'}</td>
                              <td>{it.duration || '—'}</td>
                              <td>{it.quantity_prescribed}</td>
                              <td>
                                {it.is_dispensed ? (
                                  <span className="admin-badge admin-badge-green">Dispensed</span>
                                ) : (
                                  <span className="admin-badge admin-badge-teal">Prescribed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal-footer">
                {selectedPrescription.status === 'PENDING' && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => handleCompletePrescription(selectedPrescription)}
                    disabled={completingId === selectedPrescription.id}
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {completingId === selectedPrescription.id ? (
                      <>
                        <Loader2 size={15} className="spinner-icon" />
                        <span>Completing Visit...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Complete Prescription & Check Out Visit</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EDIT PRESCRIPTION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsEditModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-prescription-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="edit-prescription-title" className="admin-modal-title">
                    Edit Prescription
                  </h3>
                  <p className="admin-modal-subtitle">
                    Update clinical diagnosis, instructions, or prescribed medicines
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsEditModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} noValidate>
                <div className="admin-modal-body">
                  {editErrors.general && (
                    <div className="admin-alert admin-alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                      <AlertCircle size={16} />
                      <span>{editErrors.general}</span>
                    </div>
                  )}

                  {/* Patient (Read-only on edit) */}
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label">Patient</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editFormData.patient_name}
                      disabled
                      style={{ opacity: 0.75, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Diagnosis */}
                  <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="admin-form-label" htmlFor="edit-rx-diagnosis">
                      Diagnosis & Clinical Findings *
                    </label>
                    <textarea
                      id="edit-rx-diagnosis"
                      className={`admin-input ${editErrors.diagnosis ? 'admin-input-error' : ''}`}
                      rows={2}
                      value={editFormData.diagnosis}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                      required
                    />
                    {editErrors.diagnosis && (
                      <span className="admin-form-error">{editErrors.diagnosis}</span>
                    )}
                  </div>

                  {/* Clinical Notes */}
                  <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="admin-form-label" htmlFor="edit-rx-notes">
                      Physician Advice & Clinical Notes
                    </label>
                    <textarea
                      id="edit-rx-notes"
                      className="admin-input"
                      rows={2}
                      value={editFormData.clinical_notes}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, clinical_notes: e.target.value }))}
                    />
                  </div>

                  {/* Line items */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Pill size={16} className="admin-text-teal" />
                        <span>Prescribed Medicines ({editFormData.prescription_items.length})</span>
                      </h4>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={handleAddEditItem}
                      >
                        <Plus size={14} />
                        <span>Add Medicine</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {editFormData.prescription_items.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '1rem',
                            background: 'var(--admin-surface-secondary)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: 'var(--admin-radius-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-teal, #14b8a6)' }}>
                              Medicine #{index + 1}
                            </span>
                            {editFormData.prescription_items.length > 1 && (
                              <button
                                type="button"
                                className="admin-icon-btn admin-icon-btn-delete"
                                onClick={() => handleRemoveEditItem(index)}
                                title="Remove medicine"
                                aria-label={`Remove medicine #${index + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label className="admin-form-label">Select Medicine</label>
                              <select
                                className="admin-input"
                                value={item.medicine}
                                onChange={(e) => handleEditItemChange(index, 'medicine', e.target.value)}
                              >
                                {medicinesList.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.dosage_form}, {m.strength || 'standard'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-form-label">Dosage</label>
                              <input
                                type="text"
                                className="admin-input"
                                value={item.dosage}
                                onChange={(e) => handleEditItemChange(index, 'dosage', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label className="admin-form-label">Frequency</label>
                              <input
                                type="text"
                                className="admin-input"
                                value={item.frequency}
                                onChange={(e) => handleEditItemChange(index, 'frequency', e.target.value)}
                              />
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-form-label">Duration</label>
                              <input
                                type="text"
                                className="admin-input"
                                value={item.duration}
                                onChange={(e) => handleEditItemChange(index, 'duration', e.target.value)}
                              />
                            </div>

                            <div className="admin-form-group" style={{ maxWidth: '120px' }}>
                              <label className="admin-form-label">Quantity</label>
                              <input
                                type="number"
                                min={1}
                                className="admin-input"
                                value={item.quantity_prescribed}
                                onChange={(e) => handleEditItemChange(index, 'quantity_prescribed', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="admin-form-group" style={{ marginTop: '0.5rem' }}>
                            <label className="admin-form-label">Usage Instructions</label>
                            <input
                              type="text"
                              className="admin-input"
                              value={item.instructions}
                              onChange={(e) => handleEditItemChange(index, 'instructions', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && toDelete && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsDeleteModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-prescription-title"
          >
            <div
              className="admin-modal-card admin-modal-card-danger"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px', textAlign: 'center' }}
            >
              <div className="admin-modal-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', padding: '1rem 1.25rem 0' }}>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsDeleteModalOpen(false)}
                  aria-label="Cancel deletion"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body" style={{ padding: '0 2rem 1.5rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 1.25rem auto',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '2px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <Trash2 size={28} />
                </div>

                <h3
                  id="delete-prescription-title"
                  className="admin-modal-title"
                  style={{ fontSize: '1.35rem', marginBottom: '0.6rem' }}
                >
                  Delete Prescription
                </h3>

                <p
                  style={{
                    fontSize: '0.925rem',
                    color: 'var(--admin-text-muted)',
                    lineHeight: 1.55,
                    margin: '0 auto',
                  }}
                >
                  Are you sure you want to delete prescription{' '}
                  <strong>{toDelete.prescription_id || `#${toDelete.id}`}</strong> for{' '}
                  <strong>{toDelete.patient_name || 'Patient'}</strong>?
                  This action cannot be undone.
                </p>

                {deleteError && (
                  <div
                    className="admin-alert admin-alert-danger"
                    role="alert"
                    style={{ marginTop: '1rem', textAlign: 'left' }}
                  >
                    <AlertCircle size={16} />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>

              <div
                className="admin-modal-footer"
                style={{
                  justifyContent: 'center',
                  gap: '1rem',
                  padding: '1.25rem 2rem',
                  background: 'var(--admin-surface-secondary)',
                }}
              >
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsDeleteModalOpen(false)}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={{
                    minWidth: '120px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Delete</span>
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

export default DoctorPrescriptionsPage;
