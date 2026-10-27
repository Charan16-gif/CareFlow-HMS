import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Clock,
  CreditCard,
  LogOut,
  User,
  HeartPulse,
} from 'lucide-react';

const receptionistNavItems = [
  {
    path: '/receptionist',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    path: '/receptionist/patients',
    label: 'Patients',
    icon: Users,
    end: false,
  },
  {
    path: '/receptionist/appointments',
    label: 'Appointments',
    icon: Calendar,
    end: false,
  },
  {
    path: '/receptionist/check-in',
    label: 'Check-in & Waiting',
    icon: UserCheck,
    end: false,
  },
  {
    path: '/receptionist/schedule',
    label: 'Doctor Schedule',
    icon: Clock,
    end: false,
  },
  {
    path: '/receptionist/payments',
    label: 'Payment Status',
    icon: CreditCard,
    end: false,
  },
];

const ReceptionistSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  receptionistUser,
}) => {
  const staffName = receptionistUser
    ? (receptionistUser.first_name
        ? `${receptionistUser.first_name} ${receptionistUser.last_name || ''}`.trim()
        : receptionistUser.username)
    : 'Receptionist';

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
        aria-label="Receptionist Portal Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/receptionist" className="admin-sidebar-brand-link" onClick={onClose}>
            <div
              className="admin-brand-icon-box"
              style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(16, 185, 129, 0.35))',
              }}
            >
              <HeartPulse size={22} className="admin-brand-icon" style={{ color: '#0ea5e9' }} />
            </div>
            <div className="admin-brand-text-box">
              <span className="admin-brand-name">CareFlow</span>
              <span
                className="admin-brand-tag"
                style={{ color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.35)' }}
              >
                FRONT DESK
              </span>
            </div>
          </Link>
        </div>

        {/* Receptionist Profile in Sidebar */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit receptionist profile"
            title="Receptionist Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{staffName}</span>
              <span className="admin-role-badge">
                <UserCheck size={11} />
                <span>Receptionist</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Receptionist Navigation">
          <ul className="admin-nav-list">
            {receptionistNavItems.map((item) => {
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
            aria-label="Sign out of CareFlow Receptionist Portal"
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

export default ReceptionistSidebar;
