import React, { useState, useEffect } from 'react';
import patientService from '../../services/patientService';
import authService from '../../services/authService';
import ModalPortal from '../common/ModalPortal';
import {
  X,
  User,
  Mail,
  Phone,
  HeartPulse,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PatientProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'password'

  // Profile state
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setProfileSuccessMsg('');
      setPasswordSuccessMsg('');
      setProfileErrors({});
      setPasswordErrors({});
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadProfile = async () => {
    try {
      const data = await patientService.getProfile();
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone_number || data.phone || '',
      });
    } catch (err) {
      const cached = authService.getUserProfile();
      if (cached) {
        setProfile(cached);
        setFormData({
          first_name: cached.first_name || '',
          last_name: cached.last_name || '',
          email: cached.email || '',
          phone: cached.phone_number || cached.phone || '',
        });
      }
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSuccessMsg('');

    const errors = {};
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required.';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await patientService.updateProfile({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      });
      setProfile(updated);
      setProfileSuccessMsg('Profile information updated successfully.');
      toast.success('Your profile details have been updated successfully!', 'Profile Updated');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err) {
      let msg = 'Failed to update profile. Please try again.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.detail) {
          msg = err.response.data.detail;
        } else {
          setProfileErrors(err.response.data);
          const firstErr = Object.values(err.response.data)[0];
          toast.error(Array.isArray(firstErr) ? firstErr[0] : String(firstErr), 'Profile Error');
          return;
        }
      }
      toast.error(msg, 'Profile Error');
      setProfileErrors({ general: msg });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSuccessMsg('');

    const errors = {};
    if (!passwordData.current_password) {
      errors.current_password = 'Current password is required.';
    }
    if (!passwordData.new_password) {
      errors.new_password = 'New password is required.';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters long.';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'New passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);
    try {
      await patientService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      });
      setPasswordSuccessMsg('Password changed successfully.');
      toast.success('Account password updated successfully!', 'Password Changed');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      let msg = 'Failed to update password. Please check your current password.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.detail) {
          msg = err.response.data.detail;
        } else {
          setPasswordErrors(err.response.data);
          const firstErr = Object.values(err.response.data)[0];
          toast.error(Array.isArray(firstErr) ? firstErr[0] : String(firstErr), 'Password Error');
          return;
        }
      }
      toast.error(msg, 'Password Error');
      setPasswordErrors({ general: msg });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={true}>
      <div
        className="admin-modal-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-profile-title"
      >
        <div
          className="admin-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '580px' }}
        >
          <div className="admin-modal-header">
            <div className="admin-modal-title-box">
              <h3 id="patient-profile-title" className="admin-modal-title">
                Patient Account & Settings
              </h3>
              <p className="admin-modal-subtitle">
                Manage personal details and portal login credentials
              </p>
            </div>
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={onClose}
              aria-label="Close profile modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Navigation Tabs */}
          <div className="admin-modal-tabs">
            <button
              type="button"
              className={`admin-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <User size={16} />
              <span>Personal Details</span>
            </button>
            <button
              type="button"
              className={`admin-modal-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <KeyRound size={16} />
              <span>Change Password</span>
            </button>
          </div>

          <div className="admin-modal-body">
            {activeTab === 'details' ? (
              <form onSubmit={handleProfileSubmit} noValidate>
                {profileSuccessMsg && (
                  <div className="admin-alert admin-alert-success" role="alert">
                    <CheckCircle2 size={16} />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrors.general && (
                  <div className="admin-alert admin-alert-danger" role="alert">
                    <AlertCircle size={16} />
                    <span>{profileErrors.general}</span>
                  </div>
                )}

                {/* Account Role Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--admin-surface-secondary)',
                    borderRadius: 'var(--admin-radius-sm)',
                    border: '1px solid var(--admin-border)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <HeartPulse size={18} color="var(--primary-teal, #14b8a6)" />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                        CareFlow Registered Patient
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        Username: {profile?.username || '—'}
                      </span>
                    </div>
                  </div>
                  <span className="admin-badge admin-badge-teal">
                    {profile?.is_email_verified ? 'Verified' : 'Active'}
                  </span>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="patient-first-name">
                      First Name
                    </label>
                    <input
                      id="patient-first-name"
                      type="text"
                      className={`admin-input ${profileErrors.first_name ? 'admin-input-error' : ''}`}
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                      placeholder="First name"
                      required
                    />
                    {profileErrors.first_name && (
                      <span className="admin-form-error">{profileErrors.first_name}</span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="patient-last-name">
                      Last Name
                    </label>
                    <input
                      id="patient-last-name"
                      type="text"
                      className="admin-input"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="patient-email">
                    Email Address
                  </label>
                  <div className="admin-input-icon-wrapper">
                    <Mail size={16} className="admin-input-icon" />
                    <input
                      id="patient-email"
                      type="email"
                      className={`admin-input admin-input-with-icon ${
                        profileErrors.email ? 'admin-input-error' : ''
                      }`}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  {profileErrors.email && (
                    <span className="admin-form-error">{profileErrors.email}</span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="patient-phone">
                    Phone Number
                  </label>
                  <div className="admin-input-icon-wrapper">
                    <Phone size={16} className="admin-input-icon" />
                    <input
                      id="patient-phone"
                      type="tel"
                      className="admin-input admin-input-with-icon"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} noValidate>
                {passwordSuccessMsg && (
                  <div className="admin-alert admin-alert-success" role="alert">
                    <CheckCircle2 size={16} />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrors.general && (
                  <div className="admin-alert admin-alert-danger" role="alert">
                    <AlertCircle size={16} />
                    <span>{passwordErrors.general}</span>
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="patient-current-pwd">
                    Current Password
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="patient-current-pwd"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.current_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          current_password: e.target.value,
                        }))
                      }
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <span className="admin-form-error">{passwordErrors.current_password}</span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="patient-new-pwd">
                    New Password
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="patient-new-pwd"
                      type={showNewPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.new_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          new_password: e.target.value,
                        }))
                      }
                      placeholder="Enter new strong password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <span className="admin-form-error">{passwordErrors.new_password}</span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="patient-confirm-pwd">
                    Confirm New Password
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="patient-confirm-pwd"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.confirm_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirm_password: e.target.value,
                        }))
                      }
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <span className="admin-form-error">{passwordErrors.confirm_password}</span>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PatientProfileModal;
