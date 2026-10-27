import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  LogOut,
  User,
  HeartPulse,
} from 'lucide-react';

const pharmacistNavItems = [
  {
    path: '/pharmacist',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
    aliases: ['/pharmacist'],
  },
  {
    path: '/pharmacist/stock',
    label: 'Medicines Stock',
    icon: Pill,
    end: false,
    aliases: ['/pharmacist/stock', '/pharmacist/inventory', '/pharmacist/stock-status', '/pharmacist/stock-management'],
  },
  {
    path: '/pharmacist/buying-payment',
    label: 'Medicines Buying & Payment',
    icon: ShoppingCart,
    end: false,
    aliases: ['/pharmacist/buying-payment', '/pharmacist/dispense', '/pharmacist/history', '/pharmacist/sales'],
  },
];

const PharmacistSidebar = ({
  isOpen,
  onClose,
  onOpenLogoutModal,
  onOpenProfile,
  pharmacistUser,
}) => {
  const location = useLocation();
  const staffName = pharmacistUser
    ? (pharmacistUser.first_name
        ? `${pharmacistUser.first_name} ${pharmacistUser.last_name || ''}`.trim()
        : pharmacistUser.username)
    : 'Pharmacist';

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
        aria-label="Pharmacist Portal Navigation"
      >
        <div className="admin-sidebar-brand">
          <Link to="/pharmacist" className="admin-sidebar-brand-link" onClick={onClose}>
            <div
              className="admin-brand-icon-box"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.35))',
              }}
            >
              <HeartPulse size={22} className="admin-brand-icon" style={{ color: '#10b981' }} />
            </div>
            <div className="admin-brand-text-box">
              <span className="admin-brand-name">CareFlow</span>
              <span
                className="admin-brand-tag"
                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}
              >
                PHARMACY
              </span>
            </div>
          </Link>
        </div>

        {/* Pharmacist Profile in Sidebar */}
        <div className="admin-sidebar-profile-box">
          <button
            type="button"
            className="admin-sidebar-profile-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            aria-label="View and edit pharmacist profile"
            title="Pharmacist Profile"
          >
            <div className="admin-avatar-chip">
              <User size={18} />
            </div>
            <div className="admin-sidebar-profile-info">
              <span className="admin-sidebar-name">{staffName}</span>
              <span className="admin-role-badge">
                <Pill size={11} />
                <span>Pharmacist</span>
              </span>
            </div>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Main Pharmacist Navigation">
          <ul className="admin-nav-list">
            {pharmacistNavItems.map((item) => {
              const Icon = item.icon;
              const isMatch = item.aliases?.includes(location.pathname);
              return (
                <li key={item.path} className="admin-nav-item">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `admin-nav-link ${isActive || isMatch ? 'admin-nav-link-active' : ''}`
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

        {/* Sidebar Footer with Logout action */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenLogoutModal) onOpenLogoutModal();
            }}
            aria-label="Sign out from pharmacist portal"
          >
            <LogOut size={18} className="admin-logout-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default PharmacistSidebar;
