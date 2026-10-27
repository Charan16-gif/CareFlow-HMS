import apiClient from './api';
import { toast } from '../context/ToastContext';

/**
 * CareFlow-HMS Authentication Service
 * Manages JWT tokens, login, token refresh, and logout
 */
export const authService = {
  /**
   * Obtain JWT token pair (access & refresh)
   */
  login: async (username, password, role = '') => {
    const payload = { username, password };
    if (role) payload.role = role;
    const response = await apiClient.post('/auth/token/', payload);
    if (response.data.access) {
      localStorage.setItem('careflow_access_token', response.data.access);
      localStorage.setItem('careflow_refresh_token', response.data.refresh);
      if (response.data.user && response.data.user.role) {
        localStorage.setItem('careflow_user_role', response.data.user.role);
        localStorage.setItem('careflow_user_profile', JSON.stringify(response.data.user));
      }
      try {
        const profileRes = await apiClient.get('/auth/profile/');
        if (profileRes.data) {
          localStorage.setItem('careflow_user_role', profileRes.data.role);
          localStorage.setItem('careflow_user_profile', JSON.stringify(profileRes.data));
        }
      } catch (err) {
        // Fallback already stored
      }
    }
    return response.data;
  },

  /**
   * Refresh existing access token
   */
  refreshToken: async () => {
    const refresh = localStorage.getItem('careflow_refresh_token');
    if (!refresh) throw new Error('No refresh token found');

    const response = await apiClient.post('/auth/token/refresh/', { refresh });
    if (response.data.access) {
      localStorage.setItem('careflow_access_token', response.data.access);
    }
    return response.data;
  },

  /**
   * Verify token validity
   */
  verifyToken: async (token) => {
    const response = await apiClient.post('/auth/token/verify/', { token });
    return response.data;
  },

  /**
   * Logout and clear local tokens and user profile
   */
  logout: () => {
    localStorage.removeItem('careflow_access_token');
    localStorage.removeItem('careflow_refresh_token');
    localStorage.removeItem('careflow_user_role');
    localStorage.removeItem('careflow_user_profile');
    toast.info('You have been logged out safely. See you soon!', 'Logged Out');
  },

  /**
   * Register a new user account and trigger real OTP email dispatch
   */
  register: async ({ firstName, lastName, username, email, phone, password, confirmPassword }) => {
    const payload = {
      first_name: firstName,
      last_name: lastName,
      username: username || '',
      email: email,
      phone: phone || '',
      password: password,
      confirm_password: confirmPassword,
    };
    const response = await apiClient.post('/auth/register/', payload);
    return response.data;
  },

  /**
   * Verify 6-digit OTP code submitted by user
   */
  verifyOtp: async ({ email, otpCode, purpose = 'registration' }) => {
    const response = await apiClient.post('/auth/verify-otp/', {
      email,
      otp_code: otpCode,
      purpose,
    });
    if (response.data && response.data.tokens) {
      if (response.data.tokens.access) {
        localStorage.setItem('careflow_access_token', response.data.tokens.access);
      }
      if (response.data.tokens.refresh) {
        localStorage.setItem('careflow_refresh_token', response.data.tokens.refresh);
      }
    }
    return response.data;
  },

  /**
   * Resend a fresh 6-digit OTP code to the user's email
   */
  resendOtp: async ({ email, purpose = 'registration' }) => {
    const response = await apiClient.post('/auth/resend-otp/', {
      email,
      purpose,
    });
    return response.data;
  },

  /**
   * Check SMTP configuration status from backend
   */
  getEmailStatus: async () => {
    const response = await apiClient.get('/auth/email-status/');
    return response.data;
  },

  /**
   * Send test email to verify SMTP functionality
   */
  sendTestEmail: async (recipientEmail) => {
    const response = await apiClient.post('/auth/test-email/', {
      recipient_email: recipientEmail,
    });
    return response.data;
  },

  /**
   * Check if user is authenticated locally
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('careflow_access_token');
  },

  /**
   * Get cached user role
   */
  getUserRole: () => {
    return localStorage.getItem('careflow_user_role') || '';
  },

  /**
   * Check if user has ADMIN role
   */
  isAdmin: () => {
    return localStorage.getItem('careflow_user_role') === 'ADMIN';
  },

  /**
   * Check if user has DOCTOR role
   */
  isDoctor: () => {
    return localStorage.getItem('careflow_user_role') === 'DOCTOR';
  },

  /**
   * Check if user has LAB_STAFF role
   */
  isLabStaff: () => {
    return localStorage.getItem('careflow_user_role') === 'LAB_STAFF';
  },

  /**
   * Check if user has RECEPTIONIST role
   */
  isReceptionist: () => {
    return localStorage.getItem('careflow_user_role') === 'RECEPTIONIST';
  },

  /**
   * Check if user has PHARMACIST role
   */
  isPharmacist: () => {
    return localStorage.getItem('careflow_user_role') === 'PHARMACIST';
  },

  /**
   * Get cached user profile object
   */
  getUserProfile: () => {
    try {
      const data = localStorage.getItem('careflow_user_profile');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Fetch current profile from backend and refresh storage
   */
  fetchProfile: async () => {
    const res = await apiClient.get('/auth/profile/');
    if (res.data) {
      localStorage.setItem('careflow_user_role', res.data.role);
      localStorage.setItem('careflow_user_profile', JSON.stringify(res.data));
    }
    return res.data;
  },

  /**
   * Request password reset link dispatched to user's registered email
   */
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/password-reset/', { email });
    return response.data;
  },

  /**
   * Confirm password reset with UID, token, and new password
   */
  confirmPasswordReset: async ({ uid, token, newPassword, confirmPassword }) => {
    const response = await apiClient.post('/auth/password-reset/confirm/', {
      uid,
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return response.data;
  },
};

export default authService;

