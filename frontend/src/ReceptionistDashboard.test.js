import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ReceptionistHeader from './components/receptionist/ReceptionistHeader';
import ReceptionistSidebar from './components/receptionist/ReceptionistSidebar';
import ReceptionistRoute from './components/receptionist/ReceptionistRoute';
import ReceptionistOverviewPage from './pages/receptionist/ReceptionistOverviewPage';
import ReceptionistPatientsPage from './pages/receptionist/ReceptionistPatientsPage';
import ReceptionistAppointmentsPage from './pages/receptionist/ReceptionistAppointmentsPage';
import ReceptionistCheckInPage from './pages/receptionist/ReceptionistCheckInPage';
import ReceptionistDoctorSchedulePage from './pages/receptionist/ReceptionistDoctorSchedulePage';
import ReceptionistPaymentsPage from './pages/receptionist/ReceptionistPaymentsPage';
import authService from './services/authService';
import receptionistService from './services/receptionistService';

// Mock authService and receptionistService
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isReceptionist: jest.fn(),
    isAdmin: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn(),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/receptionistService', () => {
  const service = {
    getStats: jest.fn(),
    getAppointments: jest.fn(),
    getAppointmentDetails: jest.fn(),
    checkInPatient: jest.fn(),
    undoCheckIn: jest.fn(),
    cancelAppointment: jest.fn(),
    bookAppointment: jest.fn(),
    rescheduleAppointment: jest.fn(),
    getDoctors: jest.fn(),
    getDoctorDetails: jest.fn(),
    getAvailableSlots: jest.fn(),
    getPatients: jest.fn(),
    getPatientDetails: jest.fn(),
    registerPatient: jest.fn(),
    updatePatient: jest.fn(),
    getBills: jest.fn(),
    createBill: jest.fn(),
    getBillDetails: jest.fn(),
    getPayments: jest.fn(),
    recordPayment: jest.fn(),
    getPrescriptions: jest.fn().mockResolvedValue([]),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    receptionistService: service,
  };
});

// Format matching local ISO date
const now = new Date();
const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const mockAppointments = [
  {
    id: 101,
    patient: 1,
    patient_details: {
      first_name: 'Alice',
      last_name: 'Smith',
      phone_number: '9876543210',
      email: 'alice@example.com',
    },
    doctor: 2,
    doctor_details: {
      id: 2,
      user: { first_name: 'Robert', last_name: 'Smith' },
      specialization: 'Cardiology',
      department: 'Cardiology',
      consultation_fee: 600,
    },
    appointment_date: todayDateStr,
    appointment_time: '10:00:00',
    status: 'CONFIRMED',
    is_checked_in: false,
    check_in_time: null,
    reason: 'Follow-up ECG checkup',
    created_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 102,
    patient: 2,
    patient_details: {
      first_name: 'Bob',
      last_name: 'Jones',
      phone_number: '9123456780',
      email: 'bob@example.com',
    },
    doctor: 2,
    doctor_details: {
      id: 2,
      user: { first_name: 'Robert', last_name: 'Smith' },
      specialization: 'Cardiology',
      department: 'Cardiology',
      consultation_fee: 600,
    },
    appointment_date: todayDateStr,
    appointment_time: '11:00:00',
    status: 'SCHEDULED',
    is_checked_in: true,
    check_in_time: `${todayDateStr}T10:45:00Z`,
    reason: 'General consultation',
    created_at: '2026-10-18T11:00:00Z',
  },
];

const mockDoctors = [
  {
    id: 2,
    doctor_id: 'CF-DOC-101',
    first_name: 'Robert',
    last_name: 'Smith',
    specialization: 'Cardiology',
    department: 'Cardiology',
    qualification: 'MD, DM (Cardiology)',
    consultation_fee: '600.00',
    available_days: 'Monday,Wednesday,Friday',
    start_time: '09:00:00',
    end_time: '17:00:00',
    user: { first_name: 'Robert', last_name: 'Smith' },
  },
];

const mockPatients = [
  {
    id: 1,
    patient_id: 'CF-PAT-1001',
    first_name: 'Alice',
    last_name: 'Smith',
    age: 32,
    gender: 'Female',
    phone_number: '9876543210',
    email: 'alice@example.com',
    blood_group: 'O+',
    created_at: '2026-10-01T08:00:00Z',
  },
];

