import React from 'react';
import ThemeSwitcher from '../common/ThemeSwitcher';
import { Menu, X, User, Pill } from 'lucide-react';

const PharmacistHeader = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  pharmacistUser,
  currentTheme = 'default',
  onThemeChange,
}) => {
  const staffName = pharmacistUser
    ? (pharmacistUser.first_name
        ? `${pharmacistUser.first_name} ${pharmacistUser.last_name || ''}`.trim()
        : pharmacistUser.username)
    : 'Pharmacist';

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
          <h1 className="admin-header-title">Pharmacist Portal</h1>
          <span className="admin-header-subtitle">CareFlow Hospital Management System</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Universal Theme Switcher across all pages */}
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button
          type="button"
          className="admin-header-btn admin-profile-trigger"
          onClick={onOpenProfile}
          aria-label="View and edit pharmacist profile"
          title="Pharmacist Profile"
        >
          <div className="admin-avatar-chip">
            <User size={16} />
          </div>
          <div className="admin-profile-text">
            <span className="admin-name-text">{staffName}</span>
            <span className="admin-role-badge">
              <Pill size={11} />
              <span>Pharmacist</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default PharmacistHeader;
