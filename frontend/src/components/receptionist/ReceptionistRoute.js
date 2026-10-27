import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * Route guard component for CareFlow Receptionist Portal pages.
 * - Redirects unauthenticated visitors to /login
 * - Blocks authenticated non-receptionist users with an Access Restricted screen
 */
const ReceptionistRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  const isReceptionist = role === 'RECEPTIONIST';

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isReceptionist) {
    return (
      <div className="admin-access-denied-wrapper">
        <div className="admin-access-denied-card">
          <div className="admin-access-denied-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>Receptionist Portal Restricted</h2>
          <p>
            You are signed in, but this section is designated exclusively for authorized CareFlow Front-Desk Receptionists.
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
              Sign In as Receptionist
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ReceptionistRoute;