const mockBills = [
  {
    id: 201,
    bill_number: 'CF-INV-1001',
    patient: 1,
    patient_name: 'Alice Smith',
    appointment: 101,
    total_amount: '600.00',
    discount_amount: '0.00',
    net_amount: '600.00',
    paid_amount: '600.00',
    balance_due: '0.00',
    status: 'PAID',
    created_at: '2026-10-18T10:30:00Z',
    items: [
      { description: 'Consultation Fee - Cardiology', item_type: 'CONSULTATION', quantity: 1, unit_price: '600.00', subtotal: '600.00' },
    ],
    payments: [
      { id: 1, receipt_number: 'CF-RCP-1001', amount: '600.00', payment_method: 'UPI', payment_date: '2026-10-18T10:35:00Z' },
    ],
  },
  {
    id: 202,
    bill_number: 'CF-INV-1002',
    patient: 1,
    patient_name: 'Alice Smith',
    appointment: 101,
    total_amount: '500.00',
    discount_amount: '0.00',
    net_amount: '500.00',
    paid_amount: '0.00',
    balance_due: '500.00',
    status: 'UNPAID',
    created_at: '2026-10-19T09:00:00Z',
    items: [
      { description: 'General Consultation', item_type: 'CONSULTATION', quantity: 1, unit_price: '500.00', subtotal: '500.00' },
    ],
    payments: [],
  },
];

const setupDefaultMocks = () => {
  authService.isAuthenticated.mockReturnValue(true);
  authService.isReceptionist.mockReturnValue(true);
  authService.isAdmin.mockReturnValue(false);
  authService.getUserRole.mockReturnValue('RECEPTIONIST');
  authService.getUserProfile.mockReturnValue({
    id: 7,
    username: 'madhu',
    first_name: 'Madhu',
    last_name: 'G',
    email: 'reception@careflow.com',
    role: 'RECEPTIONIST',
  });
  authService.fetchProfile.mockResolvedValue({
    id: 7,
    username: 'madhu',
    first_name: 'Madhu',
    last_name: 'G',
    email: 'reception@careflow.com',
    role: 'RECEPTIONIST',
  });

  receptionistService.getStats.mockResolvedValue({
    today_appointments: 12,
    upcoming_appointments: 8,
    registered_patients: 154,
    checked_in_today: 5,
    waiting_patients: 3,
    completed_today: 4,
    cancelled_today: 1,
  });

  receptionistService.getAppointments.mockResolvedValue(mockAppointments);
  receptionistService.getAppointmentDetails.mockResolvedValue(mockAppointments[0]);
  receptionistService.checkInPatient.mockResolvedValue({ success: true, message: 'Checked in' });
  receptionistService.undoCheckIn.mockResolvedValue({ success: true, message: 'Check in reverted' });
  receptionistService.cancelAppointment.mockResolvedValue({ success: true, message: 'Cancelled' });
  receptionistService.bookAppointment.mockResolvedValue({ id: 103, success: true });
  receptionistService.rescheduleAppointment.mockResolvedValue({ id: 101, success: true });
  receptionistService.getDoctors.mockResolvedValue(mockDoctors);
  receptionistService.getDoctorDetails.mockResolvedValue(mockDoctors[0]);
  receptionistService.getAvailableSlots.mockResolvedValue({
    available_slots: ['09:30:00', '10:00:00', '10:30:00', '11:00:00', '14:00:00'],
  });
  receptionistService.getPatients.mockResolvedValue(mockPatients);
  receptionistService.getPatientDetails.mockResolvedValue(mockPatients[0]);
  receptionistService.registerPatient.mockResolvedValue({ id: 2, patient_id: 'CF-PAT-1002' });
  receptionistService.updatePatient.mockResolvedValue({ id: 1, success: true });
  receptionistService.getBills.mockResolvedValue(mockBills);
  receptionistService.getPayments.mockResolvedValue([]);
  receptionistService.getPrescriptions.mockResolvedValue([]);
  receptionistService.getProfile.mockResolvedValue({
    id: 7,
    username: 'madhu',
    first_name: 'Madhu',
    last_name: 'G',
    email: 'reception@careflow.com',
  });
  receptionistService.updateProfile.mockResolvedValue({ success: true });
  receptionistService.changePassword.mockResolvedValue({ success: true });
};

