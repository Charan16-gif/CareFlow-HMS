import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  FileText,
  Search,
  Pill,
  AlertCircle,
  Loader2,
  Eye,
  History,
  X,
} from 'lucide-react';

const PatientPrescriptionsPage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Prescription Details Modal State
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getPrescriptions(searchQuery);
      setPrescriptions(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      let msg = 'Failed to load your prescriptions. Please try again.';
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
    document.title = 'My Prescriptions — CareFlow Patient Portal';
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleOpenDetails = async (prescription) => {
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await patientService.getPrescriptionDetails(prescription.id);
      setSelectedPrescription(detailed);
    } catch (err) {
      setSelectedPrescription(prescription);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Separate active vs historical
  const activePrescriptions = prescriptions.filter(
    (rx) => rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED'
  );
  const historicalPrescriptions = prescriptions.filter(
    (rx) => rx.status === 'DISPENSED' || rx.status === 'CANCELLED'
  );

  const currentList = activeTab === 'active' ? activePrescriptions : historicalPrescriptions;

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
            Pending Dispensation
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
      case 'DISPENSED':
        return <span className="admin-badge admin-badge-teal">Fully Dispensed</span>;
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
          <h2 className="admin-page-title">My Prescriptions</h2>
          <p className="admin-page-subtitle">
            Doctor-issued clinical prescriptions, prescribed tablet regimens, and dispensation logs
          </p>
        </div>
        <Link to="/patient/medicines" className="admin-btn admin-btn-primary">
          <Pill size={16} />
          <span>Browse Pharmacy Medicines</span>
        </Link>
      </div>

      {/* Search and Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <FileText size={16} />
            <span>Active Prescriptions ({activePrescriptions.length})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Prescription History ({historicalPrescriptions.length})</span>
          </button>
        </div>

        <div className="admin-search-wrapper" style={{ minWidth: '280px', maxWidth: '380px' }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search diagnosis or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Retrieving your prescriptions...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Prescriptions</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchPrescriptions}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Prescriptions Content */}
      {!loading && !error && (
        <>
          {currentList.length === 0 ? (
            <div className="admin-table-empty">
              <div className="admin-empty-icon-box">
                <FileText size={32} />
              </div>
              <h4>
                {activeTab === 'active'
                  ? 'No Active Prescriptions'
                  : 'No Prescription History Found'}
              </h4>
              <p>
                {activeTab === 'active'
                  ? 'You currently have no active doctor prescriptions awaiting dispensation. When your doctor issues medications, they will appear here.'
                  : 'Past and completed prescriptions will be archived in this section for your medical history records.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {currentList.map((rx) => (
                <div
                  key={rx.id}
                  style={{
                    background: 'var(--admin-card-bg)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 'var(--admin-radius-md)',
                    padding: '1.5rem',
                    boxShadow: 'var(--admin-shadow-sm)',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Prescription Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      borderBottom: '1px solid var(--admin-border-subtle)',
                      paddingBottom: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          className="admin-font-mono"
                          style={{
                            fontWeight: 700,
                            color: 'var(--primary-cyan, #06b6d4)',
                            fontSize: '1.05rem',
                          }}
                        >
                          {rx.prescription_id}
                        </span>
                        {getStatusBadge(rx.status)}
                      </div>
                      <h4
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: 'var(--admin-heading-color)',
                          margin: '0.35rem 0 0.15rem',
                        }}
                      >
                        {rx.doctor_name ? (rx.doctor_name.startsWith('Dr.') ? rx.doctor_name : `Dr. ${rx.doctor_name}`) : 'Doctor'}
                      </h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                        {rx.doctor_specialization || rx.doctor_department || 'General Practice'} • Issued on {rx.created_at?.slice(0, 10)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline admin-btn-sm"
                        onClick={() => handleOpenDetails(rx)}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                      {activeTab === 'active' && (
                        <Link
                          to="/patient/medicines"
                          className="admin-btn admin-btn-primary admin-btn-sm"
                        >
                          <Pill size={14} />
                          <span>Order Medicines</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {rx.diagnosis && (
                    <div
                      style={{
                        background: 'var(--admin-surface-secondary)',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--admin-radius-sm)',
                        marginBottom: '1rem',
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
                        Clinical Diagnosis & Notes
                      </span>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>
                        {rx.diagnosis}
                      </p>
                    </div>
                  )}

                  {/* Medicines Table */}
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Medicine Name</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Prescribed</th>
                          <th>Dispensed</th>
                          <th>Instructions</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rx.items || []).map((item, idx) => {
                          const remainingQty = item.quantity_prescribed - item.quantity_dispensed;
                          return (
                            <tr key={item.id || idx}>
                              <td className="font-semibold">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Pill size={15} color="var(--primary-cyan, #06b6d4)" />
                                  <span>{item.medicine_name} {item.medicine_strength || ''}</span>
                                </div>
                              </td>
                              <td>{item.dosage || '—'}</td>
                              <td>{item.frequency || '—'}</td>
                              <td>{item.duration || '—'}</td>
                              <td className="admin-font-mono font-semibold">
                                {item.quantity_prescribed}
                              </td>
                              <td className="admin-font-mono">
                                {item.quantity_dispensed}
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>
                                {item.instructions || 'As directed by physician'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {remainingQty > 0 && rx.status !== 'CANCELLED' ? (
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-primary admin-btn-xs"
                                    onClick={() =>
                                      navigate(
                                        `/patient/medicines?medicine=${item.medicine}&rx=${rx.id}`
                                      )
                                    }
                                  >
                                    <span>Order ({remainingQty} left)</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                    Dispensed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PRESCRIPTION DETAILS MODAL (Mounted via ModalPortal)
      ───────────────────────────────────────────────────────────── */}
      {isDetailsModalOpen && selectedPrescription && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsDetailsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rx-details-modal-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '680px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="rx-details-modal-title" className="admin-modal-title">
                    Prescription #{selectedPrescription.prescription_id}
                  </h3>
                  <p className="admin-modal-subtitle">
                    Issued by {selectedPrescription.doctor_name ? `Dr. ${selectedPrescription.doctor_name}` : 'Attending Physician'}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
                    <p style={{ marginTop: '0.5rem' }}>Loading prescription records...</p>
                  </div>
                ) : (
                  <>
                    <div className="admin-details-grid">
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Prescription ID</span>
                        <span className="admin-detail-value admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                          {selectedPrescription.prescription_id}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Prescribing Doctor</span>
                        <span className="admin-detail-value font-semibold">
                          {selectedPrescription.doctor_name ? `Dr. ${selectedPrescription.doctor_name}` : 'Physician'}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Date Issued</span>
                        <span className="admin-detail-value font-semibold">
                          {selectedPrescription.created_at?.slice(0, 10)}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Dispensation Status</span>
                        <span className="admin-detail-value">
                          {getStatusBadge(selectedPrescription.status)}
                        </span>
                      </div>
                    </div>

                    {selectedPrescription.diagnosis && (
                      <div style={{ marginTop: '1rem', background: 'var(--admin-surface-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          Clinical Diagnosis
                        </span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>
                          {selectedPrescription.diagnosis}
                        </p>
                      </div>
                    )}

                    {selectedPrescription.clinical_notes && (
                      <div style={{ marginTop: '0.75rem', background: 'var(--admin-surface-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          Physician's Instructions for Patient Care
                        </span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>
                          {selectedPrescription.clinical_notes}
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: '1.25rem' }}>
                      <h4 className="admin-form-subheading" style={{ marginBottom: '0.75rem' }}>
                        Prescribed Medication Regimen ({selectedPrescription.items?.length || 0})
                      </h4>
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
                            {(selectedPrescription.items || []).map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td className="font-semibold">
                                  {item.medicine_name} {item.medicine_strength || ''}
                                </td>
                                <td>{item.dosage || '—'}</td>
                                <td>{item.frequency || '—'}</td>
                                <td>{item.duration || '—'}</td>
                                <td className="admin-font-mono font-semibold">
                                  {item.quantity_prescribed}
                                </td>
                                <td>{item.instructions || 'As directed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
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
                {selectedPrescription && (selectedPrescription.status === 'PENDING' || selectedPrescription.status === 'PARTIALLY_DISPENSED') && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      navigate(`/patient/medicines?rx=${selectedPrescription.id}`);
                    }}
                  >
                    <Pill size={15} />
                    <span>Order All from Pharmacy</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PatientPrescriptionsPage;
