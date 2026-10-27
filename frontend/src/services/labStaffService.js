import apiClient from './api';

/**
 * CareFlow-HMS Laboratory Staff Dashboard API Service
 * Encapsulates all backend REST API communication for the authenticated Laboratory Staff.
 */
export const labStaffService = {
  // ─── OVERVIEW METRICS & STATS ────────────────────────────────────
  getStats: async () => {
    const response = await apiClient.get('/laboratory/orders/stats/');
    return response.data;
  },

  // ─── LABORATORY TEST ORDERS ──────────────────────────────────────
  getOrders: async (params = {}) => {
    const response = await apiClient.get('/laboratory/orders/', { params });
    return response.data.results || response.data || [];
  },

  getOrderDetails: async (orderId) => {
    const response = await apiClient.get(`/laboratory/orders/${orderId}/`);
    return response.data;
  },

  // ─── WORKFLOW STATUS TRANSITIONS ─────────────────────────────────
  acceptOrder: async (orderId) => {
    const response = await apiClient.patch(`/laboratory/orders/${orderId}/`, {
      status: 'ACCEPTED',
    });
    return response.data;
  },

  startOrder: async (orderId) => {
    const response = await apiClient.patch(`/laboratory/orders/${orderId}/`, {
      status: 'IN_PROGRESS',
    });
    return response.data;
  },

  updateResults: async (orderId, resultsData) => {
    const response = await apiClient.patch(`/laboratory/orders/${orderId}/`, resultsData);
    return response.data;
  },

  completeOrder: async (orderId, resultsData = {}) => {
    const payload = {
      status: 'COMPLETED',
      ...resultsData,
    };
    const response = await apiClient.patch(`/laboratory/orders/${orderId}/`, payload);
    return response.data;
  },

  cancelOrder: async (orderId, reason) => {
    const response = await apiClient.patch(`/laboratory/orders/${orderId}/`, {
      status: 'CANCELLED',
      cancellation_remarks: reason,
    });
    return response.data;
  },

  // ─── CANCELLATION REQUESTS (DOCTOR INITIATED) ───────────────────
  processCancellation: async (orderId, decision, remarks = '') => {
    const response = await apiClient.post(
      `/laboratory/orders/${orderId}/process-cancellation/`,
      { decision, remarks }
    );
    return response.data;
  },

  // ─── REPORT UPLOAD & DOWNLOAD ───────────────────────────────────
  uploadReport: async (orderId, file, markCompleted = false) => {
    const formData = new FormData();
    formData.append('report_file', file);
    if (markCompleted) {
      formData.append('mark_completed', 'true');
    }
    const response = await apiClient.post(
      `/laboratory/orders/${orderId}/upload-report/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  downloadReport: async (orderId) => {
    const response = await apiClient.get(
      `/laboratory/orders/${orderId}/download-report/`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  emailReport: async (orderId, email = null) => {
    const payload = email ? { email } : {};
    const response = await apiClient.post(
      `/laboratory/orders/${orderId}/send-email/`,
      payload
    );
    return response.data;
  },

  // ─── TEST CATALOGUE ─────────────────────────────────────────────
  getTestCatalogue: async (params = {}) => {
    const response = await apiClient.get('/laboratory/tests/', { params });
    return response.data.results || response.data || [];
  },

  // ─── PROFILE & PASSWORD MANAGEMENT ──────────────────────────────
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await apiClient.patch('/auth/profile/', payload);
    return response.data;
  },

  changePassword: async ({ current_password, new_password, confirm_password }) => {
    const response = await apiClient.post('/auth/change-password/', {
      old_password: current_password,
      new_password,
      confirm_password,
    });
    return response.data;
  },
};

export default labStaffService;
