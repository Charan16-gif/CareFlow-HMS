import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import PharmacistHeader from './PharmacistHeader';
import PharmacistSidebar from './PharmacistSidebar';
import PharmacistProfileModal from './PharmacistProfileModal';
import LogoutConfirmModal from '../admin/LogoutConfirmModal';
import authService from '../../services/authService';
import pharmacistService from '../../services/pharmacistService';
import dashboardBgDark from '../../assets/dashboard-bg.jpg';
import dashboardBgWhite from '../../assets/dashboard-bg-white.jpg';

const PharmacistLayout = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [pharmacistUser, setPharmacistUser] = useState(() => authService.getUserProfile());

  const currentBg = currentTheme === 'white' ? dashboardBgWhite : dashboardBgDark;

  useEffect(() => {
    // Refresh pharmacist profile in background on mount
    const fetchFreshProfile = async () => {
      try {
        const fresh = await pharmacistService.getProfile();
        setPharmacistUser(fresh);
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
    setPharmacistUser(updated);
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

      {/* Responsive Sidebar for Pharmacist Portal */}
      <PharmacistSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        pharmacistUser={pharmacistUser}
      />

      {/* Main Pharmacist Workspace */}
      <div className="admin-main-wrapper">
        <PharmacistHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          pharmacistUser={pharmacistUser}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        <main className="admin-content-area" id="pharmacist-main-content">
          <Outlet />
        </main>
      </div>

      {/* Pharmacist Profile & Password Modal */}
      <PharmacistProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Sign Out Confirmation Modal Centered on Screen */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        portalName="CareFlow HMS Pharmacist Portal"
      />
    </div>
  );
};

export default PharmacistLayout;
