import apiClient from './api';

/**
 * CareFlow-HMS Doctor Dashboard API Service
 * Encapsulates all backend REST API communication for the authenticated doctor.
 */
export const doctorService = {
  // ─── OVERVIEW METRICS & DATA ────────────────────────────────────
  getOverviewData: async () => {
    // Concurrent fetch from actual authenticated APIs
    const [appointmentsRes, prescriptionsRes, patientsRes] = await Promise.all([
      apiClient.get('/appointments/'),
      apiClient.get('/pharmacy/prescriptions/'),
      apiClient.get('/patients/'),
    ]);

    const appointments = appointmentsRes.data.results || appointmentsRes.data || [];
    const prescriptions = prescriptionsRes.data.results || prescriptionsRes.data || [];
    const patients = patientsRes.data.results || patientsRes.data || [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filter appointments into today, upcoming, completed, and pending
    const todayAppointments = [];
    const upcomingAppointments = [];
    const previousAppointments = [];
    let completedCount = 0;
    let pendingCount = 0;

    appointments.forEach((apt) => {
      const isToday = apt.appointment_date === todayStr;
      const isFuture = apt.appointment_date > todayStr;
      const isPast = apt.appointment_date < todayStr;
      const isCompleted = apt.status === 'COMPLETED';
      const isCancelled = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
      const isPendingOrScheduled =
        apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' || apt.status === 'IN_PROGRESS';

      if (isCompleted) completedCount += 1;
      if (isPendingOrScheduled) pendingCount += 1;

      if (isToday) {
        todayAppointments.push(apt);
      }

      if (isFuture && !isCancelled) {
        upcomingAppointments.push(apt);
      } else if (isPast || isCompleted || isCancelled) {
        previousAppointments.push(apt);
      }
    });

    // Sort today's appointments by time ascending
    todayAppointments.sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));

    // Sort upcoming appointments chronologically (soonest first)
    upcomingAppointments.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
      const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
      return dtA.localeCompare(dtB);
    });

    // Sort previous appointments reverse-chronologically (most recent first)
    previousAppointments.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
      const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
      return dtB.localeCompare(dtA);
    });

    const nextUpcoming =
      todayAppointments.find((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED') ||
      (upcomingAppointments.length > 0 ? upcomingAppointments[0] : null);

    return {
      todayStr,
      counts: {
        todayAppointments: todayAppointments.length,
        upcomingAppointments: upcomingAppointments.length,
        completedAppointments: completedCount,
        pendingAppointments: pendingCount,
        totalAppointments: appointments.length,
        totalPrescriptions: prescriptions.length,
        totalPatients: patients.length,
      },
      todaySchedule: todayAppointments,
      upcomingAppointments,
      previousAppointments,
      nextUpcoming,
      allAppointments: appointments,
      allPrescriptions: prescriptions,
      eligiblePatients: patients,
    };
  },

  // ─── SCHEDULE (VIEW-ONLY) ───────────────────────────────────────
  getSchedule: async () => {
    const res = await apiClient.get('/appointments/');
    const list = res.data.results || res.data || [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Chronological order: date ascending, then time ascending
    const sorted = [...list].sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
      const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
      return dtA.localeCompare(dtB);
    });

    return sorted.map((apt) => ({
      ...apt,
      isUpcoming: apt.appointment_date >= todayStr && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED',
      isToday: apt.appointment_date === todayStr,
      isPast: apt.appointment_date < todayStr || apt.status === 'COMPLETED' || apt.status === 'CANCELLED',
    }));
  },

  // ─── APPOINTMENTS ──────────────────────────────────────────────
  getAppointments: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/appointments/', { params });
    const list = res.data.results || res.data || [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayList = [];
    const upcomingList = [];
    const previousList = [];

    list.forEach((apt) => {
      const isToday = apt.appointment_date === todayStr;
      const isPast = apt.appointment_date < todayStr || apt.status === 'COMPLETED' || apt.status === 'CANCELLED';

      if (isToday) {
        todayList.push(apt);
      }
      if (apt.appointment_date > todayStr && apt.status !== 'CANCELLED') {
        upcomingList.push(apt);
      }
      if (isPast) {
        previousList.push(apt);
      }
    });

    // Sort today by time
    todayList.sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));

    // Sort upcoming chronologically
    upcomingList.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
      const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
      return dtA.localeCompare(dtB);
    });

    // Sort previous reverse chronologically
    previousList.sort((a, b) => {
      const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
      const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
      return dtB.localeCompare(dtA);
    });

    return {
      all: list,
      today: todayList,
      upcoming: upcomingList,
      previous: previousList,
    };
  },

  cancelAppointment: async (id) => {
    const res = await apiClient.patch(`/appointments/${id}/`, {
      status: 'CANCELLED',
    });
    return res.data;
  },

  completeConsultation: async (id, notes = '') => {
    const res = await apiClient.post(`/appointments/${id}/complete-consultation/`, {
      notes,
      authorized_notes: notes,
    });
    return res.data;
  },

  // ─── PRESCRIPTIONS (CRUD) ──────────────────────────────────────
  getPrescriptions: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/pharmacy/prescriptions/', { params });
    return res.data.results || res.data || [];
  },

  getPrescriptionDetails: async (id) => {
    const res = await apiClient.get(`/pharmacy/prescriptions/${id}/`);
    return res.data;
  },

  createPrescription: async (payload) => {
    const res = await apiClient.post('/pharmacy/prescriptions/', payload);
    return res.data;
  },

  updatePrescription: async (id, payload) => {
    const res = await apiClient.put(`/pharmacy/prescriptions/${id}/`, payload);
    return res.data;
  },

  deletePrescription: async (id) => {
    const res = await apiClient.delete(`/pharmacy/prescriptions/${id}/`);
    return res.data;
  },

  completePrescription: async (id) => {
    const res = await apiClient.post(`/pharmacy/prescriptions/${id}/complete/`);
    return res.data;
  },

  // ─── ELIGIBLE PATIENTS & MEDICINES ─────────────────────────────
  getEligiblePatients: async (search = '', forType = '') => {
    try {
      const params = {};
      if (search) params.search = search;
      if (forType) params.for_type = forType;
      const res = await apiClient.get('/patients/checked-in/', { params });
      const list = res.data.results || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch (err) {
      // Fallback to appointments query
    }

    try {
      const aptRes = await apiClient.get('/appointments/', {
        params: { is_checked_in: 'true', ...(search ? { search } : {}) },
      });
      const apts = aptRes.data.results || aptRes.data || [];
      const seen = new Set();
      const eligible = [];
      const terminalStatuses = ['CANCELLED', 'COMPLETED', 'CHECKED_OUT', 'NO_SHOW'];
      apts.forEach((apt) => {
        if (forType === 'prescription' && apt.has_prescription) return;
        if (forType === 'lab_test' && apt.has_lab_test) return;
        if (apt.is_checked_in && !terminalStatuses.includes(apt.status) && apt.patient && !seen.has(apt.patient)) {
          seen.add(apt.patient);
          eligible.push({
            id: apt.patient,
            patient_id: apt.patient_id_code || apt.patient_details?.patient_id || `CF-P-${apt.patient}`,
            first_name: apt.patient_details?.first_name || (apt.patient_name ? apt.patient_name.split(' ')[0] : 'Patient'),
            last_name: apt.patient_details?.last_name || (apt.patient_name ? apt.patient_name.split(' ').slice(1).join(' ') : ''),
            full_name: apt.patient_name || (apt.patient_details ? `${apt.patient_details.first_name} ${apt.patient_details.last_name}` : 'Patient'),
            appointment_id: apt.id,
            appointment_code: apt.appointment_id,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            reason_for_visit: apt.reason_for_visit,
            is_checked_in: true,
            has_prescription: Boolean(apt.has_prescription),
            has_lab_test: Boolean(apt.has_lab_test),
          });
        }
      });
      return eligible;
    } catch (err) {
      return [];
    }
  },

  getMedicines: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/pharmacy/medicines/', { params });
    return res.data.results || res.data || [];
  },

  // ─── LABORATORY DIAGNOSTICS & TESTS ───────────────────────────
  getLabTests: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/laboratory/tests/', { params });
    return res.data.results || res.data || [];
  },

  getLabOrders: async (params = {}) => {
    const res = await apiClient.get('/laboratory/orders/', { params });
    return res.data.results || res.data || [];
  },

  getLabOrderDetails: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/`);
    return res.data;
  },

  createLabOrder: async (payload) => {
    const res = await apiClient.post('/laboratory/orders/', payload);
    return res.data;
  },

  requestCancellation: async (id, reason) => {
    const res = await apiClient.post(`/laboratory/orders/${id}/request-cancellation/`, { reason });
    return res.data;
  },

  downloadReport: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/download-report/`, {
      responseType: 'blob',
    });
    return res.data;
  },

  // ─── PROFILE & PASSWORD ────────────────────────────────────────
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

export default doctorService;

