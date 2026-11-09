import axios from 'axios';
import { toast } from '../context/ToastContext';

/**
 * CareFlow-HMS Axios API Client
 * Configured with base URL, timeout, JWT Bearer interceptor,
 * and automatic token refresh queue with request replay on 401.
 */
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag and queue to prevent multiple simultaneous refresh calls (race conditions)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Attach JWT token if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('careflow_access_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Automatic token refresh and request replay on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response or error is not 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do NOT attempt refresh on login or token refresh endpoints themselves
    const reqUrl = originalRequest.url || '';
    if (
      reqUrl.includes('/auth/token/') ||
      reqUrl.includes('/auth/token/refresh/') ||
      originalRequest._retry
    ) {
      if (reqUrl.includes('/auth/token/refresh/')) {
        localStorage.removeItem('careflow_access_token');
        localStorage.removeItem('careflow_refresh_token');
        localStorage.removeItem('careflow_user_role');
        localStorage.removeItem('careflow_user_profile');
      }
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('careflow_refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('careflow_access_token');
      localStorage.removeItem('careflow_user_role');
      localStorage.removeItem('careflow_user_profile');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If another request is currently refreshing the token, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use clean axios instance to bypass interceptors for the refresh request
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newAccessToken = refreshResponse.data.access;
      localStorage.setItem('careflow_access_token', newAccessToken);

      if (refreshResponse.data.refresh) {
        localStorage.setItem('careflow_refresh_token', refreshResponse.data.refresh);
      }

      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Notify and resolve all queued requests with the new token
      processQueue(null, newAccessToken);

      // Replay the original failed request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh token is expired, invalid, or blacklisted -> end session safely
      processQueue(refreshError, null);

      localStorage.removeItem('careflow_access_token');
      localStorage.removeItem('careflow_refresh_token');
      localStorage.removeItem('careflow_user_role');
      localStorage.removeItem('careflow_user_profile');

      toast.warning('Your session has expired. Please sign in again.', 'Session Expired');

      // Only redirect if user is not already on login or public auth page
      const currentPath = window.location.pathname;
      const isPublicPath = [
        '/',
        '/login',
        '/register',
        '/verify-email',
        '/forgot-password',
        '/reset-password',
      ].includes(currentPath);

      if (!isPublicPath) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Health check helper to verify backend connectivity and database status
 */
export const fetchBackendHealth = async () => {
  try {
    const response = await apiClient.get('/health/');
    return {
      connected: true,
      data: response.data,
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      data: null,
      error: err.message || 'Unable to reach backend API',
    };
  }
};

/**
 * Report client-side frontend errors to the backend centralized log
 */
export const logFrontendErrorToBackend = async (errorInfo) => {
  try {
    await apiClient.post('/logs/frontend/', errorInfo);
  } catch (err) {
    // Fail silently so logging failures don't cause secondary crashes
  }
};

export default apiClient;
