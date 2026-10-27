import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * Route guard component for CareFlow Admin pages.
 * - Redirects unauthenticated visitors to /login
 * - Blocks authenticated non-admin users with an Access Denied screen
 */
const AdminRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-wrapper">
        <div className="admin-access-denied-card">
          <div className="admin-access-denied-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>Access Restricted</h2>
          <p>
            You are signed in, but this section requires Hospital Administrator privileges.
            Your current account role is: <strong>{authService.getUserRole() || 'Standard User'}</strong>.
          </p>
          <div className="admin-access-denied-actions">
            <Link to="/" className="admin-btn admin-btn-outline">
              <ArrowLeft size={16} />
              <span>Return to Home</span>
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => {
                authService.logout();
                window.location.href = '/login';
              }}
            >
              Sign In as Administrator
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
