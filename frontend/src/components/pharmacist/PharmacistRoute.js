import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * Route guard component for CareFlow Pharmacist Portal pages.
 * - Redirects unauthenticated visitors to /login
 * - Blocks authenticated non-pharmacist users with an Access Restricted screen
 */
const PharmacistRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  const isPharmacist = role === 'PHARMACIST';

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isPharmacist) {
    return (
      <div className="admin-access-denied-wrapper">
        <div className="admin-access-denied-card">
          <div className="admin-access-denied-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>Pharmacist Portal Restricted</h2>
          <p>
            You are signed in, but this section is designated exclusively for licensed CareFlow Hospital Pharmacists.
            Your current account role is: <strong>{role || 'Hospital User'}</strong>.
          </p>
          <div className="admin-access-denied-actions">
            {role === 'ADMIN' ? (
              <Link to="/admin" className="admin-btn admin-btn-primary">
                <span>Go to Admin Dashboard</span>
              </Link>
            ) : role === 'DOCTOR' ? (
              <Link to="/doctor" className="admin-btn admin-btn-primary">
                <span>Go to Doctor Portal</span>
              </Link>
            ) : role === 'LAB_STAFF' ? (
              <Link to="/lab-staff" className="admin-btn admin-btn-primary">
                <span>Go to Lab Staff Portal</span>
              </Link>
            ) : role === 'RECEPTIONIST' ? (
              <Link to="/receptionist" className="admin-btn admin-btn-primary">
                <span>Go to Receptionist Portal</span>
              </Link>
            ) : role === 'PATIENT' ? (
              <Link to="/patient" className="admin-btn admin-btn-primary">
                <span>Go to Patient Portal</span>
              </Link>
            ) : (
              <Link to="/" className="admin-btn admin-btn-outline">
                <ArrowLeft size={16} />
                <span>Return to Home</span>
              </Link>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                authService.logout();
                window.location.href = '/login';
              }}
            >
              Sign In as Pharmacist
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default PharmacistRoute;
