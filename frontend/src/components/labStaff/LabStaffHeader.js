import React from 'react';
import ThemeSwitcher from '../common/ThemeSwitcher';
import { Menu, X, User, FlaskConical } from 'lucide-react';

const LabStaffHeader = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  labUser,
  currentTheme = 'default',
  onThemeChange,
}) => {
  const staffName = labUser
    ? (labUser.first_name ? `${labUser.first_name} ${labUser.last_name || ''}`.trim() : labUser.username)
    : 'Lab Staff';

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
          <h1 className="admin-header-title">Laboratory Staff Portal</h1>
          <span className="admin-header-subtitle">CareFlow Hospital Management System</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Theme Switcher */}
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button
          type="button"
          className="admin-header-btn admin-profile-trigger"
          onClick={onOpenProfile}
          aria-label="View and edit laboratory profile"
          title="Laboratory Staff Profile"
        >
          <div className="admin-avatar-chip">
            <User size={16} />
          </div>
          <div className="admin-profile-text">
            <span className="admin-name-text">{staffName}</span>
            <span className="admin-role-badge">
              <FlaskConical size={11} />
              <span>Laboratory Staff</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default LabStaffHeader;
