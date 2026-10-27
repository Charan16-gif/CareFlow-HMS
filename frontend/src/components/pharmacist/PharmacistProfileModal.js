import React, { useState, useEffect } from 'react';
import ModalPortal from '../common/ModalPortal';
import pharmacistService from '../../services/pharmacistService';
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
  Pill,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PharmacistProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
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
      const data = await pharmacistService.getProfile();
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
      const updated = await pharmacistService.updateProfile({
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        email: profileData.email.trim(),
        phone_number: profileData.phone.trim(),
      });

      const cached = authService.getUserProfile() || {};
      const merged = { ...cached, ...updated };
      localStorage.setItem('careflow_user_profile', JSON.stringify(merged));

      setProfileSuccessMsg('Pharmacist profile updated successfully.');
      toast.success('Pharmacist profile updated successfully!', 'Profile Updated');
      if (onProfileUpdated) onProfileUpdated(merged);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setProfileErrors(data);
      } else {
        setProfileErrors({ non_field_errors: 'Failed to update pharmacist profile. Please try again.' });
      }
      toast.error('Failed to update pharmacist profile. Check fields.', 'Update Failed');
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
    if (passwordData.new_password && passwordData.new_password.length < 8) {
      errors.new_password = 'New password must be at least 8 characters long.';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setSubmittingPassword(true);
    try {
      await pharmacistService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      });

      setPasswordSuccessMsg('Password successfully changed.');
      toast.success('Password changed successfully!', 'Password Changed');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setPasswordErrors(data);
      } else {
        setPasswordErrors({ non_field_errors: 'Failed to change password. Please check your current password.' });
      }
      toast.error('Failed to change password. Please check current password.', 'Password Change Failed');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="admin-modal-container admin-profile-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="admin-modal-header">
            <div className="admin-modal-title-box">
              <div
                className="admin-stat-icon-wrapper"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.3))',
                  color: '#10b981',
                }}
              >
                <Pill size={20} />
              </div>
              <div>
                <h3 className="admin-modal-title">Pharmacist Profile & Account</h3>
                <p className="admin-modal-subtitle">Manage your pharmacy credentials and security settings</p>
              </div>
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

          {/* Tab Navigation */}
          <div className="admin-modal-tabs">
            <button
              type="button"
              className={`admin-modal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={15} />
              <span>Personal Profile</span>
            </button>
            <button
              type="button"
              className={`admin-modal-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={15} />
              <span>Security & Password</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="admin-modal-body">
            {loading ? (
              <div className="admin-loading-state" style={{ minHeight: '220px' }}>
                <Loader2 size={32} className="admin-spinner" />
                <p>Loading pharmacist profile...</p>
              </div>
            ) : activeTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit} noValidate>
                {profileSuccessMsg && (
                  <div className="status-alert status-alert-success" style={{ marginBottom: '1.25rem' }}>
                    <CheckCircle2 size={18} className="status-alert-icon" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrors.non_field_errors && (
                  <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={18} className="status-alert-icon" />
                    <span>{profileErrors.non_field_errors}</span>
                  </div>
                )}

                <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><User size={16} /></span>
                      <input
                        type="text"
                        className="form-input"
                        value={profileData.username}
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                    <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      System identifier cannot be modified.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Role</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Pill size={16} /></span>
                      <input
                        type="text"
                        className="form-input"
                        value="Licensed Pharmacist"
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className={`form-input ${profileErrors.first_name ? 'form-input-error' : ''}`}
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      placeholder="Enter first name"
                      required
                    />
                    {profileErrors.first_name && (
                      <p className="field-error-msg">{profileErrors.first_name}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className={`form-input ${profileErrors.last_name ? 'form-input-error' : ''}`}
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      placeholder="Enter last name"
                      required
                    />
                    {profileErrors.last_name && (
                      <p className="field-error-msg">{profileErrors.last_name}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Mail size={16} /></span>
                      <input
                        type="email"
                        className={`form-input ${profileErrors.email ? 'form-input-error' : ''}`}
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        placeholder="pharmacist@careflow.com"
                        required
                      />
                    </div>
                    {profileErrors.email && (
                      <p className="field-error-msg">{profileErrors.email}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Phone size={16} /></span>
                      <input
                        type="tel"
                        className={`form-input ${profileErrors.phone_number ? 'form-input-error' : ''}`}
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    {profileErrors.phone_number && (
                      <p className="field-error-msg">{profileErrors.phone_number}</p>
                    )}
                  </div>
                </div>

                <div className="admin-modal-footer" style={{ marginTop: '1.5rem', paddingBottom: 0, paddingRight: 0 }}>
                  <button type="button" className="admin-btn admin-btn-outline" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={submittingProfile}
                  >
                    {submittingProfile ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} noValidate>
                {passwordSuccessMsg && (
                  <div className="status-alert status-alert-success" style={{ marginBottom: '1.25rem' }}>
                    <CheckCircle2 size={18} className="status-alert-icon" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrors.non_field_errors && (
                  <div className="status-alert status-alert-error" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={18} className="status-alert-icon" />
                    <span>{passwordErrors.non_field_errors}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Current Password *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={16} /></span>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.current_password ? 'form-input-error' : ''}`}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter existing password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <p className="field-error-msg">{passwordErrors.current_password}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">New Password *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={16} /></span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.new_password ? 'form-input-error' : ''}`}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="field-error-msg">{passwordErrors.new_password}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Confirm New Password *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={16} /></span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-input ${passwordErrors.confirm_password ? 'form-input-error' : ''}`}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <p className="field-error-msg">{passwordErrors.confirm_password}</p>
                  )}
                </div>

                <div className="admin-modal-footer" style={{ paddingBottom: 0, paddingRight: 0 }}>
                  <button type="button" className="admin-btn admin-btn-outline" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={submittingPassword}
                  >
                    {submittingPassword ? (
                      <>
                        <Loader2 size={16} className="admin-spinner" />
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

export default PharmacistProfileModal;
