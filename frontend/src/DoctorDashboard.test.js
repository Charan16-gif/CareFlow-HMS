import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import DoctorHeader from './components/doctor/DoctorHeader';
import DoctorSidebar from './components/doctor/DoctorSidebar';
import DoctorRoute from './components/doctor/DoctorRoute';
import DoctorOverviewPage from './pages/doctor/DoctorOverviewPage';
import DoctorSchedulePage from './pages/doctor/DoctorSchedulePage';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage';
import authService from './services/authService';
import doctorService from './services/doctorService';

// Mock authService and doctorService
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isAdmin: jest.fn(),
    isDoctor: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn().mockResolvedValue({
      id: 9,
      username: 'dr_rajesh',
      first_name: 'Rajesh',
      last_name: 'Allam',
      email: 'dr_rajesh@careflow.com',
      role: 'DOCTOR',
      doctor_id: 'CF-DOC-101',
      specialization: 'General Medicine',
      department: 'General Medicine',
    }),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/doctorService', () => {
  const service = {
    getOverviewData: jest.fn().mockResolvedValue({
      todayStr: '2026-10-14',
      counts: {
        todayAppointments: 1,
        upcomingAppointments: 2,
        completedAppointments: 3,
        pendingAppointments: 3,
        totalAppointments: 6,
        totalPrescriptions: 2,
        totalPatients: 2,
      },
      todaySchedule: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
      ],
      upcomingAppointments: [
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine consultation',
        },
      ],
      previousAppointments: [
        {
          id: 3,
          appointment_id: 'CF-APT-10003',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-01',
          appointment_time: '11:00:00',
          status: 'COMPLETED',
          reason_for_visit: 'Follow up check',
        },
      ],
      nextUpcoming: {
        id: 1,
        appointment_id: 'CF-APT-10002',
        patient_name: 'Doraemon Nobi',
        appointment_date: '2026-10-14',
        appointment_time: '09:00:00',
      },
    }),
    getSchedule: jest.fn().mockResolvedValue([
      {
        id: 1,
        appointment_id: 'CF-APT-10002',
        patient: 1,
        patient_name: 'Doraemon Nobi',
        appointment_date: '2026-10-14',
        appointment_time: '09:00:00',
        status: 'SCHEDULED',
        reason_for_visit: 'Fever',
        isToday: true,
        isUpcoming: true,
        isPast: false,
      },
      {
        id: 2,
        appointment_id: 'CF-APT-10001',
        patient: 2,
        patient_name: 'Nobitha Nobi',
        appointment_date: '2026-10-20',
        appointment_time: '10:00:00',
        status: 'CONFIRMED',
        reason_for_visit: 'Routine consultation',
        isToday: false,
        isUpcoming: true,
        isPast: false,
      },
    ]),
    getAppointments: jest.fn().mockResolvedValue({
      all: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine checkup',
        },
      ],
      today: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
      ],
      upcoming: [
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine checkup',
        },
      ],
      previous: [],
    }),
    getPrescriptions: jest.fn().mockResolvedValue([
      {
        id: 1,
        prescription_id: 'CF-RX-10001',
        patient: 2,
        patient_name: 'Nobitha Nobi',
        doctor: 1,
        doctor_name: 'Dr. Rajesh Allam',
        diagnosis: 'Acute Pharyngitis',
        clinical_notes: 'Take with warm water',
        status: 'PENDING',
        created_at: '2026-10-14T10:00:00Z',
        items: [
          {
            id: 1,
            medicine: 1,
            medicine_name: 'Paracetamol 500',
            dosage: '1 Tablet',
            frequency: '1-0-1',
            duration: '5 Days',
            quantity_prescribed: 10,
            quantity_dispensed: 0,
            is_dispensed: false,
          },
        ],
      },
    ]),
    getPrescriptionDetails: jest.fn().mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
      patient: 2,
      patient_name: 'Nobitha Nobi',
      doctor: 1,
      doctor_name: 'Dr. Rajesh Allam',
      diagnosis: 'Acute Pharyngitis',
      clinical_notes: 'Take with warm water',
      status: 'PENDING',
      created_at: '2026-10-14T10:00:00Z',
      items: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
          is_dispensed: false,
        },
      ],
    }),
    getEligiblePatients: jest.fn().mockResolvedValue([
      { id: 2, patient_id: 'CF-P-10001', first_name: 'Nobitha', last_name: 'Nobi' },
      { id: 1, patient_id: 'CF-P-10003', first_name: 'Doraemon', last_name: 'Nobi' },
    ]),
    getMedicines: jest.fn().mockResolvedValue([
      {
        id: 1,
        medicine_code: 'MED-1001',
        name: 'Paracetamol 500',
        dosage_form: 'TABLET',
        strength: '500mg',
        stock_quantity: 74,
      },
    ]),
    createPrescription: jest.fn().mockResolvedValue({
      id: 2,
      prescription_id: 'CF-RX-10002',
    }),
    updatePrescription: jest.fn().mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
    }),
    deletePrescription: jest.fn().mockResolvedValue({ success: true }),
    cancelAppointment: jest.fn().mockResolvedValue({ id: 1, status: 'CANCELLED' }),
    getProfile: jest.fn().mockResolvedValue({
      id: 9,
      username: 'dr_rajesh',
      first_name: 'Rajesh',
      last_name: 'Allam',
      role: 'DOCTOR',
      specialization: 'General Medicine',
    }),
    updateProfile: jest.fn().mockResolvedValue({
      id: 9,
      first_name: 'Rajesh',
      last_name: 'Allam',
    }),
    changePassword: jest.fn().mockResolvedValue({ success: true }),
  };
  return {
    __esModule: true,
    default: service,
    doctorService: service,
  };
});

