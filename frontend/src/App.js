import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import NotFoundPage from './pages/NotFoundPage';
import { ToastProvider } from './context/ToastContext';

// Admin Dashboard Components & Pages
import AdminRoute from './components/admin/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPrescriptionsPage from './pages/admin/AdminPrescriptionsPage';
import AdminTabletsPage from './pages/admin/AdminTabletsPage';
import AdminLabReportsPage from './pages/admin/AdminLabReportsPage';

// Patient Dashboard Components & Pages
import PatientRoute from './components/patient/PatientRoute';
import PatientLayout from './components/patient/PatientLayout';
import PatientOverviewPage from './pages/patient/PatientOverviewPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage';
import PatientMedicinesPage from './pages/patient/PatientMedicinesPage';
import PatientLabTestsPage from './pages/patient/PatientLabTestsPage';

// Doctor Dashboard Components & Pages
import DoctorRoute from './components/doctor/DoctorRoute';
import DoctorLayout from './components/doctor/DoctorLayout';
import DoctorOverviewPage from './pages/doctor/DoctorOverviewPage';
import DoctorSchedulePage from './pages/doctor/DoctorSchedulePage';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage';
import DoctorLabTestsPage from './pages/doctor/DoctorLabTestsPage';

// Lab Staff Dashboard Components & Pages
import LabStaffRoute from './components/labStaff/LabStaffRoute';
import LabStaffLayout from './components/labStaff/LabStaffLayout';
import LabStaffOverviewPage from './pages/labStaff/LabStaffOverviewPage';
import LabStaffTestRequestsPage from './pages/labStaff/LabStaffTestRequestsPage';
import LabStaffEnterResultsPage from './pages/labStaff/LabStaffEnterResultsPage';
import LabStaffTestResultDetailsPage from './pages/labStaff/LabStaffTestResultDetailsPage';
import LabStaffReportsPage from './pages/labStaff/LabStaffReportsPage';

// Receptionist Dashboard Components & Pages
import ReceptionistRoute from './components/receptionist/ReceptionistRoute';
import ReceptionistLayout from './components/receptionist/ReceptionistLayout';
import ReceptionistOverviewPage from './pages/receptionist/ReceptionistOverviewPage';
import ReceptionistPatientsPage from './pages/receptionist/ReceptionistPatientsPage';
import ReceptionistAppointmentsPage from './pages/receptionist/ReceptionistAppointmentsPage';
import ReceptionistCheckInPage from './pages/receptionist/ReceptionistCheckInPage';
import ReceptionistDoctorSchedulePage from './pages/receptionist/ReceptionistDoctorSchedulePage';
import ReceptionistPaymentsPage from './pages/receptionist/ReceptionistPaymentsPage';

// Pharmacist Dashboard Components & Pages
import PharmacistRoute from './components/pharmacist/PharmacistRoute';
import PharmacistLayout from './components/pharmacist/PharmacistLayout';
import PharmacistOverviewPage from './pages/pharmacist/PharmacistOverviewPage';
import PharmacistInventoryPage from './pages/pharmacist/PharmacistInventoryPage';
import PharmacistBuyingPaymentPage from './pages/pharmacist/PharmacistBuyingPaymentPage';

import { fetchBackendHealth } from './services/api';
import './styles/index.css';
import './styles/adminDashboard.css';
import './App.css';

const VALID_THEMES = ['default', 'white', 'black'];

const getInitialTheme = () => {
  try {
    const saved =
      localStorage.getItem('careflow_theme') ||
      localStorage.getItem('careflow_landing_theme');
    if (saved && VALID_THEMES.includes(saved)) {
      return saved;
    }
  } catch (err) {
    // Graceful fallback if localStorage is unavailable
  }
  return 'default';
};

