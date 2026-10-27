import apiClient from './api';

/**
 * CareFlow-HMS Admin Dashboard API Service
 * Encapsulates all backend REST API calls for administrative management.
 */
export const adminService = {
  // ─── ADMIN PROFILE & PASSWORD ──────────────────────────────────
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

  // ─── OVERVIEW METRICS ──────────────────────────────────────────
  getOverviewMetrics: async () => {
    // Concurrent fetch from actual authenticated APIs
    const [patientsRes, doctorsRes, staffRes, medicinesRes] = await Promise.all([
      apiClient.get('/patients/'),
      apiClient.get('/staff/doctors/'),
      apiClient.get('/staff/profiles/'),
      apiClient.get('/pharmacy/medicines/'),
    ]);

    const isWalkIn = (p) => {
      const pid = String(p.patient_id || '').toUpperCase();
      const fn = String(p.first_name || '').toLowerCase();
      const ln = String(p.last_name || '').toLowerCase();
      const name = String(p.full_name || '').toLowerCase();
      return (
        pid === 'CF-WALKIN' ||
        fn.includes('walk-in') ||
        ln.includes('walk-in') ||
        fn.includes('walkin') ||
        ln.includes('walkin') ||
        name.includes('walk-in') ||
        name.includes('walkin')
      );
    };

    const rawPatients = patientsRes.data.results || patientsRes.data || [];
    const patients = rawPatients.filter((p) => !isWalkIn(p));
    const doctors = doctorsRes.data.results || doctorsRes.data || [];
    const staff = staffRes.data.results || staffRes.data || [];
    const medicines = medicinesRes.data.results || medicinesRes.data || [];

    const labStaffCount = staff.filter((s) => s.role === 'LAB_STAFF').length;
    const pharmacistCount = staff.filter((s) => s.role === 'PHARMACIST').length;
    const receptionistCount = staff.filter((s) => s.role === 'RECEPTIONIST').length;

    // Inventory counts
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    medicines.forEach((med) => {
      const qty = parseInt(med.stock_quantity, 10) || 0;
      totalStock += qty;
      if (qty <= 0) {
        outOfStockCount += 1;
      } else if (med.is_low_stock || qty <= (med.reorder_level || 20)) {
        lowStockCount += 1;
      }
    });

    return {
      counts: {
        patients: patients.length,
        doctors: doctors.length,
        labStaff: labStaffCount,
        pharmacists: pharmacistCount,
        receptionists: receptionistCount,
      },
      inventory: {
        totalTypes: medicines.length,
        totalStock,
        lowStockCount,
        outOfStockCount,
      },
      patientsList: patients,
    };
  },

  // ─── PATIENTS ──────────────────────────────────────────────────
  getPatients: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/patients/', { params });
    const list = res.data.results || res.data || [];
    return list.filter((p) => {
      const pid = String(p.patient_id || '').toUpperCase();
      const fn = String(p.first_name || '').toLowerCase();
      const ln = String(p.last_name || '').toLowerCase();
      const name = String(p.full_name || '').toLowerCase();
      return !(
        pid === 'CF-WALKIN' ||
        fn.includes('walk-in') ||
        ln.includes('walk-in') ||
        fn.includes('walkin') ||
        ln.includes('walkin') ||
        name.includes('walk-in') ||
        name.includes('walkin')
      );
    });
  },

  createPatient: async (data) => {
    const res = await apiClient.post('/patients/', data);
    return res.data;
  },

  updatePatient: async (id, data) => {
    const res = await apiClient.patch(`/patients/${id}/`, data);
    return res.data;
  },

  deletePatient: async (id) => {
    const res = await apiClient.delete(`/patients/${id}/`);
    return res.data;
  },

  // ─── DOCTORS ───────────────────────────────────────────────────
  getDoctors: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/staff/doctors/', { params });
    return res.data.results || res.data || [];
  },

  createDoctor: async (data) => {
    const res = await apiClient.post('/staff/doctors/', data);
    return res.data;
  },

  updateDoctor: async (id, data) => {
    const res = await apiClient.patch(`/staff/doctors/${id}/`, data);
    return res.data;
  },

  deleteDoctor: async (id) => {
    const res = await apiClient.delete(`/staff/doctors/${id}/`);
    return res.data;
  },

  // ─── STAFF PROFILES (Lab Staff, Pharmacist, Receptionist) ─────
  getStaff: async (roleFilter = '', search = '') => {
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (search) params.search = search;
    const res = await apiClient.get('/staff/profiles/', { params });
    return res.data.results || res.data || [];
  },

  createStaff: async (data) => {
    const res = await apiClient.post('/staff/profiles/', data);
    return res.data;
  },

  updateStaff: async (id, data) => {
    const res = await apiClient.patch(`/staff/profiles/${id}/`, data);
    return res.data;
  },

  deleteStaff: async (id) => {
    const res = await apiClient.delete(`/staff/profiles/${id}/`);
    return res.data;
  },

  getPrescriptions: async (search = '') => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/pharmacy/prescriptions/', { params });
    const list = res.data.results || res.data || [];
    return list.filter((rx) => {
      const pName = String(rx.patient_name || '').toLowerCase();
      const pId = String(rx.patient_id_code || rx.patient?.patient_id || '').toUpperCase();
      return !(pId === 'CF-WALKIN' || pName.includes('walk-in') || pName.includes('walkin'));
    });
  },

  getPrescriptionDetails: async (id) => {
    const res = await apiClient.get(`/pharmacy/prescriptions/${id}/`);
    return res.data;
  },

  cancelPrescription: async (id) => {
    const res = await apiClient.delete(`/pharmacy/prescriptions/${id}/`);
    return res.data;
  },

  // ─── TABLETS & MEDICINES ───────────────────────────────────────
  getMedicines: async (search = '', isActive = null) => {
    const params = {};
    if (search) params.search = search;
    if (isActive !== null && isActive !== undefined && isActive !== '' && isActive !== 'ALL') {
      params.is_active = isActive;
    }
    const res = await apiClient.get('/pharmacy/medicines/', { params });
    return res.data.results || res.data || [];
  },

  getMedicineDetails: async (id) => {
    const res = await apiClient.get(`/pharmacy/medicines/${id}/`);
    return res.data;
  },

  createMedicine: async (data) => {
    const res = await apiClient.post('/pharmacy/medicines/', data);
    return res.data;
  },

  updateMedicine: async (id, data) => {
    const res = await apiClient.patch(`/pharmacy/medicines/${id}/`, data);
    return res.data;
  },

  deleteMedicine: async (id) => {
    const res = await apiClient.delete(`/pharmacy/medicines/${id}/`);
    return res.data;
  },

  reactivateMedicine: async (id) => {
    const res = await apiClient.post(`/pharmacy/medicines/${id}/reactivate/`);
    return res.data;
  },

  // ─── READ-ONLY LABORATORY REPORTS & ARCHIVE ───────────────────
  getLabReports: async (params = {}) => {
    const res = await apiClient.get('/laboratory/orders/', { params });
    return res.data.results || res.data || [];
  },

  getLabReportDetails: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/`);
    return res.data;
  },

  downloadReport: async (id) => {
    const res = await apiClient.get(`/laboratory/orders/${id}/download-report/`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default adminService;

