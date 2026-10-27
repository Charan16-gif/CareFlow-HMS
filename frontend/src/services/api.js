import axios from 'axios';

/**
 * CareFlow-HMS Axios API Client
 * Configured with base URL, timeout, and JWT authorization headers.
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

// Request interceptor: Attach JWT token if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('careflow_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Normalize errors and handle unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('careflow_access_token');
    }
    return Promise.reject(error);
  }
);

/**
 * Health check helper to verify backend connectivity
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

export default apiClient;
