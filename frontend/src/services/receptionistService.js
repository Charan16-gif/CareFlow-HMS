import apiClient from './api';

/**
 * CareFlow-HMS Receptionist Dashboard API Service
 * Encapsulates all backend REST API communication for front-desk reception operations:
 * - Real-time Receptionist Overview Statistics
 * - Appointment Scheduling, Check-in, Waiting List, Rescheduling, and Cancellation
 * - Doctor Availability & Slot Inspection
 * - Patient Demographics Registration, Lookup, and Profile Updates
 * - Safe Read-only Billing Invoices and Receipts
 * - Personal Profile & Account Security Management
 */
export const receptionistService = {
  // ─── OVERVIEW METRICS ───────────────────────────────────────────
  getStats: async () => {
    const res = await apiClient.get('/appointments/receptionist-stats/');
    return res.data;
  },

  // ─── APPOINTMENT MANAGEMENT ─────────────────────────────────────
  getAppointments: async (params = {}) => {
    const res = await apiClient.get('/appointments/', { params });
    return res.data;
  },

  getAppointmentDetails: async (appointmentId) => {
    const res = await apiClient.get(`/appointments/${appointmentId}/`);
    return res.data;
  },

  bookAppointment: async (appointmentData) => {
    const res = await apiClient.post('/appointments/', appointmentData);
    return res.data;
  },

  rescheduleAppointment: async (appointmentId, updateData) => {
    const res = await apiClient.patch(`/appointments/${appointmentId}/`, updateData);
    return res.data;
  },

  cancelAppointment: async (appointmentId, cancellationReason = '') => {
    const res = await apiClient.post(`/appointments/${appointmentId}/cancel-appointment/`, {
      cancellation_reason: cancellationReason,
    });
    return res.data;
  },

  // ─── CHECK-IN & WAITING OPERATIONS ──────────────────────────────
  checkInPatient: async (appointmentId) => {
    const res = await apiClient.post(`/appointments/${appointmentId}/check-in/`);
    return res.data;
  },

  undoCheckIn: async (appointmentId) => {
    const res = await apiClient.post(`/appointments/${appointmentId}/undo-check-in/`);
    return res.data;
  },

  // ─── DOCTOR SCHEDULE & SLOT AVAILABILITY ────────────────────────
  getDoctors: async (params = {}) => {
    const res = await apiClient.get('/staff/doctors/', { params });
    return res.data;
  },

  getDoctorDetails: async (doctorId) => {
    const res = await apiClient.get(`/staff/doctors/${doctorId}/`);
    return res.data;
  },

  getAvailableSlots: async (doctorId, date) => {
    const res = await apiClient.get('/appointments/available-slots/', {
      params: { doctor: doctorId, date },
    });
    return res.data;
  },

  // ─── PATIENT DEMOGRAPHICS & REGISTRATION ────────────────────────
  getPatients: async (params = {}) => {
    const res = await apiClient.get('/patients/', { params });
    return res.data;
  },

  getPatientDetails: async (patientId) => {
    const res = await apiClient.get(`/patients/${patientId}/`);
    return res.data;
  },

  registerPatient: async (patientData) => {
    const res = await apiClient.post('/patients/', patientData);
    return res.data;
  },

  updatePatient: async (patientId, patientData) => {
    const res = await apiClient.patch(`/patients/${patientId}/`, patientData);
    return res.data;
  },

  // ─── BILLING & PAYMENT OPERATIONS ──────────────────────────────
  getBills: async (params = {}) => {
    const res = await apiClient.get('/billing/bills/', { params });
    return res.data;
  },

  getBillDetails: async (billId) => {
    const res = await apiClient.get(`/billing/bills/${billId}/`);
    return res.data;
  },

  createBill: async (billData) => {
    const res = await apiClient.post('/billing/bills/', billData);
    return res.data;
  },

  recordPayment: async (paymentData) => {
    const res = await apiClient.post('/billing/payments/', paymentData);
    return res.data;
  },

  getPayments: async (params = {}) => {
    const res = await apiClient.get('/billing/payments/', { params });
    return res.data;
  },

  getPrescriptions: async (params = {}) => {
    const res = await apiClient.get('/pharmacy/prescriptions/', { params });
    return res.data;
  },

  // ─── RECEPTIONIST PROFILE & SECURITY ───────────────────────────
  getProfile: async () => {
    const res = await apiClient.get('/auth/profile/');
    return res.data;
  },

  updateProfile: async (profileData) => {
    const res = await apiClient.put('/auth/profile/', profileData);
    return res.data;
  },

  changePassword: async (passwordData) => {
    const res = await apiClient.post('/auth/change-password/', passwordData);
    return res.data;
  },
};

export default receptionistService;
