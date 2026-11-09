import apiClient from './api';

/**
 * Evaluates whether a doctor prescription is currently active for the patient
 * based on the prescribed treatment duration (e.g. 5 Days, 2 Weeks, etc.).
 */
export const isPrescriptionCourseActive = (rx) => {
  if (!rx) return false;
  if (rx.status === 'CANCELLED') return false;

  // Prefer backend calculated flag if available
  if (rx.is_active_course !== undefined && rx.is_active_course !== null) {
    return Boolean(rx.is_active_course);
  }

  // Prescriptions awaiting pharmacy dispensation are always active
  if (rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED') {
    return true;
  }

  // Calculate based on the maximum duration specified across prescription items
  const createdDate = rx.created_at ? new Date(rx.created_at) : new Date();
  let maxDays = 5;

  if (Array.isArray(rx.items) && rx.items.length > 0) {
    const daysArr = rx.items.map((item) => {
      if (!item.duration) return 5;
      const match = String(item.duration).match(/(\d+)\s*(day|week|month|year)?/i);
      if (!match) return 5;
      const num = parseInt(match[1], 10);
      const unit = (match[2] || 'day').toLowerCase();
      if (unit.startsWith('w')) return num * 7;
      if (unit.startsWith('m')) return num * 30;
      if (unit.startsWith('y')) return num * 365;
      return num;
    });
    maxDays = Math.max(...daysArr);
  }

  // End of day on (createdDate + maxDays)
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + maxDays);
  expiryDate.setHours(23, 59, 59, 999);

  return new Date() <= expiryDate;
};

/**
 * CareFlow-HMS Patient Dashboard API Service
 * Encapsulates all backend REST API communication for the authenticated patient.
 */