function AppContent({ backendConnected, backendChecking }) {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isPatientPage = location.pathname.startsWith('/patient');
  const isDoctorPage = location.pathname.startsWith('/doctor');
  const isLabStaffPage = location.pathname.startsWith('/lab-staff');
  const isReceptionistPage = location.pathname.startsWith('/receptionist');
  const isPharmacistPage = location.pathname.startsWith('/pharmacist');

  const [theme, setTheme] = useState(getInitialTheme);

  const handleThemeChange = (newTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setTheme(newTheme);
      try {
        localStorage.setItem('careflow_theme', newTheme);
        localStorage.setItem('careflow_landing_theme', newTheme);
      } catch (err) {
        // Silently handle storage errors
      }
    }
  };

  // Apply selected theme globally across ALL pages without exception
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // For Admin pages, render direct dashboard routes with theme propagation
  if (isAdminPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </AdminRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="prescriptions" element={<AdminPrescriptionsPage />} />
            <Route path="tablets" element={<AdminTabletsPage />} />
            <Route path="lab-reports" element={<AdminLabReportsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  // For Patient pages, render exact dashboard layout and patient routes
  if (isPatientPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/patient"
            element={
              <PatientRoute>
                <PatientLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </PatientRoute>
            }
          >
            <Route index element={<PatientOverviewPage />} />
            <Route path="appointments" element={<PatientAppointmentsPage />} />
            <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
            <Route path="medicines" element={<PatientMedicinesPage />} />
            <Route path="lab-tests" element={<PatientLabTestsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  // For Doctor pages, render exact dashboard layout and doctor routes
  if (isDoctorPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/doctor"
            element={
              <DoctorRoute>
                <DoctorLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </DoctorRoute>
            }
          >
            <Route index element={<DoctorOverviewPage />} />
            <Route path="schedule" element={<DoctorSchedulePage />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
            <Route path="lab-tests" element={<DoctorLabTestsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  // For Lab Staff pages, render exact dashboard layout and lab staff routes
  if (isLabStaffPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/lab-staff"
            element={
              <LabStaffRoute>
                <LabStaffLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </LabStaffRoute>
            }
          >
            <Route index element={<LabStaffOverviewPage />} />
            <Route path="test-requests" element={<LabStaffTestRequestsPage />} />
            <Route path="enter-results" element={<LabStaffEnterResultsPage />} />
            <Route path="enter-results/:orderId" element={<LabStaffEnterResultsPage />} />
            <Route path="results/:orderId" element={<LabStaffTestResultDetailsPage />} />
            <Route path="reports" element={<LabStaffReportsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  // For Receptionist pages, render exact dashboard layout and receptionist routes
  if (isReceptionistPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/receptionist"
            element={
              <ReceptionistRoute>
                <ReceptionistLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </ReceptionistRoute>
            }
          >
            <Route index element={<ReceptionistOverviewPage />} />
            <Route path="patients" element={<ReceptionistPatientsPage />} />
            <Route path="appointments" element={<ReceptionistAppointmentsPage />} />
            <Route path="check-in" element={<ReceptionistCheckInPage />} />
            <Route path="schedule" element={<ReceptionistDoctorSchedulePage />} />
            <Route path="payments" element={<ReceptionistPaymentsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  // For Pharmacist pages, render exact dashboard layout and pharmacist routes
  if (isPharmacistPage) {
    return (
      <div className="careflow-app-layout" data-theme={theme}>
        <Routes>
          <Route
            path="/pharmacist"
            element={
              <PharmacistRoute>
                <PharmacistLayout
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </PharmacistRoute>
            }
          >
            <Route index element={<PharmacistOverviewPage />} />
            <Route path="stock" element={<PharmacistInventoryPage />} />
            <Route path="buying-payment" element={<PharmacistBuyingPaymentPage />} />
            {/* Backward-compatible aliases for legacy URLs */}
            <Route path="inventory" element={<PharmacistInventoryPage />} />
            <Route path="stock-status" element={<PharmacistInventoryPage />} />
            <Route path="stock-management" element={<PharmacistInventoryPage />} />
            <Route path="dispense" element={<PharmacistBuyingPaymentPage />} />
            <Route path="history" element={<PharmacistBuyingPaymentPage />} />
            <Route path="sales" element={<PharmacistBuyingPaymentPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div
      className="careflow-app-layout"
      data-theme={theme}
    >
      {/* Navbar present ONLY on landing page */}
      {isLandingPage && (
        <Navbar
          currentTheme={theme}
          onThemeChange={handleThemeChange}
        />
      )}
      <main className={`careflow-main-content ${isLandingPage ? 'has-fixed-navbar' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* Footer: full navigation on landing page only; minimal copyright on other pages */}
      <Footer showNavigation={isLandingPage} />
    </div>
  );
}

function App() {
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendChecking, setBackendChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      setBackendChecking(true);
      const res = await fetchBackendHealth();
      if (isMounted) {
        setBackendConnected(res.connected);
        setBackendChecking(false);
      }
    };

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Router>
      <ToastProvider>
        <AppContent
          backendConnected={backendConnected}
          backendChecking={backendChecking}
        />
      </ToastProvider>
    </Router>
  );
}

export default App;