describe('CareFlow HMS — Receptionist Dashboard Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // 1. Sidebar Navigation
  test('ReceptionistSidebar renders all 6 front-desk navigation links and branding', () => {
    render(
      <BrowserRouter>
        <ReceptionistSidebar
          isOpen={true}
          onClose={jest.fn()}
          onOpenLogoutModal={jest.fn()}
          onOpenProfile={jest.fn()}
          receptionistUser={{ first_name: 'Madhu', last_name: 'G' }}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('CareFlow')).toBeInTheDocument();
    expect(screen.getByText('FRONT DESK')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Check-in & Waiting')).toBeInTheDocument();
    expect(screen.getByText('Doctor Schedule')).toBeInTheDocument();
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out of CareFlow Receptionist Portal/i })).toBeInTheDocument();
  });

  // 2. Header and Theme Selector
  test('ReceptionistHeader renders title, role badge, and theme switcher', () => {
    const handleThemeChange = jest.fn();
    render(
      <BrowserRouter>
        <ReceptionistHeader
          onToggleSidebar={jest.fn()}
          currentTheme="default"
          onThemeChange={handleThemeChange}
          onOpenProfile={jest.fn()}
          receptionistUser={{ first_name: 'Madhu', username: 'madhu' }}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Receptionist Portal')).toBeInTheDocument();
    expect(screen.getByText('Receptionist')).toBeInTheDocument();
    expect(screen.getByText('Madhu')).toBeInTheDocument();

    const themeBtn = screen.getByTitle(/Change landing page theme/i);
    expect(themeBtn).toBeInTheDocument();
  });

  // 3. Receptionist Route Access Control
  test('ReceptionistRoute allows authenticated RECEPTIONIST to view protected content', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isReceptionist.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('RECEPTIONIST');

    render(
      <MemoryRouter>
        <ReceptionistRoute>
          <div>Protected Receptionist Portal</div>
        </ReceptionistRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Receptionist Portal')).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });

  test('ReceptionistRoute restricts non-receptionist roles', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isReceptionist.mockReturnValue(false);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('PATIENT');

    render(
      <MemoryRouter>
        <ReceptionistRoute>
          <div>Protected Receptionist Portal</div>
        </ReceptionistRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Receptionist Portal')).not.toBeInTheDocument();
    expect(screen.getByText(/Receptionist Portal Restricted/i)).toBeInTheDocument();
  });

  // 4. Overview Page
  test('ReceptionistOverviewPage loads real statistics and today appointments', async () => {
    render(
      <BrowserRouter>
        <ReceptionistOverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Reception & Front Desk Overview/i)).toBeInTheDocument();
      expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
      expect(screen.getByText('Registered Patients')).toBeInTheDocument();
      expect(screen.getByText('Checked-in Today')).toBeInTheDocument();
      expect(screen.getByText('Patients Waiting')).toBeInTheDocument();
      expect(screen.getByText('Completed Today')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('154')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getAllByText(/Dr\. Robert Smith/i).length).toBeGreaterThan(0);
    });
  });

  // 5. Patient Management Page
  test('ReceptionistPatientsPage renders patient list, search bar, and register modal trigger', async () => {
    render(
      <BrowserRouter>
        <ReceptionistPatientsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient Demographics & Registration')).toBeInTheDocument();
      expect(screen.getByText('Register New Patient')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by patient name, ID, phone number, email/i)).toBeInTheDocument();
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CF-PAT-1001').length).toBeGreaterThan(0);
    });
  });

  // 6. Appointment Management Page
  test('ReceptionistAppointmentsPage renders filter tabs and allows booking action', async () => {
    render(
      <BrowserRouter>
        <ReceptionistAppointmentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Appointment Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Book Appointment/i })).toBeInTheDocument();
      expect(screen.getByText(/Upcoming/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  // 7. Check-in & Waiting Page
  test('ReceptionistCheckInPage renders queue statistics and check-in controls', async () => {
    render(
      <BrowserRouter>
        <ReceptionistCheckInPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Check-in & Waiting Room')).toBeInTheDocument();
      expect(screen.getByText("Today's Total")).toBeInTheDocument();
      expect(screen.getByText('Currently Waiting')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Arrival')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  // 8. Doctor Schedule Page
  test('ReceptionistDoctorSchedulePage renders doctors list and availability inspector', async () => {
    render(
      <BrowserRouter>
        <ReceptionistDoctorSchedulePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Doctor Schedule & Slots')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /Consulting Doctors/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Dr\. Robert Smith/i).length).toBeGreaterThan(0);
      expect(screen.getByText('CF-DOC-101')).toBeInTheDocument();
    });
  });

  // 9. Payment Status & Active Billing Page
  test('ReceptionistPaymentsPage renders financial summary and invoices ledger with active controls', async () => {
    render(
      <BrowserRouter>
        <ReceptionistPaymentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Billing & Payment Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate New Bill/i })).toBeInTheDocument();
      expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
      expect(screen.getByText('Amount Collected')).toBeInTheDocument();
      expect(screen.getByText('Outstanding Due')).toBeInTheDocument();
      expect(screen.getByText('CF-INV-1001')).toBeInTheDocument();
      expect(screen.getByText('Collect')).toBeInTheDocument();
      expect(screen.getAllByText('Receipt').length).toBeGreaterThan(0);
    });
  });
});
