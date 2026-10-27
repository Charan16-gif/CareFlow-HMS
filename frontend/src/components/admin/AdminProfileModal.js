import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import authService from '../../services/authService';
import ModalPortal from '../common/ModalPortal';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const AdminProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
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

  // Initial fetch
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

  // Freeze background scrolling and make background elements inactive while modal is open
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

  // Handle ESC key to close
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
      const data = await adminService.getProfile();
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch (err) {
      // Fallback to cached profile
      const cached = authService.getUserProfile();
      if (cached) {
        setProfile(cached);
        setFormData({
          first_name: cached.first_name || '',
          last_name: cached.last_name || '',
          email: cached.email || '',
          phone: cached.phone || '',
        });
      }
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    const errors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'Please provide your first name.';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please provide an email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      const updated = await adminService.updateProfile(formData);
      setProfile(updated);
      setProfileSuccessMsg('Profile details successfully updated.');
      toast.success('Admin profile details successfully updated!', 'Profile Updated');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      // Refresh cached profile
      await authService.fetchProfile();
      // Auto-close modal after updating details
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      const backendErrors = {};
      if (err.response && err.response.data) {
        const d = err.response.data;
        if (typeof d === 'object') {
          Object.keys(d).forEach((key) => {
            backendErrors[key] = Array.isArray(d[key]) ? d[key].join(' ') : String(d[key]);
          });
        } else {
          backendErrors.general = 'Failed to update profile. Please try again.';
        }
      } else {
        backendErrors.general = 'Unable to connect to server. Please try again later.';
      }
      setProfileErrors(backendErrors);
      toast.error('Failed to update profile details. Check errors.', 'Update Failed');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    const errors = {};

    if (!passwordData.current_password) {
      errors.current_password = 'Enter your current password.';
    }
    if (!passwordData.new_password) {
      errors.new_password = 'Enter a new password.';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'New password must be at least 8 characters long.';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setIsChangingPassword(true);

    try {
      await adminService.changePassword(passwordData);
      setPasswordSuccessMsg('Password successfully changed. Use your new password on next sign in.');
      toast.success('Password changed successfully!', 'Password Changed');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      // Auto-close modal after changing password
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      const backendErrors = {};
      if (err.response && err.response.data) {
        const d = err.response.data;
        if (typeof d === 'object') {
          Object.keys(d).forEach((key) => {
            backendErrors[key] = Array.isArray(d[key]) ? d[key].join(' ') : String(d[key]);
          });
        } else {
          backendErrors.general = 'Failed to change password. Please check your current password.';
        }
      } else {
        backendErrors.general = 'Unable to connect to server. Please try again.';
      }
      setPasswordErrors(backendErrors);
      toast.error('Failed to change password. Please verify current password.', 'Password Change Failed');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={true}>
      <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title-box">
            <h2 id="admin-profile-modal-title" className="admin-modal-title">
              Administrator Profile
            </h2>
            <p className="admin-modal-subtitle">
              Manage your administrator details and account security settings
            </p>
          </div>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="admin-modal-tabs">
          <button
            type="button"
            className={`admin-modal-tab ${activeTab === 'details' ? 'admin-modal-tab-active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <User size={16} />
            <span>Update Details</span>
          </button>
          <button
            type="button"
            className={`admin-modal-tab ${activeTab === 'password' ? 'admin-modal-tab-active' : ''}`}
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
                  <CheckCircle2 size={18} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}
              {profileErrors.general && (
                <div className="admin-alert admin-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{profileErrors.general}</span>
                </div>
              )}

              {/* Read-Only Account Overview Info */}
              <div className="admin-profile-readonly-banner">
                <div className="admin-profile-badge-row">
                  <span className="admin-role-pill">
                    <Shield size={13} />
                    <span>Role: Hospital Administrator</span>
                  </span>
                  <span className="admin-username-pill">
                    Username: @{profile?.username || 'admin'}
                  </span>
                </div>
                <p className="admin-security-note">
                  Role assignments and administrator usernames are strictly managed for hospital audit security.
                </p>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-first-name" className="admin-form-label">
                    First Name <span className="admin-required">*</span>
                  </label>
                  <input
                    id="admin-first-name"
                    type="text"
                    className={`admin-form-input ${profileErrors.first_name ? 'admin-input-error' : ''}`}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                  {profileErrors.first_name && (
                    <p className="admin-field-error">{profileErrors.first_name}</p>
                  )}
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-last-name" className="admin-form-label">
                    Last Name
                  </label>
                  <input
                    id="admin-last-name"
                    type="text"
                    className="admin-form-input"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-email" className="admin-form-label">
                  Email Address <span className="admin-required">*</span>
                </label>
                <div className="admin-input-with-icon">
                  <Mail size={16} className="admin-input-icon" />
                  <input
                    id="admin-email"
                    type="email"
                    className={`admin-form-input ${profileErrors.email ? 'admin-input-error' : ''}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {profileErrors.email && (
                  <p className="admin-field-error">{profileErrors.email}</p>
                )}
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-phone" className="admin-form-label">
                  Phone Number
                </label>
                <div className="admin-input-with-icon">
                  <Phone size={16} className="admin-input-icon" />
                  <input
                    id="admin-phone"
                    type="tel"
                    className={`admin-form-input ${profileErrors.phone ? 'admin-input-error' : ''}`}
                    value={formData.phone}
                    placeholder="+91 98765 43210"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                {profileErrors.phone && (
                  <p className="admin-field-error">{profileErrors.phone}</p>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={onClose}
                  disabled={isSavingProfile}
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
                      <span>Saving Details...</span>
                    </>
                  ) : (
                    <span>Update Details</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} noValidate>
              {passwordSuccessMsg && (
                <div className="admin-alert admin-alert-success" role="alert">
                  <CheckCircle2 size={18} />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}
              {passwordErrors.general && (
                <div className="admin-alert admin-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{passwordErrors.general}</span>
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="admin-current-password" className="admin-form-label">
                  Current Password <span className="admin-required">*</span>
                </label>
                <div className="admin-input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    id="admin-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={`admin-form-input ${passwordErrors.current_password ? 'admin-input-error' : ''}`}
                    style={{ paddingRight: '2.75rem' }}
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, current_password: e.target.value })
                    }
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="admin-icon-toggle"
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="admin-field-error">{passwordErrors.current_password}</p>
                )}
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-new-password" className="admin-form-label">
                  New Password <span className="admin-required">*</span>
                </label>
                <div className="admin-input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    id="admin-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className={`admin-form-input ${passwordErrors.new_password ? 'admin-input-error' : ''}`}
                    style={{ paddingRight: '2.75rem' }}
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="admin-icon-toggle"
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="admin-field-error">{passwordErrors.new_password}</p>
                )}
                <span className="admin-input-help">
                  Must be at least 8 characters long and cannot be entirely numeric.
                </span>
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-confirm-password" className="admin-form-label">
                  Confirm New Password <span className="admin-required">*</span>
                </label>
                <div className="admin-input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    id="admin-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`admin-form-input ${passwordErrors.confirm_password ? 'admin-input-error' : ''}`}
                    style={{ paddingRight: '2.75rem' }}
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="admin-icon-toggle"
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <p className="admin-field-error">{passwordErrors.confirm_password}</p>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={onClose}
                  disabled={isChangingPassword}
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
                    <span>Change Password</span>
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

export default AdminProfileModal;
