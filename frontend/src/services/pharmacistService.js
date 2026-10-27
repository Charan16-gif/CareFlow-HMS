import apiClient from './api';

/**
 * CareFlow-HMS Pharmacist Dashboard API Service
 * Encapsulates all backend REST API communication for pharmacy operations:
 * - Real-time Pharmacy Overview Statistics & Metrics
 * - Medicine Inventory CRUD (Cataloguing, Dosage Forms, Safe Archiving)
 * - Stock Classification, Alerts, and Threshold Monitoring
 * - Stock Management Ledger & Audit Trail (Receiving, Adjusting, Discarding)
 * - Safe Prescription Dispensing & Atomic Stock Deduction
 * - Pharmacy Sales, Billing Invoices, Payment Processing & Receipts
 * - Historical Audit Logs (Dispensing Records, Stock Movements, Billing Transactions)
 * - Pharmacist Profile & Security Management
 */
export const pharmacistService = {
  // ─── OVERVIEW METRICS & STATS ──────────────────────────────────
  getStats: async () => {
    const res = await apiClient.get('/pharmacy/medicines/stats/');
    return res.data;
  },

  // ─── MEDICINE INVENTORY ─────────────────────────────────────────
  getMedicines: async (params = {}) => {
    const res = await apiClient.get('/pharmacy/medicines/', { params });
    return res.data.results || res.data || [];
  },

  getMedicineDetails: async (medicineId) => {
    const res = await apiClient.get(`/pharmacy/medicines/${medicineId}/`);
    return res.data;
  },

  createMedicine: async (medicineData) => {
    const res = await apiClient.post('/pharmacy/medicines/', medicineData);
    return res.data;
  },

  updateMedicine: async (medicineId, medicineData) => {
    const res = await apiClient.patch(`/pharmacy/medicines/${medicineId}/`, medicineData);
    return res.data;
  },

  deleteMedicine: async (medicineId) => {
    const res = await apiClient.delete(`/pharmacy/medicines/${medicineId}/`);
    return res.data;
  },

  // ─── STOCK MANAGEMENT & AUDIT TRAIL ─────────────────────────────
  adjustStock: async (medicineId, stockData) => {
    const res = await apiClient.post(`/pharmacy/medicines/${medicineId}/adjust-stock/`, stockData);
    return res.data;
  },

  getStockMovements: async (params = {}) => {
    const res = await apiClient.get('/pharmacy/stock-movements/', { params });
    return res.data.results || res.data || [];
  },

  // ─── PRESCRIPTIONS & PATIENTS ───────────────────────────────────
  getPrescriptions: async (params = {}) => {
    const res = await apiClient.get('/pharmacy/prescriptions/', { params });
    return res.data.results || res.data || [];
  },

  getPrescriptionDetails: async (prescriptionId) => {
    const res = await apiClient.get(`/pharmacy/prescriptions/${prescriptionId}/`);
    return res.data;
  },

  getPatients: async (params = {}) => {
    const res = await apiClient.get('/patients/', { params });
    return res.data.results || res.data || [];
  },

  getPatientDetails: async (patientId) => {
    const res = await apiClient.get(`/patients/${patientId}/`);
    return res.data;
  },

  // ─── DISPENSING WORKFLOW ────────────────────────────────────────
  dispenseMedicines: async (dispenseData) => {
    const res = await apiClient.post('/pharmacy/dispensations/', dispenseData);
    return res.data;
  },

  getDispensations: async (params = {}) => {
    const res = await apiClient.get('/pharmacy/dispensations/', { params });
    return res.data.results || res.data || [];
  },

  getDispenseDetails: async (dispenseId) => {
    const res = await apiClient.get(`/pharmacy/dispensations/${dispenseId}/`);
    return res.data;
  },

  // ─── PHARMACY SALES, BILLING & RECEIPTS ─────────────────────────
  getBills: async (params = {}) => {
    const res = await apiClient.get('/billing/invoices/', { params });
    return res.data.results || res.data || [];
  },

  getBillDetails: async (billId) => {
    const res = await apiClient.get(`/billing/invoices/${billId}/`);
    return res.data;
  },

  getPayments: async (params = {}) => {
    const res = await apiClient.get('/billing/payments/', { params });
    return res.data.results || res.data || [];
  },

  getPaymentDetails: async (paymentId) => {
    const res = await apiClient.get(`/billing/payments/${paymentId}/`);
    return res.data;
  },

  checkoutPurchase: async (checkoutData) => {
    const res = await apiClient.post('/billing/invoices/checkout/', checkoutData);
    return res.data;
  },

  // ─── PHARMACIST PROFILE & PASSWORD ──────────────────────────────
  getProfile: async () => {
    const res = await apiClient.get('/auth/profile/');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await apiClient.patch('/auth/profile/', data);
    return res.data;
  },

  changePassword: async (data) => {
    const res = await apiClient.post('/auth/change-password/', data);
    return res.data;
  },
};

export default pharmacistService;
