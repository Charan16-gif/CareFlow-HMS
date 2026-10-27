import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminProfileModal from './AdminProfileModal';
import LogoutConfirmModal from './LogoutConfirmModal';
import authService from '../../services/authService';
import dashboardBgDark from '../../assets/dashboard-bg.jpg';
import dashboardBgWhite from '../../assets/dashboard-bg-white.jpg';

const AdminLayout = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(() => authService.getUserProfile());

  const currentBg = currentTheme === 'white' ? dashboardBgWhite : dashboardBgDark;

  useEffect(() => {
    // Refresh admin profile in background on mount
    const fetchFreshProfile = async () => {
      try {
        const fresh = await authService.fetchProfile();
        setAdminUser(fresh);
      } catch (e) {
        // Fallback to cached profile
      }
    };
    fetchFreshProfile();
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleProfileUpdated = (updated) => {
    setAdminUser(updated);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="admin-app-container">
      {/* High-Tech Futuristic Digital Hospital Theme Atmosphere */}
      <div className="admin-dashboard-atmosphere" aria-hidden="true">
        <div
          className="admin-dashboard-bg-image"
          style={{ backgroundImage: `url(${currentBg})` }}
        />
        <div className="admin-dashboard-gradient-overlay" />
        <div className="admin-dashboard-ambient-glow" />
      </div>

      {/* Reusable Responsive Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        adminUser={adminUser}
      />

      {/* Main Administrative Workspace */}
      <div className="admin-main-wrapper">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          adminUser={adminUser}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        <main className="admin-content-area" id="admin-main-content">
          <Outlet />
        </main>
      </div>

      {/* Admin Profile & Password Modal */}
      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Sign Out Confirmation Modal Centered on Screen */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default AdminLayout;

