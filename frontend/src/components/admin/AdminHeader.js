import React from 'react';
import ThemeSwitcher from '../common/ThemeSwitcher';
import { Menu, X, User, Shield } from 'lucide-react';

const AdminHeader = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  adminUser,
  currentTheme = 'default',
  onThemeChange,
}) => {
  const displayName = adminUser
    ? `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim() || adminUser.username
    : 'Administrator';

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
          <h1 className="admin-header-title">Admin Dashboard</h1>
          <span className="admin-header-subtitle">CareFlow Hospital Management System</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Theme Switcher for Admin Dashboard */}
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button
          type="button"
          className="admin-header-btn admin-profile-trigger"
          onClick={onOpenProfile}
          aria-label="View and edit administrator profile"
          title="Admin Profile"
        >
          <div className="admin-avatar-chip">
            <User size={16} />
          </div>
          <div className="admin-profile-text">
            <span className="admin-name-text">{displayName}</span>
            <span className="admin-role-badge">
              <Shield size={11} />
              <span>Admin</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
