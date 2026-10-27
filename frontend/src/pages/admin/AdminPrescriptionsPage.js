import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FileText,
  Search,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  Users,
  Calendar,
  Pill,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const AdminPrescriptionsPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View Details Modal
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Delete / Cancel Modal
  const [toDelete, setToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Freeze background scrolling and make all background inactive while any modal is open
  useEffect(() => {
    const isAnyModalOpen = isDetailsModalOpen || isDeleteModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailsModalOpen, isDeleteModalOpen]);

  // Handle ESC key to dismiss any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
        if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsModalOpen, isDeleteModalOpen]);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getPrescriptions(searchQuery);
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

  useEffect(() => {
    document.title = 'Prescriptions Management — CareFlow HMS Admin';
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleOpenDetails = async (prescriptionSummary) => {
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const detailed = await adminService.getPrescriptionDetails(prescriptionSummary.id);
      setSelectedPrescription(detailed);
    } catch (err) {
      // Fallback to summary
      setSelectedPrescription(prescriptionSummary);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      await adminService.cancelPrescription(toDelete.id);
      toast.success(`Prescription ${toDelete.prescription_number || `#${toDelete.id}`} was deleted successfully.`, 'Prescription Deleted');
      setIsDeleteModalOpen(false);
      setToDelete(null);
      fetchPrescriptions();
    } catch (err) {
      let msg = 'Cannot delete this prescription record. Prescriptions that have been dispensed or linked to inventory movements are protected.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.error) msg = err.response.data.error;
      }
      setDeleteError(msg);
      toast.error(msg, 'Delete Blocked');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Hospital Prescriptions</h2>
          <p className="admin-page-subtitle">
            Review prescriptions issued by licensed doctors and monitor pharmacy items
          </p>
        </div>
      </div>

      {/* Hospital Policy Guidance Banner */}
      <div className="admin-info-banner">
        <div className="admin-info-banner-icon">
          <Pill size={18} />
        </div>
        <div>
          <strong>Clinical Prescription Policy:</strong> Medical prescriptions are authored exclusively by licensed doctors during patient consultations. Administrators have full visibility to inspect items, monitor dispensing, and cancel active records where appropriate.
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-table-controls">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by prescription ID, patient name, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchPrescriptions();
            }}
          />
        </div>
        <span className="admin-table-record-count">
          {(prescriptions || []).length} {(prescriptions || []).length === 1 ? 'Prescription' : 'Prescriptions'}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving hospital prescription records...</p>
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
              : 'There are currently no prescriptions recorded in the database.'}
          </p>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && prescriptions.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Prescription records">
            <thead>
              <tr>
                <th scope="col">Prescription ID</th>
                <th scope="col">Patient</th>
                <th scope="col">Prescribing Doctor</th>
                <th scope="col">Date Issued</th>
                <th scope="col">Medicines Prescribed</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => {
                const itemCount = rx.items ? rx.items.length : 0;
                return (
                  <tr key={rx.id}>
                    <td className="admin-font-mono admin-font-semibold">
                      {rx.prescription_number || `#${rx.id}`}
                    </td>
                    <td>
                      <div className="admin-user-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}>
                        <Users size={14} className="admin-text-teal" style={{ flexShrink: 0 }} />
                        <span className="admin-user-name">
                          {rx.patient_name || (typeof rx.patient === 'object' ? `${rx.patient.first_name} ${rx.patient.last_name}` : 'Patient')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-user-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}>
                        <UserCheck size={14} className="admin-text-navy" style={{ flexShrink: 0 }} />
                        <span className="admin-user-name">
                          {rx.doctor_name ? (rx.doctor_name.replace(/^(Dr\.?\s*)+/i, 'Dr. ')) : (typeof rx.doctor === 'object' ? `Dr. ${rx.doctor.first_name} ${rx.doctor.last_name}` : 'Doctor')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-user-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}>
                        <Calendar size={13} className="admin-text-dim" style={{ flexShrink: 0 }} />
                        <span>{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-teal" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                        <Pill size={11} style={{ flexShrink: 0 }} />
                        <span>{itemCount} {itemCount === 1 ? 'medicine' : 'medicines'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${
                        rx.status === 'DISPENSED'
                          ? 'admin-badge-green'
                          : rx.status === 'CANCELLED'
                          ? 'admin-badge-red'
                          : 'admin-badge-teal'
                      }`}>
                        {rx.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="admin-action-btn-group">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-view"
                          onClick={() => handleOpenDetails(rx)}
                          aria-label="View prescription details"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn-delete"
                          onClick={() => {
                            setToDelete(rx);
                            setDeleteError('');
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label="Delete or cancel prescription"
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
          PRESCRIPTION DETAILS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isDetailsModalOpen && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsDetailsModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-modal-title-box">
                <h3 className="admin-modal-title">Prescription Details</h3>
                <p className="admin-modal-subtitle">
                  {selectedPrescription?.prescription_number || `#${selectedPrescription?.id}`} • Issued on{' '}
                  {selectedPrescription?.created_at ? new Date(selectedPrescription.created_at).toLocaleDateString() : ''}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              {isLoadingDetails ? (
                <div className="admin-loading-card">
                  <Loader2 size={24} className="spinner-icon admin-spinner-teal" />
                  <p>Loading prescription details...</p>
                </div>
              ) : selectedPrescription ? (
                <>
                  <div className="admin-details-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Patient Name</span>
                      <span className="admin-detail-value font-semibold">
                        {selectedPrescription.patient_name || 'Patient'}
                      </span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Prescribing Doctor</span>
                      <span className="admin-detail-value font-semibold">
                        {selectedPrescription.doctor_name ? (selectedPrescription.doctor_name.startsWith('Dr.') ? selectedPrescription.doctor_name : `Dr. ${selectedPrescription.doctor_name}`) : 'Doctor'}
                      </span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Clinical Status</span>
                      <span className="admin-detail-value">
                        <span className="admin-badge admin-badge-teal">{selectedPrescription.status}</span>
                      </span>
                    </div>
                  </div>

                  {selectedPrescription.diagnosis && (
                    <div className="admin-detail-box" style={{ marginTop: '1rem' }}>
                      <span className="admin-detail-label">Diagnosis</span>
                      <p className="admin-detail-text">{selectedPrescription.diagnosis}</p>
                    </div>
                  )}

                  {selectedPrescription.notes && (
                    <div className="admin-detail-box" style={{ marginTop: '0.75rem' }}>
                      <span className="admin-detail-label">Doctor's Clinical Notes</span>
                      <p className="admin-detail-text">{selectedPrescription.notes}</p>
                    </div>
                  )}

                  {/* Medicines Table */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <h4 className="admin-form-subheading" style={{ marginBottom: '0.75rem' }}>
                      Prescribed Medicines ({selectedPrescription.items?.length || 0})
                    </h4>
                    {(!selectedPrescription.items || selectedPrescription.items.length === 0) ? (
                      <p className="admin-text-dim">No individual medicines listed.</p>
                    ) : (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th>Qty</th>
                              <th>Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrescription.items.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td className="font-semibold">
                                  {item.medicine_name || `Medicine #${item.medicine}`}
                                </td>
                                <td>{item.dosage || '—'}</td>
                                <td>{item.frequency || '—'}</td>
                                <td>{item.duration_days ? `${item.duration_days} days` : '—'}</td>
                                <td className="admin-font-mono">{item.quantity_prescribed || '—'}</td>
                                <td>{item.instructions || 'As directed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="admin-modal-footer">
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
          DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && toDelete && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-modal-card-danger" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title text-danger">Cancel / Delete Prescription</h3>
                  <p className="admin-modal-subtitle">
                    Prescription {toDelete?.prescription_number || `#${toDelete?.id}`}
                  </p>
                </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-danger-warning-box">
                <ShieldAlert size={28} className="text-danger" />
                <div>
                  <p>
                    Are you sure you want to remove this prescription record?
                  </p>
                  <p className="font-semibold" style={{ marginTop: '0.25rem' }}>
                    Prescription for: {toDelete.patient_name || 'Patient'} by{' '}
                    {toDelete.doctor_name ? (toDelete.doctor_name.startsWith('Dr.') ? toDelete.doctor_name : `Dr. ${toDelete.doctor_name}`) : 'Doctor'}
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="admin-alert admin-alert-error" role="alert" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={18} />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="admin-security-note" style={{ marginTop: '1rem' }}>
                Note: Prescriptions that have already been dispensed by the pharmacy or locked for clinical audit cannot be deleted.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Keep Record
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Deletion</span>
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

export default AdminPrescriptionsPage;
