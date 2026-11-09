import React, { useState, useEffect } from 'react';
import ModalPortal from '../common/ModalPortal';
import receptionistService from '../../services/receptionistService';
import authService from '../../services/authService';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [loading, setLoading] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
  });

  const [initialProfileData, setInitialProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setProfileSuccessMsg('');
      setPasswordSuccessMsg('');
      setProfileErrors({});
      setPasswordErrors({});
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    }
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

  const isProfileDirty = Boolean(
    (profileData.first_name || '').trim() !== (initialProfileData.first_name || '').trim() ||
    (profileData.last_name || '').trim() !== (initialProfileData.last_name || '').trim() ||
    (profileData.email || '').trim().toLowerCase() !== (initialProfileData.email || '').trim().toLowerCase() ||
    (profileData.phone || '').trim() !== (initialProfileData.phone || '').trim()
  );

  const handleCancel = () => {
    setProfileData(initialProfileData);
    setProfileErrors({});
    setProfileSuccessMsg('');
    onClose();
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await receptionistService.getProfile();
      const init = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone_number || data.phone || '',
        username: data.username || '',
      };
      setProfileData(init);
      setInitialProfileData(init);
    } catch (err) {
      const cached = authService.getUserProfile();
      if (cached) {
        const init = {
          first_name: cached.first_name || '',
          last_name: cached.last_name || '',
          email: cached.email || '',
          phone: cached.phone_number || cached.phone || '',
          username: cached.username || '',
        };
        setProfileData(init);
        setInitialProfileData(init);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!isProfileDirty || submittingProfile) return;
    setProfileSuccessMsg('');
    setProfileErrors({});

    const errors = {};
    if (!profileData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!profileData.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!profileData.email.trim()) errors.email = 'Email address is required.';

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setSubmittingProfile(true);
    try {
      const updated = await receptionistService.updateProfile({
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        email: profileData.email.trim(),
        phone_number: profileData.phone.trim(),
      });

      const newInit = {
        first_name: updated.first_name || profileData.first_name.trim(),
        last_name: updated.last_name || profileData.last_name.trim(),
        email: updated.email || profileData.email.trim(),
        phone: updated.phone_number || profileData.phone.trim(),
        username: updated.username || profileData.username,
      };
      setProfileData(newInit);
      setInitialProfileData(newInit);

      // Update local storage
      const cached = authService.getUserProfile() || {};
      const merged = { ...cached, ...updated };
      localStorage.setItem('careflow_user_profile', JSON.stringify(merged));

      setProfileSuccessMsg('Receptionist profile updated successfully.');
      toast.success('Receptionist profile updated successfully!', 'Profile Updated');
      if (onProfileUpdated) onProfileUpdated(merged);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setProfileErrors(data);
      } else {
        setProfileErrors({ non_field_errors: 'Failed to update receptionist profile. Please try again.' });
      }
      toast.error('Failed to update profile. Check fields.', 'Update Failed');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrors({});

    const errors = {};
    if (!passwordData.current_password) errors.current_password = 'Enter current password.';
    if (!passwordData.new_password) errors.new_password = 'Enter new password.';
    else if (passwordData.new_password.length < 8) errors.new_password = 'Password must be at least 8 characters.';
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'New passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setSubmittingPassword(true);
    try {
      await receptionistService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      });

      setPasswordSuccessMsg('Password changed successfully. Use your new password on next sign-in.');
      toast.success('Password changed successfully!', 'Password Changed');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setPasswordErrors(data);
      } else {
        setPasswordErrors({ non_field_errors: 'Unable to update password. Please check your credentials.' });
      }
      toast.error('Unable to update password. Please check current password.', 'Password Change Failed');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="receptionist-profile-title">
        <div
          className="admin-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '580px' }}
        >
          {/* Header */}
          <div className="admin-modal-header">
            <div className="admin-modal-title-box">
              <h3 id="receptionist-profile-title" className="admin-modal-title">
                Receptionist Profile
              </h3>
              <p className="admin-modal-subtitle">
                Manage front-desk information and account security
              </p>
            </div>
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="admin-modal-tabs">
            <button
              type="button"
              className={`admin-modal-tab ${activeTab === 'profile' ? 'admin-modal-tab-active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              <span>Personal Details</span>
            </button>
            <button
              type="button"
              className={`admin-modal-tab ${activeTab === 'security' ? 'admin-modal-tab-active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={16} />
              <span>Change Password</span>
            </button>
          </div>

          {/* Body */}
          <div className="admin-modal-body">
            {loading ? (
              <div className="admin-loading-card" style={{ padding: '2rem' }}>
                <Loader2 size={28} className="spinner-icon admin-spinner-teal" />
                <p>Loading receptionist profile details...</p>
              </div>
            ) : activeTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit} noValidate>
                {profileSuccessMsg && (
                  <div className="admin-alert admin-alert-success" style={{ marginBottom: '1rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}
                {profileErrors.non_field_errors && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{profileErrors.non_field_errors}</span>
                  </div>
                )}

                {/* Account Role Banner */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(14, 165, 233, 0.15)',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0ea5e9',
                      }}
                    >
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                        Front Desk & Patient Services
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        Username: {profileData.username || '—'}
                      </span>
                    </div>
                  </div>
                  <span className="admin-badge admin-badge-cyan">Receptionist</span>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="rec-first-name">
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="rec-first-name"
                      type="text"
                      className={`admin-input ${profileErrors.first_name ? 'admin-input-error' : ''}`}
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      placeholder="First name"
                      required
                    />
                    {profileErrors.first_name && (
                      <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {profileErrors.first_name}
                      </span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="rec-last-name">
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="rec-last-name"
                      type="text"
                      className={`admin-input ${profileErrors.last_name ? 'admin-input-error' : ''}`}
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      placeholder="Last name"
                      required
                    />
                    {profileErrors.last_name && (
                      <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {profileErrors.last_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="rec-email">
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="admin-input-icon-wrapper">
                    <Mail size={16} className="admin-input-icon" />
                    <input
                      id="rec-email"
                      type="email"
                      className={`admin-input admin-input-with-icon ${
                        profileErrors.email ? 'admin-input-error' : ''
                      }`}
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="receptionist@careflow.com"
                      required
                    />
                  </div>
                  {profileErrors.email && (
                    <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {profileErrors.email}
                    </span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="rec-phone">
                    Contact Phone Number
                  </label>
                  <div className="admin-input-icon-wrapper">
                    <Phone size={16} className="admin-input-icon" />
                    <input
                      id="rec-phone"
                      type="tel"
                      className={`admin-input admin-input-with-icon ${
                        profileErrors.phone_number || profileErrors.phone ? 'admin-input-error' : ''
                      }`}
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  {(profileErrors.phone_number || profileErrors.phone) && (
                    <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {profileErrors.phone_number || profileErrors.phone}
                    </span>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={!isProfileDirty || submittingProfile}
                    style={{
                      opacity: !isProfileDirty && !submittingProfile ? 0.55 : 1,
                      cursor: !isProfileDirty && !submittingProfile ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingProfile ? (
                      <>
                        <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
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
                  <div className="admin-alert admin-alert-success" style={{ marginBottom: '1rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}
                {passwordErrors.non_field_errors && (
                  <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{passwordErrors.non_field_errors}</span>
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="rec-current-pwd">
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="rec-current-pwd"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.current_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
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
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.current_password}
                    </span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="rec-new-pwd">
                    New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="rec-new-pwd"
                      type={showNewPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.new_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
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
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.new_password}
                    </span>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="rec-confirm-pwd">
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="admin-input-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      id="rec-confirm-pwd"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`admin-input ${
                        passwordErrors.confirm_password ? 'admin-input-error' : ''
                      }`}
                      style={{ paddingRight: '2.75rem' }}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <span className="admin-form-error" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.confirm_password}
                    </span>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={submittingPassword}
                  >
                    {submittingPassword ? (
                      <>
                        <Loader2 size={16} className="spinner-icon admin-spinner-teal" />
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

export default ReceptionistProfileModal;
