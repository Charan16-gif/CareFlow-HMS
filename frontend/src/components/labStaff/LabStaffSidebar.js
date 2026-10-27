import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Activity,
  FileText,
  LogOut,
  User,
  FlaskConical,
} from 'lucide-react';

const labStaffNavItems = [
  {
    path: '/lab-staff',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: '/lab-staff/test-requests',
    label: 'Test Requests',
    icon: ClipboardList,
    end: false,
  },
  {
    path: '/lab-staff/enter-results',
    label: 'Enter Results',
    icon: Activity,
    end: false,
  },
  {
    path: '/lab-staff/reports',
    label: 'Upload Reports',
    icon: FileText,
    end: false,
  },
];

const LabStaffSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  labUser,
}) => {
  const staffName = labUser
    ? (labUser.first_name ? `${labUser.first_name} ${labUser.last_name || ''}`.trim() : labUser.username)
    : 'Laboratory Staff';

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`admin-sidebar ${isOpen ? 'admin-sidebar-open' : ''}`}
        aria-label="Laboratory Portal Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/lab-staff" className="admin-sidebar-brand-link" onClick={onClose}>
            <div className="admin-brand-icon-box" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(13, 148, 136, 0.35))' }}>
              <FlaskConical size={22} className="admin-brand-icon" style={{ color: '#06b6d4' }} />
            </div>
            <div className="admin-brand-text-box">
              <span className="admin-brand-name">CareFlow</span>
              <span className="admin-brand-tag" style={{ color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.35)' }}>
                LAB PORTAL
              </span>
            </div>
          </Link>
        </div>

        {/* Lab Staff Profile in Sidebar (Prominent & Accessible across devices) */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit laboratory staff profile"
            title="Lab Staff Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{staffName}</span>
              <span className="admin-role-badge">
                <FlaskConical size={11} />
                <span>Laboratory Staff</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Lab Staff Navigation">
          <ul className="admin-nav-list">
            {labStaffNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="admin-nav-item">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
                    }
                    onClick={onClose}
                  >
                    <Icon size={19} className="admin-nav-icon" />
                    <span className="admin-nav-label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer with Sign Out Button & System Status */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout-btn admin-logout-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenLogoutModal) onOpenLogoutModal();
            }}
            aria-label="Sign out of CareFlow Laboratory Portal"
            title="Sign Out"
          >
            <LogOut size={16} className="admin-sidebar-logout-icon" />
            <span>Sign Out</span>
          </button>
          <div className="admin-system-status">
            <span className="admin-status-dot" />
            <span>CareFlow HMS • Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default LabStaffSidebar;
