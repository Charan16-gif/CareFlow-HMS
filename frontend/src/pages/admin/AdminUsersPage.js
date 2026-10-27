import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Users,
  UserCheck,
  FlaskConical,
  Pill,
  ClipboardList,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ROLE_TABS = [
  { id: 'patients', label: 'Patients', icon: Users, roleParam: 'patients' },
  { id: 'doctors', label: 'Doctors', icon: UserCheck, roleParam: 'doctors' },
  { id: 'lab_staff', label: 'Lab Staff', icon: FlaskConical, roleParam: 'LAB_STAFF' },
  { id: 'pharmacists', label: 'Pharmacists', icon: Pill, roleParam: 'PHARMACIST' },
  { id: 'receptionists', label: 'Receptionists', icon: ClipboardList, roleParam: 'RECEPTIONIST' },
];

const INITIAL_PATIENT_FORM = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'MALE',
  blood_group: 'O+',
  phone: '',
  phone_number: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  username: '',
  password: '',
};

const INITIAL_DOCTOR_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  specialization: 'General Medicine',
  license_number: '',
  phone: '',
  consultation_fee: '500.00',
};

const INITIAL_STAFF_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  role: 'LAB_STAFF',
  department: '',
  phone: '',
  qualification: '',
  shift: 'MORNING',
};

const AdminUsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'patients';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addRole, setAddRole] = useState(
    initialTab === 'patients'
      ? 'PATIENT'
      : initialTab === 'doctors'
        ? 'DOCTOR'
        : initialTab === 'lab_staff'
          ? 'LAB_STAFF'
          : initialTab === 'pharmacists'
            ? 'PHARMACIST'
            : 'RECEPTIONIST'
  );

  const [patientForm, setPatientForm] = useState(INITIAL_PATIENT_FORM);
  const [doctorForm, setDoctorForm] = useState(INITIAL_DOCTOR_FORM);
  const [staffForm, setStaffForm] = useState(INITIAL_STAFF_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / Edit Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Freeze background scrolling and make all background inactive while any modal is open
  useEffect(() => {
    const isAnyModalOpen = isAddModalOpen || isViewModalOpen || isEditModalOpen || isDeleteModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddModalOpen, isViewModalOpen, isEditModalOpen, isDeleteModalOpen]);

  // Handle ESC key to dismiss any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isViewModalOpen) setIsViewModalOpen(false);
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isViewModalOpen, isEditModalOpen, isDeleteModalOpen]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = [];
      if (activeTab === 'patients') {
        const rawPatients = await adminService.getPatients(searchQuery);
        data = rawPatients.filter((p) => {
          const pid = String(p.patient_id || '').toUpperCase();
          const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
          return !(pid === 'CF-WALKIN' || name.includes('walk-in') || name.includes('walkin'));
        });
      } else if (activeTab === 'doctors') {
        data = await adminService.getDoctors(searchQuery);
      } else if (activeTab === 'lab_staff') {
        data = await adminService.getStaff('LAB_STAFF', searchQuery);
      } else if (activeTab === 'pharmacists') {
        data = await adminService.getStaff('PHARMACIST', searchQuery);
      } else if (activeTab === 'receptionists') {
        data = await adminService.getStaff('RECEPTIONIST', searchQuery);
      }
      setUsersList(data);
      setCounts((prev) => ({ ...prev, [activeTab]: data.length }));
    } catch (err) {
      let msg = 'Failed to load user records. Please try again.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    document.title = 'User Management — CareFlow HMS Admin';
    fetchUsers();
  }, [fetchUsers]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setSearchQuery('');
    if (tabId === 'patients') setAddRole('PATIENT');
    else if (tabId === 'doctors') setAddRole('DOCTOR');
    else if (tabId === 'lab_staff') setAddRole('LAB_STAFF');
    else if (tabId === 'pharmacists') setAddRole('PHARMACIST');
    else if (tabId === 'receptionists') setAddRole('RECEPTIONIST');
  };

  // Open Add User modal with appropriate preset role
  const handleOpenAddModal = () => {
    setFormErrors({});
    setShowModalPassword(false);
    setPatientForm(INITIAL_PATIENT_FORM);
    setDoctorForm(INITIAL_DOCTOR_FORM);
    setStaffForm({
      ...INITIAL_STAFF_FORM,
      role:
        activeTab === 'lab_staff'
          ? 'LAB_STAFF'
          : activeTab === 'pharmacists'
            ? 'PHARMACIST'
            : activeTab === 'receptionists'
              ? 'RECEPTIONIST'
              : 'LAB_STAFF',
    });
    setIsAddModalOpen(true);
  };

  // Validate and submit Add User
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);
    const errors = {};

    try {
      if (addRole === 'PATIENT') {
        const phone = (patientForm.phone || patientForm.phone_number || '').trim();
        if (!patientForm.first_name.trim()) errors.first_name = 'First name is required.';
        if (!patientForm.last_name.trim()) errors.last_name = 'Last name is required.';
        if (!patientForm.date_of_birth) errors.date_of_birth = 'Date of birth is required.';
        if (!phone) errors.phone = 'Phone number is required.';
        if (!patientForm.email.trim()) errors.email = 'Email address is required.';
        if (patientForm.password && patientForm.password.length < 8) {
          errors.password = 'Password must be at least 8 characters if provided.';
        }

        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setIsSubmitting(false);
          return;
        }

        const payload = {
          ...patientForm,
          phone: phone,
          phone_number: phone,
          blood_group: patientForm.blood_group || 'O+',
        };

        await adminService.createPatient(payload);
      } else if (addRole === 'DOCTOR') {
        const phone = (doctorForm.phone || doctorForm.phone_number || '').trim();
        if (!doctorForm.first_name.trim()) errors.first_name = 'First name is required.';
        if (!doctorForm.last_name.trim()) errors.last_name = 'Last name is required.';
        if (!doctorForm.email.trim()) errors.email = 'Email address is required.';
        if (!doctorForm.username.trim()) errors.username = 'Username is required.';
        if (!doctorForm.password || doctorForm.password.length < 8) {
          errors.password = 'Password must be at least 8 characters.';
        }
        if (!doctorForm.specialization.trim()) errors.specialization = 'Specialization is required.';
        if (!doctorForm.license_number.trim()) errors.license_number = 'Medical license number is required.';
        if (!phone) errors.phone = 'Phone number is required.';

        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setIsSubmitting(false);
          return;
        }

        const payload = {
          ...doctorForm,
          phone: phone,
          phone_number: phone,
          qualification: doctorForm.qualification || 'MBBS',
          department: doctorForm.department || doctorForm.specialization || 'General Medicine',
          consultation_fee: doctorForm.consultation_fee || '500.00',
        };

        await adminService.createDoctor(payload);
      } else {
        // Staff profiles (LAB_STAFF, PHARMACIST, RECEPTIONIST)
        const phone = (staffForm.phone || staffForm.phone_number || '').trim();
        if (!staffForm.first_name.trim()) errors.first_name = 'First name is required.';
        if (!staffForm.last_name.trim()) errors.last_name = 'Last name is required.';
        if (!staffForm.email.trim()) errors.email = 'Email address is required.';
        if (!staffForm.username.trim()) errors.username = 'Username is required.';
        if (!staffForm.password || staffForm.password.length < 8) {
          errors.password = 'Password must be at least 8 characters.';
        }
        if (!phone) errors.phone = 'Phone number is required.';

        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setIsSubmitting(false);
          return;
        }

        const payload = {
          ...staffForm,
          role: addRole,
          phone: phone,
          phone_number: phone,
          department: staffForm.department || (addRole === 'LAB_STAFF' ? 'Pathology' : addRole === 'PHARMACIST' ? 'Dispensary' : 'Front Desk'),
        };
        await adminService.createStaff(payload);
        const roleLabel = addRole === 'LAB_STAFF' ? 'Lab Staff' : addRole === 'PHARMACIST' ? 'Pharmacist' : 'Receptionist';
        const msg = `${roleLabel} ${staffForm.first_name} ${staffForm.last_name} created successfully! Portal login credentials sent to ${staffForm.email}.`;
        toast.success(msg, 'User Created');
      }

      if (addRole === 'PATIENT') {
        toast.success(`Patient ${patientForm.first_name} ${patientForm.last_name} created successfully! Welcome credentials dispatched to ${patientForm.email}.`, 'Patient Created');
      } else if (addRole === 'DOCTOR') {
        toast.success(`Doctor Dr. ${doctorForm.first_name} ${doctorForm.last_name} created successfully! Credentials emailed to ${doctorForm.email}.`, 'Doctor Created');
      }

      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      const backendErrors = {};
      if (err.response && err.response.data) {
        const d = err.response.data;
        if (typeof d === 'object') {
          Object.keys(d).forEach((key) => {
            const msg = Array.isArray(d[key]) ? d[key].join(' ') : String(d[key]);
            backendErrors[key] = msg;
            if (key === 'phone_number') {
              backendErrors.phone = msg;
            }
          });
          if (!backendErrors.general) {
            backendErrors.general = Object.values(backendErrors)[0] || 'Please review the highlighted inputs.';
          }
        } else {
          backendErrors.general = typeof d === 'string' ? d : 'Failed to create user. Please check your inputs.';
        }
      } else {
        backendErrors.general = 'Unable to connect to server. Please try again.';
      }
      toast.error(backendErrors.general, 'User Creation Failed');
      setFormErrors(backendErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit User modal
  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      ...user,
      is_available: user.is_available !== undefined ? user.is_available : (user.status === 'ACTIVE'),
      is_active: user.is_active !== undefined ? user.is_active : (user.status === 'ACTIVE'),
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Submit Edit User
  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setFormErrors({});

    try {
      const phone = (editFormData.phone_number || editFormData.phone || '').trim();

      if (activeTab === 'patients') {
        const payload = {
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          phone: phone,
          phone_number: phone,
          email: editFormData.email,
          address: editFormData.address,
          emergency_contact_name: editFormData.emergency_contact_name,
          emergency_contact_phone: editFormData.emergency_contact_phone,
          is_active: editFormData.is_active,
        };
        await adminService.updatePatient(selectedUser.id, payload);
      } else if (activeTab === 'doctors') {
        const payload = {
          specialization: editFormData.specialization,
          license_number: editFormData.license_number,
          phone: phone,
          phone_number: phone,
          consultation_fee: editFormData.consultation_fee,
          is_available: editFormData.is_available,
          status: editFormData.is_available ? 'ACTIVE' : 'INACTIVE',
        };
        await adminService.updateDoctor(selectedUser.id, payload);
      } else {
        const payload = {
          department: editFormData.department,
          phone: phone,
          phone_number: phone,
          qualification: editFormData.qualification,
          shift: editFormData.shift,
          is_active: editFormData.is_active,
          status: editFormData.is_active ? 'ACTIVE' : 'INACTIVE',
        };
        await adminService.updateStaff(selectedUser.id, payload);
      }

      toast.success('User details updated successfully!', 'User Updated');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      const backendErrors = {};
      if (err.response && err.response.data) {
        const d = err.response.data;
        if (typeof d === 'object') {
          Object.keys(d).forEach((key) => {
            backendErrors[key] = Array.isArray(d[key]) ? d[key].join(' ') : String(d[key]);
          });
        } else {
          backendErrors.general = 'Failed to update user details.';
        }
      } else {
        backendErrors.general = 'Unable to connect to server.';
      }
      toast.error(backendErrors.general || 'Failed to update user details.', 'Update Failed');
      setFormErrors(backendErrors);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      if (activeTab === 'patients') {
        await adminService.deletePatient(userToDelete.id);
      } else if (activeTab === 'doctors') {
        await adminService.deleteDoctor(userToDelete.id);
      } else {
        await adminService.deleteStaff(userToDelete.id);
      }

      const msg = 'User record successfully removed / deactivated.';
      toast.info(msg, 'User Removed');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      let explanation = 'Cannot delete this user because clinical or operational history (such as appointments, prescriptions, lab results, or billing records) is attached to their account.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          explanation = err.response.data.detail;
        } else if (err.response.data.error) {
          explanation = err.response.data.error;
        }
      }
      toast.error(explanation, 'Deactivation Notice');
      setDeleteError(explanation);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">User Management</h2>
          <p className="admin-page-subtitle">
            Manage hospital staff, clinical practitioners, and patient records
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleOpenAddModal}
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* 5 Role Tabs */}
      <div className="admin-tabs-row" role="tablist" aria-label="Hospital User Roles">
        {ROLE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`admin-tab-btn ${isActive ? 'admin-tab-btn-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {counts[tab.id] !== undefined && (
                <span className="admin-tab-count">{counts[tab.id]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar & Refresh */}
      <div className="admin-table-controls">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder={`Search ${ROLE_TABS.find((t) => t.id === activeTab)?.label}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchUsers();
            }}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={32} className="spinner-icon admin-spinner-teal" />
          <p>Loading {ROLE_TABS.find((t) => t.id === activeTab)?.label} records...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={28} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Records</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={fetchUsers}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && usersList.length === 0 && (
        <div className="admin-empty-table-card">
          <div className="admin-empty-icon-box">
            <Users size={32} />
          </div>
          <h3>No {ROLE_TABS.find((t) => t.id === activeTab)?.label} Found</h3>
          <p>
            {searchQuery
              ? `No matching records found for "${searchQuery}". Try a different search term.`
              : `There are currently no ${ROLE_TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} in the database.`}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleOpenAddModal}
          >
            <UserPlus size={16} />
            <span>Add First {ROLE_TABS.find((t) => t.id === activeTab)?.label.slice(0, -1)}</span>
          </button>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && usersList.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table" aria-label={`${activeTab} directory`}>
            <thead>
              <tr>
                {activeTab === 'patients' ? (
                  <>
                    <th scope="col">Patient ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Gender / DOB</th>
                    <th scope="col">Blood Group</th>
                    <th scope="col">Phone / Email</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </>
                ) : activeTab === 'doctors' ? (
                  <>
                    <th scope="col">Employee ID</th>
                    <th scope="col">Doctor Name</th>
                    <th scope="col">Specialization</th>
                    <th scope="col">License #</th>
                    <th scope="col">Consultation Fee</th>
                    <th scope="col">Availability</th>
                    <th scope="col" className="text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th scope="col">Employee ID</th>
                    <th scope="col">Staff Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Department</th>
                    <th scope="col">Phone / Shift</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {usersList.map((item) => (
                <tr key={item.id}>
                  {activeTab === 'patients' ? (
                    <>
                      <td className="admin-font-mono admin-font-semibold">
                        {item.patient_id || `#${item.id}`}
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-name">
                            {item.first_name} {item.last_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-slate">
                          {item.gender} • {item.date_of_birth}
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-red">
                          {item.blood_group?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-contact-cell">
                          <span>{item.phone}</span>
                          <span className="admin-text-dim">{item.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${item.is_active ? 'admin-badge-green' : 'admin-badge-gray'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </>
                  ) : activeTab === 'doctors' ? (
                    <>
                      <td className="admin-font-mono admin-font-semibold">
                        {item.doctor_id || item.employee_id || `#${item.id}`}
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-name">
                            Dr. {item.first_name} {item.last_name}
                          </span>
                          <span className="admin-text-dim">
                            @{item.user?.username || 'doctor'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-teal">
                          {item.specialization}
                        </span>
                      </td>
                      <td className="admin-font-mono">{item.license_number}</td>
                      <td className="admin-font-semibold">
                        ₹{parseFloat(item.consultation_fee || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`admin-badge ${(item.is_available !== undefined ? item.is_available : (item.status === 'ACTIVE')) ? 'admin-badge-green' : 'admin-badge-amber'}`}>
                          {(item.is_available !== undefined ? item.is_available : (item.status === 'ACTIVE')) ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="admin-font-mono admin-font-semibold">
                        {item.staff_id || item.employee_id || `#${item.id}`}
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-name">
                            {item.first_name} {item.last_name}
                          </span>
                          <span className="admin-text-dim">
                            @{item.user?.username || 'staff'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-teal">
                          {item.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{item.department || 'General'}</td>
                      <td>
                        <div className="admin-contact-cell">
                          <span>{item.phone || item.phone_number || 'N/A'}</span>
                          <span className="admin-text-dim">Shift: {item.shift || 'General Shift'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${(item.is_active !== undefined ? item.is_active : (item.status === 'ACTIVE')) ? 'admin-badge-green' : 'admin-badge-gray'}`}>
                          {(item.is_active !== undefined ? item.is_active : (item.status === 'ACTIVE')) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </>
                  )}

                  <td className="text-right">
                    <div className="admin-action-btn-group">
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn-view"
                        onClick={() => {
                          setSelectedUser(item);
                          setIsViewModalOpen(true);
                        }}
                        aria-label="View user profile details"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn-edit"
                        onClick={() => handleOpenEditModal(item)}
                        aria-label="Edit user information"
                        title="Edit User"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn-delete"
                        onClick={() => {
                          setUserToDelete(item);
                          setDeleteError('');
                          setIsDeleteModalOpen(true);
                        }}
                        aria-label="Delete user"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADD USER MODAL (All 5 Roles Supported — ADMIN Strictly Barred)
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsAddModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-modal-card-lg" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title">Add Hospital User</h3>
                  <p className="admin-modal-subtitle">
                    Create a new authorized patient or healthcare staff member
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} noValidate>
                <div className="admin-modal-body">
                  {formErrors.general && (
                    <div className="admin-alert admin-alert-error" role="alert">
                      <AlertCircle size={18} />
                      <span>{formErrors.general}</span>
                    </div>
                  )}

                  {/* Role Selector — Strictly Barring Admin */}
                  <div className="admin-form-group">
                    <label htmlFor="add-role-select" className="admin-form-label">
                      Select User Role <span className="admin-required">*</span>
                    </label>
                    <select
                      id="add-role-select"
                      className="admin-form-select"
                      value={addRole}
                      onChange={(e) => {
                        setAddRole(e.target.value);
                        setFormErrors({});
                      }}
                    >
                      <option value="PATIENT">Patient</option>
                      <option value="DOCTOR">Doctor</option>
                      <option value="LAB_STAFF">Laboratory Staff</option>
                      <option value="PHARMACIST">Pharmacist</option>
                      <option value="RECEPTIONIST">Receptionist</option>
                    </select>
                    <span className="admin-input-help">
                      Administrator accounts cannot be created or modified from this directory.
                    </span>
                  </div>

                  {/* PATIENT FORM FIELDS */}
                  {addRole === 'PATIENT' && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">First Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.first_name ? 'admin-input-error' : ''}`}
                            value={patientForm.first_name}
                            onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                            required
                          />
                          {formErrors.first_name && <p className="admin-field-error">{formErrors.first_name}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Last Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.last_name ? 'admin-input-error' : ''}`}
                            value={patientForm.last_name}
                            onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                            required
                          />
                          {formErrors.last_name && <p className="admin-field-error">{formErrors.last_name}</p>}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Date of Birth *</label>
                          <input
                            type="date"
                            className={`admin-form-input ${formErrors.date_of_birth ? 'admin-input-error' : ''}`}
                            value={patientForm.date_of_birth}
                            onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                            required
                          />
                          {formErrors.date_of_birth && <p className="admin-field-error">{formErrors.date_of_birth}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Gender</label>
                          <select
                            className="admin-form-select"
                            value={patientForm.gender}
                            onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Blood Group</label>
                          <select
                            className="admin-form-select"
                            value={patientForm.blood_group}
                            onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                          >
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

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone Number *</label>
                          <input
                            type="tel"
                            className={`admin-form-input ${formErrors.phone || formErrors.phone_number ? 'admin-input-error' : ''}`}
                            value={patientForm.phone}
                            onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                            required
                          />
                          {(formErrors.phone || formErrors.phone_number) && (
                            <p className="admin-field-error">{formErrors.phone || formErrors.phone_number}</p>
                          )}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Email Address *</label>
                          <input
                            type="email"
                            className={`admin-form-input ${formErrors.email ? 'admin-input-error' : ''}`}
                            value={patientForm.email}
                            onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                            required
                          />
                          {formErrors.email && <p className="admin-field-error">{formErrors.email}</p>}
                        </div>
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Residential Address</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={patientForm.address}
                          onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                          placeholder="Street, City, Pin"
                        />
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Emergency Contact Name</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={patientForm.emergency_contact_name}
                            onChange={(e) => setPatientForm({ ...patientForm, emergency_contact_name: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            className="admin-form-input"
                            value={patientForm.emergency_contact_phone}
                            onChange={(e) => setPatientForm({ ...patientForm, emergency_contact_phone: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Optional Portal Account Credentials */}
                      <div className="admin-form-subheading">
                        <span>Optional Patient Portal Login Credentials</span>
                      </div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Portal Username</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={patientForm.username}
                            placeholder="Leave blank to use email"
                            onChange={(e) => setPatientForm({ ...patientForm, username: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Portal Password</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <input
                              type={showModalPassword ? 'text' : 'password'}
                              className={`admin-form-input ${formErrors.password ? 'admin-input-error' : ''}`}
                              style={{ paddingRight: '2.5rem' }}
                              value={patientForm.password}
                              placeholder="Min 8 characters"
                              onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setShowModalPassword(!showModalPassword)}
                              aria-label={showModalPassword ? 'Hide password' : 'Show password'}
                              style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted, #64748b)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.25rem',
                              }}
                            >
                              {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {formErrors.password && <p className="admin-field-error">{formErrors.password}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* DOCTOR FORM FIELDS */}
                  {addRole === 'DOCTOR' && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">First Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.first_name ? 'admin-input-error' : ''}`}
                            value={doctorForm.first_name}
                            onChange={(e) => setDoctorForm({ ...doctorForm, first_name: e.target.value })}
                            required
                          />
                          {formErrors.first_name && <p className="admin-field-error">{formErrors.first_name}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Last Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.last_name ? 'admin-input-error' : ''}`}
                            value={doctorForm.last_name}
                            onChange={(e) => setDoctorForm({ ...doctorForm, last_name: e.target.value })}
                            required
                          />
                          {formErrors.last_name && <p className="admin-field-error">{formErrors.last_name}</p>}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Username *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.username ? 'admin-input-error' : ''}`}
                            value={doctorForm.username}
                            onChange={(e) => setDoctorForm({ ...doctorForm, username: e.target.value })}
                            required
                          />
                          {formErrors.username && <p className="admin-field-error">{formErrors.username}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Password *</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <input
                              type={showModalPassword ? 'text' : 'password'}
                              className={`admin-form-input ${formErrors.password ? 'admin-input-error' : ''}`}
                              style={{ paddingRight: '2.5rem' }}
                              value={doctorForm.password}
                              placeholder="Min 8 characters"
                              onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowModalPassword(!showModalPassword)}
                              aria-label={showModalPassword ? 'Hide password' : 'Show password'}
                              style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted, #64748b)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.25rem',
                              }}
                            >
                              {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {formErrors.password && <p className="admin-field-error">{formErrors.password}</p>}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Email *</label>
                          <input
                            type="email"
                            className={`admin-form-input ${formErrors.email ? 'admin-input-error' : ''}`}
                            value={doctorForm.email}
                            onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                            required
                          />
                          {formErrors.email && <p className="admin-field-error">{formErrors.email}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone *</label>
                          <input
                            type="tel"
                            className={`admin-form-input ${formErrors.phone || formErrors.phone_number ? 'admin-input-error' : ''}`}
                            value={doctorForm.phone}
                            onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                            required
                          />
                          {(formErrors.phone || formErrors.phone_number) && (
                            <p className="admin-field-error">{formErrors.phone || formErrors.phone_number}</p>
                          )}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Specialization *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.specialization ? 'admin-input-error' : ''}`}
                            value={doctorForm.specialization}
                            onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                            required
                          />
                          {formErrors.specialization && <p className="admin-field-error">{formErrors.specialization}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">License Number *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.license_number ? 'admin-input-error' : ''}`}
                            value={doctorForm.license_number}
                            onChange={(e) => setDoctorForm({ ...doctorForm, license_number: e.target.value })}
                            required
                          />
                          {formErrors.license_number && <p className="admin-field-error">{formErrors.license_number}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Consultation Fee (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="admin-form-input"
                            value={doctorForm.consultation_fee}
                            onChange={(e) => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* STAFF FORM FIELDS (LAB_STAFF, PHARMACIST, RECEPTIONIST) */}
                  {['LAB_STAFF', 'PHARMACIST', 'RECEPTIONIST'].includes(addRole) && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">First Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.first_name ? 'admin-input-error' : ''}`}
                            value={staffForm.first_name}
                            onChange={(e) => setStaffForm({ ...staffForm, first_name: e.target.value })}
                            required
                          />
                          {formErrors.first_name && <p className="admin-field-error">{formErrors.first_name}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Last Name *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.last_name ? 'admin-input-error' : ''}`}
                            value={staffForm.last_name}
                            onChange={(e) => setStaffForm({ ...staffForm, last_name: e.target.value })}
                            required
                          />
                          {formErrors.last_name && <p className="admin-field-error">{formErrors.last_name}</p>}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Username *</label>
                          <input
                            type="text"
                            className={`admin-form-input ${formErrors.username ? 'admin-input-error' : ''}`}
                            value={staffForm.username}
                            onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                            required
                          />
                          {formErrors.username && <p className="admin-field-error">{formErrors.username}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Password *</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <input
                              type={showModalPassword ? 'text' : 'password'}
                              className={`admin-form-input ${formErrors.password ? 'admin-input-error' : ''}`}
                              style={{ paddingRight: '2.5rem' }}
                              value={staffForm.password}
                              placeholder="Min 8 characters"
                              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowModalPassword(!showModalPassword)}
                              aria-label={showModalPassword ? 'Hide password' : 'Show password'}
                              style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted, #64748b)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.25rem',
                              }}
                            >
                              {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {formErrors.password && <p className="admin-field-error">{formErrors.password}</p>}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Email *</label>
                          <input
                            type="email"
                            className={`admin-form-input ${formErrors.email ? 'admin-input-error' : ''}`}
                            value={staffForm.email}
                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                            required
                          />
                          {formErrors.email && <p className="admin-field-error">{formErrors.email}</p>}
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone *</label>
                          <input
                            type="tel"
                            className={`admin-form-input ${formErrors.phone || formErrors.phone_number ? 'admin-input-error' : ''}`}
                            value={staffForm.phone}
                            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                            required
                          />
                          {(formErrors.phone || formErrors.phone_number) && (
                            <p className="admin-field-error">{formErrors.phone || formErrors.phone_number}</p>
                          )}
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Department</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={staffForm.department}
                            placeholder={addRole === 'LAB_STAFF' ? 'Pathology' : addRole === 'PHARMACIST' ? 'Dispensary' : 'Reception'}
                            onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Qualification</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={staffForm.qualification}
                            placeholder="e.g. B.Pharm, DMLT"
                            onChange={(e) => setStaffForm({ ...staffForm, qualification: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Shift</label>
                          <select
                            className="admin-form-select"
                            value={staffForm.shift}
                            onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                          >
                            <option value="MORNING">Morning Shift</option>
                            <option value="EVENING">Evening Shift</option>
                            <option value="NIGHT">Night Shift</option>
                            <option value="ROTATING">Rotating Shift</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create User</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW USER DETAILS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isViewModalOpen && selectedUser && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsViewModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title">User Details</h3>
                  <p className="admin-modal-subtitle">
                    {selectedUser?.first_name} {selectedUser?.last_name} • {selectedUser?.patient_id || selectedUser?.doctor_id || selectedUser?.staff_id || selectedUser?.employee_id || `#${selectedUser?.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsViewModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body">
                <div className="admin-details-grid">
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Full Name</span>
                    <span className="admin-detail-value font-semibold">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Email Address</span>
                    <span className="admin-detail-value">{selectedUser.email || selectedUser.user?.email || 'N/A'}</span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Phone</span>
                    <span className="admin-detail-value">{selectedUser.phone || selectedUser.phone_number || 'N/A'}</span>
                  </div>

                  {activeTab === 'patients' && (
                    <>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Date of Birth</span>
                        <span className="admin-detail-value">{selectedUser.date_of_birth}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Gender</span>
                        <span className="admin-detail-value">{selectedUser.gender}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Blood Group</span>
                        <span className="admin-detail-value">{selectedUser.blood_group?.replace('_', ' ')}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Address</span>
                        <span className="admin-detail-value">{selectedUser.address || 'N/A'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Emergency Contact</span>
                        <span className="admin-detail-value">
                          {selectedUser.emergency_contact_name || 'N/A'} ({selectedUser.emergency_contact_phone || 'N/A'})
                        </span>
                      </div>
                    </>
                  )}

                  {activeTab === 'doctors' && (
                    <>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Specialization</span>
                        <span className="admin-detail-value">{selectedUser.specialization}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">License Number</span>
                        <span className="admin-detail-value">{selectedUser.license_number}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Consultation Fee</span>
                        <span className="admin-detail-value">₹{selectedUser.consultation_fee}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Clinical Availability</span>
                        <span className="admin-detail-value">{(selectedUser.is_available !== undefined ? selectedUser.is_available : (selectedUser.status === 'ACTIVE')) ? 'Available' : 'Unavailable'}</span>
                      </div>
                    </>
                  )}

                  {['lab_staff', 'pharmacists', 'receptionists'].includes(activeTab) && (
                    <>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Role</span>
                        <span className="admin-detail-value">{selectedUser.role}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Department</span>
                        <span className="admin-detail-value">{selectedUser.department}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Qualification</span>
                        <span className="admin-detail-value">{selectedUser.qualification || 'N/A'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Work Shift</span>
                        <span className="admin-detail-value">{selectedUser.shift || 'General Shift'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Employment Status</span>
                        <span className="admin-detail-value">{(selectedUser.is_active !== undefined ? selectedUser.is_active : (selectedUser.status === 'ACTIVE')) ? 'Active' : 'Inactive'}</span>
                      </div>
                    </>
                  )}
                </div>
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
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEditModal(selectedUser);
                  }}
                >
                  <Edit2 size={15} />
                  <span>Edit Record</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EDIT USER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedUser && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsEditModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title">Edit User Record</h3>
                  <p className="admin-modal-subtitle">
                    Update supported profile fields for {selectedUser?.first_name} {selectedUser?.last_name}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsEditModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEditSubmit} noValidate>
                <div className="admin-modal-body">
                  {formErrors.general && (
                    <div className="admin-alert admin-alert-error" role="alert">
                      <AlertCircle size={18} />
                      <span>{formErrors.general}</span>
                    </div>
                  )}

                  {activeTab === 'patients' && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">First Name</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.first_name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Last Name</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.last_name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone</label>
                          <input
                            type="tel"
                            className="admin-form-input"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Email</label>
                          <input
                            type="email"
                            className="admin-form-input"
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Address</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={editFormData.address || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        />
                      </div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Emergency Contact Name</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.emergency_contact_name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            className="admin-form-input"
                            value={editFormData.emergency_contact_phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'doctors' && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Specialization</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.specialization || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">License Number</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.license_number || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, license_number: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone</label>
                          <input
                            type="tel"
                            className="admin-form-input"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Consultation Fee (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="admin-form-input"
                            value={editFormData.consultation_fee || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, consultation_fee: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-checkbox-label">
                          <input
                            type="checkbox"
                            checked={editFormData.is_available ?? true}
                            onChange={(e) => setEditFormData({ ...editFormData, is_available: e.target.checked })}
                          />
                          <span>Currently Available for Patient Appointments</span>
                        </label>
                      </div>
                    </>
                  )}

                  {['lab_staff', 'pharmacists', 'receptionists'].includes(activeTab) && (
                    <>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Department</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.department || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Qualification</label>
                          <input
                            type="text"
                            className="admin-form-input"
                            value={editFormData.qualification || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="admin-form-grid">
                        <div className="admin-form-group">
                          <label className="admin-form-label">Phone</label>
                          <input
                            type="tel"
                            className="admin-form-input"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-form-label">Shift</label>
                          <select
                            className="admin-form-select"
                            value={editFormData.shift || 'MORNING'}
                            onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                          >
                            <option value="MORNING">Morning Shift</option>
                            <option value="EVENING">Evening Shift</option>
                            <option value="NIGHT">Night Shift</option>
                            <option value="ROTATING">Rotating Shift</option>
                          </select>
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-checkbox-label">
                          <input
                            type="checkbox"
                            checked={editFormData.is_active ?? true}
                            onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                          />
                          <span>Active Employment Status</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Saving Changes...</span>
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
          DELETE CONFIRMATION DIALOG (Mandatory Policy)
      ───────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && userToDelete && (
        <ModalPortal isOpen={true}>
          <div className="admin-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)} role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-modal-card-danger" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 className="admin-modal-title text-danger">Confirm User Deletion</h3>
                  <p className="admin-modal-subtitle">
                    Permanent removal from hospital registry
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
                      Are you sure you want to delete this record?
                    </p>
                    <p className="font-semibold" style={{ marginTop: '0.25rem' }}>
                      {userToDelete.first_name} {userToDelete.last_name} (
                      {userToDelete.patient_id || userToDelete.employee_id || `#${userToDelete.id}`})
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
                  Hospital Policy: If this user has related clinical history (such as appointments, prescriptions, diagnostic results, or bills), deletion is automatically blocked by the backend to maintain audit compliance.
                </p>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
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
                    <span>Delete User</span>
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

export default AdminUsersPage;