describe('CareFlow HMS — Doctor Dashboard Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('DOCTOR');
    authService.isDoctor.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserProfile.mockReturnValue({
      id: 9,
      username: 'dr_rajesh',
      first_name: 'Rajesh',
      last_name: 'Allam',
      email: 'dr_rajesh@careflow.com',
      role: 'DOCTOR',
      doctor_id: 'CF-DOC-101',
      specialization: 'General Medicine',
      department: 'General Medicine',
    });
    authService.fetchProfile.mockResolvedValue({
      id: 9,
      username: 'dr_rajesh',
      first_name: 'Rajesh',
      last_name: 'Allam',
      email: 'dr_rajesh@careflow.com',
      role: 'DOCTOR',
      doctor_id: 'CF-DOC-101',
      specialization: 'General Medicine',
      department: 'General Medicine',
    });

    doctorService.getOverviewData.mockResolvedValue({
      todayStr: '2026-10-14',
      counts: {
        todayAppointments: 1,
        upcomingAppointments: 2,
        completedAppointments: 3,
        pendingAppointments: 3,
        totalAppointments: 6,
        totalPrescriptions: 2,
        totalPatients: 2,
      },
      todaySchedule: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
      ],
      upcomingAppointments: [
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine consultation',
        },
      ],
      previousAppointments: [
        {
          id: 3,
          appointment_id: 'CF-APT-10003',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-01',
          appointment_time: '11:00:00',
          status: 'COMPLETED',
          reason_for_visit: 'Follow up check',
        },
      ],
      nextUpcoming: {
        id: 1,
        appointment_id: 'CF-APT-10002',
        patient_name: 'Doraemon Nobi',
        appointment_date: '2026-10-14',
        appointment_time: '09:00:00',
      },
    });

    doctorService.getSchedule.mockResolvedValue([
      {
        id: 1,
        appointment_id: 'CF-APT-10002',
        patient: 1,
        patient_name: 'Doraemon Nobi',
        appointment_date: '2026-10-14',
        appointment_time: '09:00:00',
        status: 'SCHEDULED',
        reason_for_visit: 'Fever',
        isToday: true,
        isUpcoming: true,
        isPast: false,
      },
      {
        id: 2,
        appointment_id: 'CF-APT-10001',
        patient: 2,
        patient_name: 'Nobitha Nobi',
        appointment_date: '2026-10-20',
        appointment_time: '10:00:00',
        status: 'CONFIRMED',
        reason_for_visit: 'Routine consultation',
        isToday: false,
        isUpcoming: true,
        isPast: false,
      },
    ]);

    doctorService.getAppointments.mockResolvedValue({
      all: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine checkup',
        },
      ],
      today: [
        {
          id: 1,
          appointment_id: 'CF-APT-10002',
          patient: 1,
          patient_name: 'Doraemon Nobi',
          appointment_date: '2026-10-14',
          appointment_time: '09:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Fever and cold',
        },
      ],
      upcoming: [
        {
          id: 2,
          appointment_id: 'CF-APT-10001',
          patient: 2,
          patient_name: 'Nobitha Nobi',
          appointment_date: '2026-10-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          reason_for_visit: 'Routine checkup',
        },
      ],
      previous: [],
    });

    doctorService.getPrescriptions.mockResolvedValue([
      {
        id: 1,
        prescription_id: 'CF-RX-10001',
        patient: 2,
        patient_name: 'Nobitha Nobi',
        doctor: 1,
        doctor_name: 'Dr. Rajesh Allam',
        diagnosis: 'Acute Pharyngitis',
        clinical_notes: 'Take with warm water',
        status: 'PENDING',
        created_at: '2026-10-14T10:00:00Z',
        items: [
          {
            id: 1,
            medicine: 1,
            medicine_name: 'Paracetamol 500',
            dosage: '1 Tablet',
            frequency: '1-0-1',
            duration: '5 Days',
            quantity_prescribed: 10,
            quantity_dispensed: 0,
            is_dispensed: false,
          },
        ],
      },
    ]);

    doctorService.getPrescriptionDetails.mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
      patient: 2,
      patient_name: 'Nobitha Nobi',
      doctor: 1,
      doctor_name: 'Dr. Rajesh Allam',
      diagnosis: 'Acute Pharyngitis',
      clinical_notes: 'Take with warm water',
      status: 'PENDING',
      created_at: '2026-10-14T10:00:00Z',
      items: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
          is_dispensed: false,
        },
      ],
    });

    doctorService.getEligiblePatients.mockResolvedValue([
      { id: 2, patient_id: 'CF-P-10001', first_name: 'Nobitha', last_name: 'Nobi' },
      { id: 1, patient_id: 'CF-P-10003', first_name: 'Doraemon', last_name: 'Nobi' },
    ]);

    doctorService.getMedicines.mockResolvedValue([
      {
        id: 1,
        medicine_code: 'MED-1001',
        name: 'Paracetamol 500',
        dosage_form: 'TABLET',
        strength: '500mg',
        stock_quantity: 74,
      },
    ]);

    doctorService.createPrescription.mockResolvedValue({
      id: 2,
      prescription_id: 'CF-RX-10002',
    });

    doctorService.updatePrescription.mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
    });

    doctorService.deletePrescription.mockResolvedValue({ success: true });
    doctorService.cancelAppointment.mockResolvedValue({ id: 1, status: 'CANCELLED' });

    doctorService.getProfile.mockResolvedValue({
      id: 9,
      username: 'dr_rajesh',
      first_name: 'Rajesh',
      last_name: 'Allam',
      role: 'DOCTOR',
      specialization: 'General Medicine',
    });

    doctorService.updateProfile.mockResolvedValue({
      id: 9,
      first_name: 'Rajesh',
      last_name: 'Allam',
    });

    doctorService.changePassword.mockResolvedValue({ success: true });
  });

  // ─── 1. ROUTE GUARD & ROLE SECURITY ───────────────────────────
  describe('DoctorRoute Security', () => {
    test('redirects unauthenticated users to /login', () => {
      authService.isAuthenticated.mockReturnValue(false);
      authService.getUserRole.mockReturnValue('');

      render(
        <MemoryRouter initialEntries={['/doctor']}>
          <Routes>
            <Route
              path="/doctor"
              element={
                <DoctorRoute>
                  <div>Doctor Protected Content</div>
                </DoctorRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Doctor Protected Content')).not.toBeInTheDocument();
    });

    test('blocks non-doctor role (e.g. PATIENT) with access restricted screen', () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.getUserRole.mockReturnValue('PATIENT');

      render(
        <MemoryRouter initialEntries={['/doctor']}>
          <Routes>
            <Route
              path="/doctor"
              element={
                <DoctorRoute>
                  <div>Doctor Protected Content</div>
                </DoctorRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Doctor Portal Restricted')).toBeInTheDocument();
      expect(screen.queryByText('Doctor Protected Content')).not.toBeInTheDocument();
    });

    test('renders children when authenticated with DOCTOR role', () => {
      authService.isAuthenticated.mockReturnValue(true);
      authService.getUserRole.mockReturnValue('DOCTOR');

      render(
        <MemoryRouter initialEntries={['/doctor']}>
          <Routes>
            <Route
              path="/doctor"
              element={
                <DoctorRoute>
                  <div>Doctor Protected Content</div>
                </DoctorRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Doctor Protected Content')).toBeInTheDocument();
    });
  });

  // ─── 2. DOCTOR HEADER & SIDEBAR ─────────────────────────────────
  describe('DoctorHeader & DoctorSidebar Navigation', () => {
    test('renders header with Doctor Dashboard title, doctor name, and theme switcher', () => {
      const doctorUser = {
        first_name: 'Rajesh',
        last_name: 'Allam',
        username: 'dr_rajesh',
        specialization: 'General Medicine',
      };

      render(
        <BrowserRouter>
          <DoctorHeader
            isSidebarOpen={false}
            onToggleSidebar={jest.fn()}
            onOpenProfile={jest.fn()}
            doctorUser={doctorUser}
            currentTheme="default"
            onThemeChange={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Doctor Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dr. Rajesh Allam')).toBeInTheDocument();
      expect(screen.getByText('General Medicine')).toBeInTheDocument();
    });

    test('renders sidebar with all 4 doctor navigation links', () => {
      render(
        <BrowserRouter>
          <DoctorSidebar
            isOpen={true}
            onClose={jest.fn()}
            onOpenLogoutModal={jest.fn()}
            onOpenProfile={jest.fn()}
            doctorUser={{ first_name: 'Rajesh', last_name: 'Allam' }}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('My Schedule')).toBeInTheDocument();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
      expect(screen.getByText('Prescriptions')).toBeInTheDocument();
      expect(screen.getByText('Doctor Portal')).toBeInTheDocument();
    });
  });

  // ─── 3. OVERVIEW PAGE ───────────────────────────────────────────
  describe('DoctorOverviewPage', () => {
    test('loads metrics, today schedule, and upcoming appointments from backend', async () => {
      render(
        <BrowserRouter>
          <DoctorOverviewPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
      });

      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.getByText('Completed Appointments')).toBeInTheDocument();
      expect(screen.getByText('Pending Appointments')).toBeInTheDocument();
      expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
      expect(screen.getByText('Doraemon Nobi')).toBeInTheDocument();
    });
  });

  // ─── 4. MY SCHEDULE PAGE (VIEW-ONLY) ────────────────────────────
  describe('DoctorSchedulePage', () => {
    test('renders view-only schedule timetable in chronological order with no edit controls', async () => {
      render(
        <BrowserRouter>
          <DoctorSchedulePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Doraemon Nobi')).toBeInTheDocument();
      });

      expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();

      // Ensure NO edit or add controls exist on view-only schedule page
      expect(screen.queryByText(/Add Schedule/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Reschedule/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Create/i)).not.toBeInTheDocument();
    });
  });

  // ─── 5. APPOINTMENTS PAGE ───────────────────────────────────────
  describe('DoctorAppointmentsPage', () => {
    test('renders tabbed appointment categories and opens consultation details modal', async () => {
      render(
        <BrowserRouter>
          <DoctorAppointmentsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Appointments')).toBeInTheDocument();
        expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      });

      expect(screen.getByText(/Upcoming Appointments/i)).toBeInTheDocument();
      expect(screen.getByText(/Today's Appointments/i)).toBeInTheDocument();
      expect(screen.getByText(/Previous Appointments/i)).toBeInTheDocument();

      // Open details modal
      const viewButtons = screen.getAllByTitle('View Consultation Details');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Consultation Details')).toBeInTheDocument();
      });

      expect(screen.getByText(/Primary Complaint/i)).toBeInTheDocument();
    });

    test('allows doctor to cancel appointment with confirmation modal', async () => {
      doctorService.cancelAppointment.mockResolvedValue({ id: 2, status: 'CANCELLED' });

      render(
        <BrowserRouter>
          <DoctorAppointmentsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByTitle('Cancel Appointment');
      expect(cancelButtons.length).toBeGreaterThan(0);
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Cancel Appointment')).toBeInTheDocument();
        expect(screen.getByText('Confirm Cancellation')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Cancellation'));

      await waitFor(() => {
        expect(doctorService.cancelAppointment).toHaveBeenCalledWith(2);
      });
    });
  });

  // ─── 6. PRESCRIPTIONS PAGE (FULL CRUD) ──────────────────────────
  describe('DoctorPrescriptionsPage', () => {
    test('displays prescriptions and opens create prescription modal with eligible patients', async () => {
      render(
        <BrowserRouter>
          <DoctorPrescriptionsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Acute Pharyngitis').length).toBeGreaterThanOrEqual(1);

      // Click Create Prescription
      const createBtn = screen.getByText('Create Prescription');
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Create New Prescription')).toBeInTheDocument();
      });

      expect(screen.getByText(/Select Patient/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnosis & Clinical Findings/i)).toBeInTheDocument();
      expect(screen.getByText('Save & Issue Prescription')).toBeInTheDocument();
    });

    test('opens view details modal for prescription', async () => {
      render(
        <BrowserRouter>
          <DoctorPrescriptionsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      });

      const viewDetailsBtn = screen.getByTitle('View Details');
      fireEvent.click(viewDetailsBtn);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Acute Pharyngitis').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
    });

    test('opens delete confirmation modal and invokes delete prescription API', async () => {
      render(
        <BrowserRouter>
          <DoctorPrescriptionsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByTitle('Delete Prescription');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText('Delete Prescription')).toBeInTheDocument();
      });

      expect(screen.getByText(/Are you sure you want to delete prescription/i)).toBeInTheDocument();

      const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete$/i });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(doctorService.deletePrescription).toHaveBeenCalledWith(1);
      });
    });
  });
});