export const patientService = {
  // ─── OVERVIEW METRICS & CONTEXT ─────────────────────────────────
  getOverviewData: async () => {
    // Concurrent fetch from actual authenticated APIs
    const [appointmentsRes, prescriptionsRes, medicinesRes, receiptsRes] =
      await Promise.all([
        apiClient.get('/appointments/'),
        apiClient.get('/pharmacy/prescriptions/'),
        apiClient.get('/pharmacy/medicines/'),
        apiClient.get('/billing/payments/'),
      ]);

    const appointments = appointmentsRes.data.results || appointmentsRes.data || [];
    const prescriptions = prescriptionsRes.data.results || prescriptionsRes.data || [];
    const medicines = medicinesRes.data.results || medicinesRes.data || [];
    const receipts = receiptsRes.data.results || receiptsRes.data || [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filter appointments into upcoming vs previous
    const upcomingAppointments = [];
    const previousAppointments = [];

    appointments.forEach((apt) => {
      const isPastDate = apt.appointment_date < todayStr;
      const isCompletedOrCancelled =
        apt.status === 'COMPLETED' || apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';

      if (isPastDate || isCompletedOrCancelled) {
        previousAppointments.push(apt);
      } else {
        upcomingAppointments.push(apt);
      }
    });

    // Sort upcoming appointments chronologically (soonest first)
    upcomingAppointments.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time}`;
      const dtB = `${b.appointment_date}T${b.appointment_time}`;
      return dtA.localeCompare(dtB);
    });

    // Sort previous appointments reverse-chronologically (most recent first)
    previousAppointments.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time}`;
      const dtB = `${b.appointment_date}T${b.appointment_time}`;
      return dtB.localeCompare(dtA);
    });

    const nextUpcomingAppointment =
      upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

    // Filter active vs historical prescriptions based on prescription validity duration
    const activePrescriptions = prescriptions.filter((rx) => isPrescriptionCourseActive(rx));
    const historicalPrescriptions = prescriptions.filter((rx) => !isPrescriptionCourseActive(rx));

    const currentActivePrescription =
      activePrescriptions.length > 0 ? activePrescriptions[0] : null;

    // Prescribed medicines items across active prescriptions
    const prescribedMedicines = [];
    activePrescriptions.forEach((rx) => {
      if (Array.isArray(rx.items)) {
        rx.items.forEach((item) => {
          prescribedMedicines.push({
            ...item,
            prescription_id_code: rx.prescription_id,
            prescription_db_id: rx.id,
            doctor_name: rx.doctor_name,
            doctor_specialization: rx.doctor_specialization,
            prescription_date: rx.created_at,
          });
        });
      }
    });

    return {
      appointments: {
        all: appointments,
        upcoming: upcomingAppointments,
        previous: previousAppointments,
        next: nextUpcomingAppointment,
      },
      prescriptions: {
        all: prescriptions,
        active: activePrescriptions,
        history: historicalPrescriptions,
        current: currentActivePrescription,
      },
      prescribedMedicines,
      medicinesCatalogue: medicines,
      receipts,
      counts: {
        upcomingAppointments: upcomingAppointments.length,
        activePrescriptions: activePrescriptions.length,
        prescribedMedicines: prescribedMedicines.length,
        totalReceipts: receipts.length,
      },
    };
  },

  // ─── APPOINTMENTS & AUTOMATIC ASSIGNMENT ─────────────────────
  getHealthProblems: async () => {
    const res = await apiClient.get('/appointments/health-problems/');
    return res.data;
  },

  getAppointments: async (params = {}) => {
    const res = await apiClient.get('/appointments/', { params });
    return res.data.results || res.data || [];
  },

  getAvailableSlots: async (healthProblemOrDoctorId, date) => {
    const params = { date };
    if (
      typeof healthProblemOrDoctorId === 'number' ||
      (!isNaN(healthProblemOrDoctorId) && !isNaN(parseFloat(healthProblemOrDoctorId)))
    ) {
      params.doctor = healthProblemOrDoctorId;
    } else if (healthProblemOrDoctorId) {
      params.health_problem = healthProblemOrDoctorId;
    }
    const res = await apiClient.get('/appointments/available-slots/', { params });
    return res.data;
  },

  bookAppointment: async (payload) => {
    const res = await apiClient.post('/appointments/', payload);
    return res.data;
  },

  cancelAppointment: async (id) => {
    const res = await apiClient.patch(`/appointments/${id}/`, {
      status: 'CANCELLED',
    });
    return res.data;
  },

  // ─── DOCTORS ───────────────────────────────────────────────────
  getDoctors: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/staff/doctors/', { params });
    return res.data.results || res.data || [];
  },

  // ─── PRESCRIPTIONS ─────────────────────────────────────────────
  getPrescriptions: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/pharmacy/prescriptions/', { params });
    return res.data.results || res.data || [];
  },

  getPrescriptionDetails: async (id) => {
    const res = await apiClient.get(`/pharmacy/prescriptions/${id}/`);
    return res.data;
  },

  // ─── MEDICINES & CATALOGUE ─────────────────────────────────────
  getMedicines: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/pharmacy/medicines/', { params });
    return res.data.results || res.data || [];
  },

  checkoutMedicine: async (payload) => {
    const res = await apiClient.post('/billing/invoices/checkout/', payload);
    return res.data;
  },

  // ─── BILLS & RECEIPTS ──────────────────────────────────────────
  getBills: async () => {
    const res = await apiClient.get('/billing/invoices/');
    return res.data.results || res.data || [];
  },

  getReceipts: async () => {
    const res = await apiClient.get('/billing/payments/');
    return res.data.results || res.data || [];
  },

  // ─── LABORATORY TESTS & REPORTS ────────────────────────────────
  getLabOrders: async (params = {}) => {
    const res = await apiClient.get('/laboratory/orders/', { params });
    return res.data.results || res.data || [];
  },

  getLabOrderDetails: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/`);
    return res.data;
  },

  downloadReport: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/download-report/`, {
      responseType: 'blob',
    });
    return res.data;
  },

  emailReport: async (id, email = null) => {
    const payload = email ? { email } : {};
    const res = await apiClient.post(`/laboratory/orders/${id}/send-email/`, payload);
    return res.data;
  },

  // ─── PATIENT CONSULTATION FEEDBACK ─────────────────────────────
  getEligibleFeedbackAppointments: async () => {
    const res = await apiClient.get('/feedback/eligible-appointments/');
    return res.data || [];
  },

  getFeedbackHistory: async () => {
    const res = await apiClient.get('/feedback/');
    return res.data.results || res.data || [];
  },

  submitFeedback: async (payload) => {
    const res = await apiClient.post('/feedback/', payload);
    return res.data;
  },

  // ─── CONTACT DOCTOR / MEDICAL QUERIES ─────────────────────────
  getEligibleQueryRecords: async () => {
    const res = await apiClient.get('/medical-queries/eligible-records/');
    return res.data || { appointments: [], prescriptions: [] };
  },

  getMedicalQueries: async (params = {}) => {
    const res = await apiClient.get('/medical-queries/', { params });
    return res.data.results || res.data || [];
  },

  submitMedicalQuery: async (payload) => {
    const res = await apiClient.post('/medical-queries/', payload);
    return res.data;
  },

  // ─── PATIENT PROFILE & PASSWORD ────────────────────────────────
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

export default patientService;

