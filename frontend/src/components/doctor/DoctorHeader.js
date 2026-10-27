import React from 'react';
import ThemeSwitcher from '../common/ThemeSwitcher';
import { Menu, X, User, Stethoscope } from 'lucide-react';

const DoctorHeader = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  doctorUser,
  currentTheme = 'default',
  onThemeChange,
}) => {
  const doctorName = doctorUser
    ? (doctorUser.first_name ? `Dr. ${doctorUser.first_name} ${doctorUser.last_name || ''}`.trim() : doctorUser.username)
    : 'Doctor';

  const specialization = doctorUser?.specialization || 'Doctor';

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
          <h1 className="admin-header-title">Doctor Dashboard</h1>
          <span className="admin-header-subtitle">CareFlow Hospital Management System</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Theme Switcher for Doctor Dashboard */}
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button
          type="button"
          className="admin-header-btn admin-profile-trigger"
          onClick={onOpenProfile}
          aria-label="View and edit doctor profile"
          title="Doctor Profile"
        >
          <div className="admin-avatar-chip">
            <User size={16} />
          </div>
          <div className="admin-profile-text">
            <span className="admin-name-text">{doctorName}</span>
            <span className="admin-role-badge">
              <Stethoscope size={11} />
              <span>{specialization}</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default DoctorHeader;
