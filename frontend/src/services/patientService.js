import apiClient from './api';

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

    // Filter active vs historical prescriptions
    const activePrescriptions = prescriptions.filter(
      (rx) => rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED'
    );
    const historicalPrescriptions = prescriptions.filter(
      (rx) => rx.status === 'DISPENSED' || rx.status === 'CANCELLED'
    );

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

  // ─── APPOINTMENTS ───────────────────────────────────────────────
  getAppointments: async (params = {}) => {
    const res = await apiClient.get('/appointments/', { params });
    return res.data.results || res.data || [];
  },

  getAvailableSlots: async (doctorId, date) => {
    const res = await apiClient.get('/appointments/available-slots/', {
      params: { doctor: doctorId, date },
    });
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

