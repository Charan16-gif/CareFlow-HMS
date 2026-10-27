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

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await receptionistService.getProfile();
      setProfileData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone_number || data.phone || '',
        username: data.username || '',
      });
    } catch (err) {
      const cached = authService.getUserProfile();
      if (cached) {
        setProfileData({
          first_name: cached.first_name || '',
          last_name: cached.last_name || '',
          email: cached.email || '',
          phone: cached.phone_number || cached.phone || '',
          username: cached.username || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
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
      <div className="admin-modal-backdrop" onClick={onClose}>
        <div
          className="admin-modal-card admin-modal-card-lg"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '640px' }}
        >
          {/* Header */}
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
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="admin-modal-title">Receptionist Profile</h3>
                <p className="admin-modal-subtitle">Manage front-desk information and account security</p>
              </div>
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
              <span>Security & Password</span>
            </button>
          </div>

          {/* Body */}
          <div className="admin-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="admin-loading-card" style={{ padding: '2rem' }}>
                <Loader2 size={28} className="spinner-icon admin-spinner-teal" />
                <p>Loading receptionist profile details...</p>
              </div>
            ) : activeTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit}>
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

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Username</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={profileData.username}
                    disabled
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)', marginTop: '0.2rem', display: 'block' }}>
                    System username assigned by hospital administration.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    />
                    {profileErrors.first_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {profileErrors.first_name}
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
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    />
                    {profileErrors.last_name && (
                      <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                        {profileErrors.last_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="admin-search-wrapper" style={{ maxWidth: '100%' }}>
                    <Mail size={16} className="admin-search-icon" />
                    <input
                      type="email"
                      className="admin-search-input"
                      style={{ paddingLeft: '2.5rem' }}
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  {profileErrors.email && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {profileErrors.email}
                    </span>
                  )}
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="admin-form-label">Contact Phone Number</label>
                  <div className="admin-search-wrapper" style={{ maxWidth: '100%' }}>
                    <Phone size={16} className="admin-search-icon" />
                    <input
                      type="text"
                      className="admin-search-input"
                      style={{ paddingLeft: '2.5rem' }}
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  {profileErrors.phone_number && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {profileErrors.phone_number}
                    </span>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', background: 'transparent' }}>
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
                    disabled={submittingProfile}
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
              <form onSubmit={handlePasswordSubmit}>
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

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="admin-form-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
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
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.current_password}
                    </span>
                  )}
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">
                    New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="admin-form-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
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
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.new_password}
                    </span>
                  )}
                </div>

                <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="admin-form-label">
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="admin-form-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                      {passwordErrors.confirm_password}
                    </span>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ padding: '1rem 0 0', background: 'transparent' }}>
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
