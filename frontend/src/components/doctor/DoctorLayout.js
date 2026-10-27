import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DoctorHeader from './DoctorHeader';
import DoctorSidebar from './DoctorSidebar';
import DoctorProfileModal from './DoctorProfileModal';
import LogoutConfirmModal from '../admin/LogoutConfirmModal';
import authService from '../../services/authService';
import doctorService from '../../services/doctorService';
import dashboardBgDark from '../../assets/dashboard-bg.jpg';
import dashboardBgWhite from '../../assets/dashboard-bg-white.jpg';

const DoctorLayout = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [doctorUser, setDoctorUser] = useState(() => authService.getUserProfile());

  const currentBg = currentTheme === 'white' ? dashboardBgWhite : dashboardBgDark;

  useEffect(() => {
    // Refresh doctor profile in background on mount
    const fetchFreshProfile = async () => {
      try {
        const fresh = await doctorService.getProfile();
        setDoctorUser(fresh);
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
    setDoctorUser(updated);
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

      {/* Reusable Responsive Sidebar with 4 Doctor Navigation Items */}
      <DoctorSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        doctorUser={doctorUser}
      />

      {/* Main Doctor Workspace */}
      <div className="admin-main-wrapper">
        <DoctorHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          doctorUser={doctorUser}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        <main className="admin-content-area" id="doctor-main-content">
          <Outlet />
        </main>
      </div>

      {/* Doctor Profile & Password Modal */}
      <DoctorProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Sign Out Confirmation Modal Centered on Screen */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        portalName="Doctor Portal"
      />
    </div>
  );
};

export default DoctorLayout;
