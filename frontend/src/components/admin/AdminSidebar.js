import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Pill,
  Activity,
  LogOut,
  User,
  Shield,
  FlaskConical,
} from 'lucide-react';

const navItems = [
  {
    path: '/admin',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: '/admin/users',
    label: 'Users',
    icon: Users,
    end: false,
  },
  {
    path: '/admin/prescriptions',
    label: 'Prescriptions',
    icon: FileText,
    end: false,
  },
  {
    path: '/admin/tablets',
    label: 'Tablets',
    icon: Pill,
    end: false,
  },
  {
    path: '/admin/lab-reports',
    label: 'Lab Reports',
    icon: FlaskConical,
    end: false,
  },
];

const AdminSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  adminUser,
}) => {
  const displayName = adminUser
    ? `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim() || adminUser.username
    : 'Administrator';

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
        aria-label="Admin Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/admin" className="admin-sidebar-brand-link" onClick={onClose}>
            <div className="admin-brand-icon-box">
              <Activity size={22} className="admin-brand-icon" />
            </div>
            <div className="admin-brand-text">
              <span className="admin-brand-name">CareFlow</span>
              <span className="admin-brand-tag">HMS Administration</span>
            </div>
          </Link>
        </div>

        {/* Administrator Profile in Sidebar (Prominent & Accessible in Mobile View) */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit administrator profile"
            title="Administrator Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{displayName}</span>
              <span className="admin-role-badge">
                <Shield size={11} />
                <span>Admin Profile</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Navigation">
          <ul className="admin-nav-list">
            {navItems.map((item) => {
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
                    <Icon size={20} className="admin-nav-icon" />
                    <span className="admin-nav-label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenLogoutModal) onOpenLogoutModal();
            }}
            aria-label="Sign out of administration portal"
          >
            <LogOut size={16} className="admin-sidebar-logout-icon" />
            <span>Sign Out</span>
          </button>
          <div className="admin-system-status">
            <span className="admin-status-dot" />
            <span>CareFlow HMS v1.0 • Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
