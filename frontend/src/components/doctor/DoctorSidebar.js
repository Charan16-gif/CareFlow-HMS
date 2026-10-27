import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  FileText,
  Activity,
  LogOut,
  User,
  Stethoscope,
  FlaskConical,
} from 'lucide-react';

const doctorNavItems = [
  {
    path: '/doctor',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: '/doctor/schedule',
    label: 'My Schedule',
    icon: Clock,
    end: false,
  },
  {
    path: '/doctor/appointments',
    label: 'Appointments',
    icon: Calendar,
    end: false,
  },
  {
    path: '/doctor/prescriptions',
    label: 'Prescriptions',
    icon: FileText,
    end: false,
  },
  {
    path: '/doctor/lab-tests',
    label: 'Lab Tests',
    icon: FlaskConical,
    end: false,
  },
];

const DoctorSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  doctorUser,
}) => {
  const doctorName = doctorUser
    ? (doctorUser.first_name ? `Dr. ${doctorUser.first_name} ${doctorUser.last_name || ''}`.trim() : doctorUser.username)
    : 'Doctor';

  const specialization = doctorUser?.specialization || 'Doctor Profile';

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
        aria-label="Doctor Portal Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/doctor" className="admin-sidebar-brand-link" onClick={onClose}>
            <div className="admin-brand-icon-box">
              <Activity size={22} className="admin-brand-icon" />
            </div>
            <div className="admin-brand-text">
              <span className="admin-brand-name">CareFlow</span>
              <span className="admin-brand-tag">Doctor Portal</span>
            </div>
          </Link>
        </div>

        {/* Doctor Profile in Sidebar (Prominent in Mobile View) */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit doctor profile"
            title="Doctor Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{doctorName}</span>
              <span className="admin-role-badge">
                <Stethoscope size={11} />
                <span>{specialization}</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Navigation">
          <ul className="admin-nav-list">
            {doctorNavItems.map((item) => {
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
            aria-label="Sign out of doctor portal"
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

export default DoctorSidebar;
