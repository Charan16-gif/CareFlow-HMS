import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import PatientHeader from './PatientHeader';
import PatientSidebar from './PatientSidebar';
import PatientProfileModal from './PatientProfileModal';
import LogoutConfirmModal from '../admin/LogoutConfirmModal';
import authService from '../../services/authService';
import patientService from '../../services/patientService';
import dashboardBgDark from '../../assets/dashboard-bg.jpg';
import dashboardBgWhite from '../../assets/dashboard-bg-white.jpg';

const PatientLayout = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [patientUser, setPatientUser] = useState(() => authService.getUserProfile());

  const currentBg = currentTheme === 'white' ? dashboardBgWhite : dashboardBgDark;

  useEffect(() => {
    // Refresh patient profile in background on mount
    const fetchFreshProfile = async () => {
      try {
        const fresh = await patientService.getProfile();
        setPatientUser(fresh);
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
    setPatientUser(updated);
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

      {/* Reusable Responsive Sidebar with 4 Patient Navigation Items */}
      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        patientUser={patientUser}
      />

      {/* Main Patient Workspace */}
      <div className="admin-main-wrapper">
        <PatientHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          patientUser={patientUser}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        <main className="admin-content-area" id="patient-main-content">
          <Outlet />
        </main>
      </div>

      {/* Patient Profile & Password Modal */}
      <PatientProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Sign Out Confirmation Modal Centered on Screen */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        portalName="Patient Portal"
      />
    </div>
  );
};

export default PatientLayout;
