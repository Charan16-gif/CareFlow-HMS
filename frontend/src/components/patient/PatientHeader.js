import React from 'react';
import ThemeSwitcher from '../common/ThemeSwitcher';
import { Menu, X, User, HeartPulse } from 'lucide-react';

const PatientHeader = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  patientUser,
  currentTheme = 'default',
  onThemeChange,
}) => {
  const displayName = patientUser
    ? `${patientUser.first_name || ''} ${patientUser.last_name || ''}`.trim() || patientUser.username
    : 'Patient';

  return (
    <header className="admin-header" role="banner">
      <div className="admin-header-left">
        <button
          type="button"
          className="admin-header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="admin-header-title-box">
          <h1 className="admin-header-title">Patient Portal</h1>
          <span className="admin-header-subtitle">CareFlow Hospital Management System</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Theme Switcher for Patient Dashboard */}
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button
          type="button"
          className="admin-header-btn admin-profile-trigger"
          onClick={onOpenProfile}
          aria-label="View and edit patient profile"
          title="Patient Profile"
        >
          <div className="admin-avatar-chip">
            <User size={16} />
          </div>
          <div className="admin-profile-text">
            <span className="admin-name-text">{displayName}</span>
            <span className="admin-role-badge">
              <HeartPulse size={11} />
              <span>Patient</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default PatientHeader;
