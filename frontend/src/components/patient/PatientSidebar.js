import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Activity,
  LogOut,
  User,
  HeartPulse,
  FlaskConical,
} from 'lucide-react';

const patientNavItems = [
  {
    path: '/patient',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: '/patient/appointments',
    label: 'Appointments',
    icon: Calendar,
    end: false,
  },
  {
    path: '/patient/prescriptions',
    label: 'Prescriptions',
    icon: FileText,
    end: false,
  },
  {
    path: '/patient/medicines',
    label: 'Medicines',
    icon: Pill,
    end: false,
  },
  {
    path: '/patient/lab-tests',
    label: 'My Lab Tests',
    icon: FlaskConical,
    end: false,
  },
];

const PatientSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  patientUser,
}) => {
  const displayName = patientUser
    ? `${patientUser.first_name || ''} ${patientUser.last_name || ''}`.trim() || patientUser.username
    : 'Patient';

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
        aria-label="Patient Portal Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/patient" className="admin-sidebar-brand-link" onClick={onClose}>
            <div className="admin-brand-icon-box">
              <Activity size={22} className="admin-brand-icon" />
            </div>
            <div className="admin-brand-text">
              <span className="admin-brand-name">CareFlow</span>
              <span className="admin-brand-tag">Patient Portal</span>
            </div>
          </Link>
        </div>

        {/* Patient Profile in Sidebar (Prominent in Mobile View) */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit patient profile"
            title="Patient Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{displayName}</span>
              <span className="admin-role-badge">
                <HeartPulse size={11} />
                <span>Patient Profile</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Navigation">
          <ul className="admin-nav-list">
            {patientNavItems.map((item) => {
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
            aria-label="Sign out of patient portal"
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

export default PatientSidebar;
