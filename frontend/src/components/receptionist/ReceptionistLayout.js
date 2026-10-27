import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import ReceptionistHeader from './ReceptionistHeader';
import ReceptionistSidebar from './ReceptionistSidebar';
import ReceptionistProfileModal from './ReceptionistProfileModal';
import LogoutConfirmModal from '../admin/LogoutConfirmModal';
import authService from '../../services/authService';
import receptionistService from '../../services/receptionistService';
import dashboardBgDark from '../../assets/dashboard-bg.jpg';
import dashboardBgWhite from '../../assets/dashboard-bg-white.jpg';

const ReceptionistLayout = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [receptionistUser, setReceptionistUser] = useState(() => authService.getUserProfile());

  const currentBg = currentTheme === 'white' ? dashboardBgWhite : dashboardBgDark;

  useEffect(() => {
    // Refresh receptionist profile in background on mount
    const fetchFreshProfile = async () => {
      try {
        const fresh = await receptionistService.getProfile();
        setReceptionistUser(fresh);
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
    setReceptionistUser(updated);
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

      {/* Responsive Sidebar for Receptionist Portal */}
      <ReceptionistSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        receptionistUser={receptionistUser}
      />

      {/* Main Receptionist Workspace */}
      <div className="admin-main-wrapper">
        <ReceptionistHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          receptionistUser={receptionistUser}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        <main className="admin-content-area" id="receptionist-main-content">
          <Outlet />
        </main>
      </div>

      {/* Receptionist Profile & Password Modal */}
      <ReceptionistProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Sign Out Confirmation Modal Centered on Screen */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        portalName="CareFlow HMS Receptionist Portal"
      />
    </div>
  );
};

export default ReceptionistLayout;
