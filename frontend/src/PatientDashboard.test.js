import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import PatientHeader from './components/patient/PatientHeader';
import PatientSidebar from './components/patient/PatientSidebar';
import PatientRoute from './components/patient/PatientRoute';
import PatientOverviewPage from './pages/patient/PatientOverviewPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage';
import PatientMedicinesPage from './pages/patient/PatientMedicinesPage';
import authService from './services/authService';
import patientService from './services/patientService';

// Mock authService and patientService
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isAdmin: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn().mockResolvedValue({
      id: 10,
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      email: 'nobitha@gmail.com',
      role: 'PATIENT',
    }),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/patientService', () => {
  const service = {
    getOverviewData: jest.fn().mockResolvedValue({
      appointments: {
        all: [
          {
            id: 1,
            appointment_id: 'CF-APT-10001',
            doctor_name: 'Dr. Rajesh Allam',
            doctor_specialization: 'General Medicine',
            appointment_date: '2026-11-20',
            appointment_time: '10:00:00',
            status: 'SCHEDULED',
            consultation_fee: '500.00',
            reason_for_visit: 'Routine checkup',
          },
        ],
        upcoming: [
          {
            id: 1,
            appointment_id: 'CF-APT-10001',
            doctor_name: 'Dr. Rajesh Allam',
            doctor_specialization: 'General Medicine',
            appointment_date: '2026-11-20',
            appointment_time: '10:00:00',
            status: 'SCHEDULED',
            consultation_fee: '500.00',
            reason_for_visit: 'Routine checkup',
          },
        ],
        previous: [],
        next: {
          id: 1,
          appointment_id: 'CF-APT-10001',
          doctor_name: 'Dr. Rajesh Allam',
          doctor_specialization: 'General Medicine',
          appointment_date: '2026-11-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          consultation_fee: '500.00',
          reason_for_visit: 'Routine checkup',
        },
      },
      prescriptions: {
        all: [
          {
            id: 1,
            prescription_id: 'CF-RX-10001',
            doctor_name: 'Dr. Rajesh Allam',
            status: 'PENDING',
            created_at: '2026-10-10T10:00:00Z',
            diagnosis: 'Mild hypertension',
            items: [
              {
                id: 1,
                medicine: 1,
                medicine_name: 'Paracetamol 500',
                dosage: '1 Tablet',
                frequency: '1-0-1',
                quantity_prescribed: 10,
                quantity_dispensed: 0,
              },
            ],
          },
        ],
        active: [
          {
            id: 1,
            prescription_id: 'CF-RX-10001',
            doctor_name: 'Dr. Rajesh Allam',
            status: 'PENDING',
            created_at: '2026-10-10T10:00:00Z',
            diagnosis: 'Mild hypertension',
            items: [
              {
                id: 1,
                medicine: 1,
                medicine_name: 'Paracetamol 500',
                dosage: '1 Tablet',
                frequency: '1-0-1',
                quantity_prescribed: 10,
                quantity_dispensed: 0,
              },
            ],
          },
        ],
        history: [],
        current: {
          id: 1,
          prescription_id: 'CF-RX-10001',
          doctor_name: 'Dr. Rajesh Allam',
          status: 'PENDING',
          created_at: '2026-10-10T10:00:00Z',
          diagnosis: 'Mild hypertension',
          items: [
            {
              id: 1,
              medicine: 1,
              medicine_name: 'Paracetamol 500',
              dosage: '1 Tablet',
              frequency: '1-0-1',
              quantity_prescribed: 10,
              quantity_dispensed: 0,
            },
          ],
        },
      },
      prescribedMedicines: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
        },
      ],
      medicinesCatalogue: [
        {
          id: 1,
          medicine_code: 'MED-1001',
          name: 'Paracetamol 500',
          unit_price: '1.00',
          stock_quantity: 100,
        },
      ],
      receipts: [],
      counts: {
        upcomingAppointments: 1,
        activePrescriptions: 1,
        prescribedMedicines: 1,
        totalReceipts: 0,
      },
    }),
    getAppointments: jest.fn().mockResolvedValue([
      {
        id: 1,
        appointment_id: 'CF-APT-10001',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_specialization: 'General Medicine',
        appointment_date: '2026-11-20',
        appointment_time: '10:00:00',
        status: 'SCHEDULED',
        consultation_fee: '500.00',
        reason_for_visit: 'Routine checkup',
      },
    ]),
    getAvailableSlots: jest.fn().mockResolvedValue({
      is_available_day: true,
      available_slots: ['09:00:00', '09:30:00', '10:00:00'],
    }),
    getDoctors: jest.fn().mockResolvedValue([
      {
        id: 3,
        first_name: 'Rajesh',
        last_name: 'Allam',
        full_name: 'Dr. Rajesh Allam',
        specialization: 'General Medicine',
        consultation_fee: '500.00',
      },
    ]),
    bookAppointment: jest.fn().mockResolvedValue({
      id: 2,
      appointment_id: 'CF-APT-10002',
      status: 'SCHEDULED',
    }),
    cancelAppointment: jest.fn().mockResolvedValue({
      id: 1,
      status: 'CANCELLED',
    }),
    getPrescriptions: jest.fn().mockResolvedValue([
      {
        id: 1,
        prescription_id: 'CF-RX-10001',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_specialization: 'General Medicine',
        status: 'PENDING',
        created_at: '2026-10-10T10:00:00Z',
        diagnosis: 'Mild hypertension',
        items: [
          {
            id: 1,
            medicine: 1,
            medicine_name: 'Paracetamol 500',
            dosage: '1 Tablet',
            frequency: '1-0-1',
            quantity_prescribed: 10,
            quantity_dispensed: 0,
            instructions: 'After food',
          },
        ],
      },
    ]),
    getPrescriptionDetails: jest.fn().mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
      doctor_name: 'Dr. Rajesh Allam',
      doctor_specialization: 'General Medicine',
      status: 'PENDING',
      created_at: '2026-10-10T10:00:00Z',
      diagnosis: 'Mild hypertension',
      clinical_notes: 'Take rest and drink plenty of water',
      items: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
          instructions: 'After food',
        },
      ],
    }),
    getMedicines: jest.fn().mockResolvedValue([
      {
        id: 1,
        medicine_code: 'MED-1001',
        name: 'Paracetamol 500',
        dosage_form: 'TABLET',
        strength: '500mg',
        unit_price: '1.00',
        stock_quantity: 100,
      },
      {
        id: 2,
        medicine_code: 'MED-1002',
        name: 'Dolo 650',
        dosage_form: 'TABLET',
        strength: '650mg',
        unit_price: '10.00',
        stock_quantity: 10,
      },
    ]),
    checkoutMedicine: jest.fn().mockResolvedValue({
      success: true,
      message: 'Successfully purchased 2x Paracetamol 500. Receipt #CF-RCP-10001 issued.',
      receipt: {
        id: 1,
        receipt_number: 'CF-RCP-10001',
        bill_number: 'CF-INV-10001',
        patient_name: 'Nobitha Nobi',
        amount: '2.00',
        payment_method: 'UPI',
        status: 'SUCCESS',
        payment_date: '2026-10-14T11:00:00Z',
        bill_items: [
          {
            description: 'Paracetamol 500 500mg',
            quantity: 2,
            unit_price: '1.00',
            subtotal: '2.00',
          },
        ],
      },
    }),
    getReceipts: jest.fn().mockResolvedValue([
      {
        id: 1,
        receipt_number: 'CF-RCP-10001',
        bill_number: 'CF-INV-10001',
        amount: '2.00',
        payment_method: 'UPI',
        status: 'SUCCESS',
        payment_date: '2026-10-14T11:00:00Z',
      },
    ]),
    getProfile: jest.fn().mockResolvedValue({
      id: 10,
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      email: 'nobitha@gmail.com',
      phone: '9876543210',
      role: 'PATIENT',
      is_email_verified: true,
    }),
  };
  return {
    __esModule: true,
    default: service,
    patientService: service,
  };
});

describe('CareFlow HMS — Patient Dashboard Component Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authService.fetchProfile.mockResolvedValue({
      id: 10,
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      email: 'nobitha@gmail.com',
      role: 'PATIENT',
    });
    authService.getUserProfile.mockReturnValue({
      id: 10,
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      email: 'nobitha@gmail.com',
      role: 'PATIENT',
    });
    authService.getUserRole.mockReturnValue('PATIENT');
    authService.isAuthenticated.mockReturnValue(true);

    patientService.getOverviewData.mockResolvedValue({
      appointments: {
        all: [
          {
            id: 1,
            appointment_id: 'CF-APT-10001',
            doctor_name: 'Dr. Rajesh Allam',
            doctor_specialization: 'General Medicine',
            appointment_date: '2028-11-20',
            appointment_time: '10:00:00',
            status: 'SCHEDULED',
            consultation_fee: '500.00',
            reason_for_visit: 'Routine checkup',
          },
        ],
        upcoming: [
          {
            id: 1,
            appointment_id: 'CF-APT-10001',
            doctor_name: 'Dr. Rajesh Allam',
            doctor_specialization: 'General Medicine',
            appointment_date: '2028-11-20',
            appointment_time: '10:00:00',
            status: 'SCHEDULED',
            consultation_fee: '500.00',
            reason_for_visit: 'Routine checkup',
          },
        ],
        previous: [],
        next: {
          id: 1,
          appointment_id: 'CF-APT-10001',
          doctor_name: 'Dr. Rajesh Allam',
          doctor_specialization: 'General Medicine',
          appointment_date: '2028-11-20',
          appointment_time: '10:00:00',
          status: 'SCHEDULED',
          consultation_fee: '500.00',
          reason_for_visit: 'Routine checkup',
        },
      },
      prescriptions: {
        all: [
          {
            id: 1,
            prescription_id: 'CF-RX-10001',
            doctor_name: 'Dr. Rajesh Allam',
            status: 'PENDING',
            created_at: '2026-10-10T10:00:00Z',
            diagnosis: 'Mild hypertension',
            items: [
              {
                id: 1,
                medicine: 1,
                medicine_name: 'Paracetamol 500',
                dosage: '1 Tablet',
                frequency: '1-0-1',
                quantity_prescribed: 10,
                quantity_dispensed: 0,
              },
            ],
          },
        ],
        active: [
          {
            id: 1,
            prescription_id: 'CF-RX-10001',
            doctor_name: 'Dr. Rajesh Allam',
            status: 'PENDING',
            created_at: '2026-10-10T10:00:00Z',
            diagnosis: 'Mild hypertension',
            items: [
              {
                id: 1,
                medicine: 1,
                medicine_name: 'Paracetamol 500',
                dosage: '1 Tablet',
                frequency: '1-0-1',
                quantity_prescribed: 10,
                quantity_dispensed: 0,
              },
            ],
          },
        ],
        history: [],
        current: {
          id: 1,
          prescription_id: 'CF-RX-10001',
          doctor_name: 'Dr. Rajesh Allam',
          status: 'PENDING',
          created_at: '2026-10-10T10:00:00Z',
          diagnosis: 'Mild hypertension',
          items: [
            {
              id: 1,
              medicine: 1,
              medicine_name: 'Paracetamol 500',
              dosage: '1 Tablet',
              frequency: '1-0-1',
              quantity_prescribed: 10,
              quantity_dispensed: 0,
            },
          ],
        },
      },
      prescribedMedicines: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
        },
      ],
      medicinesCatalogue: [
        {
          id: 1,
          medicine_code: 'MED-1001',
          name: 'Paracetamol 500',
          unit_price: '1.00',
          stock_quantity: 100,
        },
      ],
      receipts: [],
      counts: {
        upcomingAppointments: 1,
        activePrescriptions: 1,
        prescribedMedicines: 1,
        totalReceipts: 0,
      },
    });

    patientService.getAppointments.mockResolvedValue([
      {
        id: 1,
        appointment_id: 'CF-APT-10001',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_specialization: 'General Medicine',
        appointment_date: '2028-11-20',
        appointment_time: '10:00:00',
        status: 'SCHEDULED',
        consultation_fee: '500.00',
        reason_for_visit: 'Routine checkup',
      },
    ]);

    patientService.getAvailableSlots.mockResolvedValue({
      is_available_day: true,
      available_slots: ['09:00:00', '09:30:00', '10:00:00'],
    });

    patientService.getDoctors.mockResolvedValue([
      {
        id: 3,
        first_name: 'Rajesh',
        last_name: 'Allam',
        full_name: 'Dr. Rajesh Allam',
        specialization: 'General Medicine',
        consultation_fee: '500.00',
      },
    ]);

    patientService.bookAppointment.mockResolvedValue({
      id: 2,
      appointment_id: 'CF-APT-10002',
      status: 'SCHEDULED',
    });

    patientService.cancelAppointment.mockResolvedValue({
      id: 1,
      status: 'CANCELLED',
    });

    patientService.getPrescriptions.mockResolvedValue([
      {
        id: 1,
        prescription_id: 'CF-RX-10001',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_specialization: 'General Medicine',
        status: 'PENDING',
        created_at: '2026-10-10T10:00:00Z',
        diagnosis: 'Mild hypertension',
        items: [
          {
            id: 1,
            medicine: 1,
            medicine_name: 'Paracetamol 500',
            dosage: '1 Tablet',
            frequency: '1-0-1',
            quantity_prescribed: 10,
            quantity_dispensed: 0,
            instructions: 'After food',
          },
        ],
      },
    ]);

    patientService.getPrescriptionDetails.mockResolvedValue({
      id: 1,
      prescription_id: 'CF-RX-10001',
      doctor_name: 'Dr. Rajesh Allam',
      doctor_specialization: 'General Medicine',
      status: 'PENDING',
      created_at: '2026-10-10T10:00:00Z',
      diagnosis: 'Mild hypertension',
      clinical_notes: 'Take rest and drink plenty of water',
      items: [
        {
          id: 1,
          medicine: 1,
          medicine_name: 'Paracetamol 500',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          quantity_prescribed: 10,
          quantity_dispensed: 0,
          instructions: 'After food',
        },
      ],
    });

    patientService.getMedicines.mockResolvedValue([
      {
        id: 1,
        medicine_code: 'MED-1001',
        name: 'Paracetamol 500',
        dosage_form: 'TABLET',
        strength: '500mg',
        unit_price: '1.00',
        stock_quantity: 100,
      },
      {
        id: 2,
        medicine_code: 'MED-1002',
        name: 'Dolo 650',
        dosage_form: 'TABLET',
        strength: '650mg',
        unit_price: '10.00',
        stock_quantity: 10,
      },
    ]);

    patientService.checkoutMedicine.mockResolvedValue({
      success: true,
      message: 'Successfully purchased 2x Paracetamol 500. Receipt #CF-RCP-10001 issued.',
      receipt: {
        id: 1,
        receipt_number: 'CF-RCP-10001',
        bill_number: 'CF-INV-10001',
        patient_name: 'Nobitha Nobi',
        amount: '2.00',
        payment_method: 'UPI',
        status: 'SUCCESS',
        payment_date: '2026-10-14T11:00:00Z',
        bill_items: [
          {
            description: 'Paracetamol 500 500mg',
            quantity: 2,
            unit_price: '1.00',
            subtotal: '2.00',
          },
        ],
      },
    });

    patientService.getReceipts.mockResolvedValue([
      {
        id: 1,
        receipt_number: 'CF-RCP-10001',
        bill_number: 'CF-INV-10001',
        amount: '2.00',
        payment_method: 'UPI',
        status: 'SUCCESS',
        payment_date: '2026-10-14T11:00:00Z',
      },
    ]);

    patientService.getProfile.mockResolvedValue({
      id: 10,
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      email: 'nobitha@gmail.com',
      phone: '9876543210',
      role: 'PATIENT',
      is_email_verified: true,
    });
  });

  test('PatientHeader renders "Patient Portal" heading, profile chip, and theme switcher', () => {
    const patientUser = {
      username: 'nobitha',
      first_name: 'Nobitha',
      last_name: 'Nobi',
      role: 'PATIENT',
    };

    render(
      <BrowserRouter>
        <PatientHeader
          isSidebarOpen={false}
          onToggleSidebar={jest.fn()}
          onOpenProfile={jest.fn()}
          patientUser={patientUser}
          currentTheme="default"
          onThemeChange={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Patient Portal')).toBeInTheDocument();
    expect(screen.getByText('Nobitha Nobi')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
  });

  test('PatientSidebar renders exact 4 approved navigation items: Overview, Appointments, Prescriptions, Medicines', () => {
    render(
      <BrowserRouter>
        <PatientSidebar
          isOpen={true}
          onClose={jest.fn()}
          onOpenLogoutModal={jest.fn()}
          onOpenProfile={jest.fn()}
          patientUser={{ username: 'nobitha' }}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Prescriptions')).toBeInTheDocument();
    expect(screen.getByText('Medicines')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  test('PatientRoute redirects unauthenticated visitors to login', () => {
    authService.isAuthenticated.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('');

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <Routes>
          <Route path="/login" element={<div>Sign In Page Mock</div>} />
          <Route
            path="/patient"
            element={
              <PatientRoute>
                <div>Patient Protected Area</div>
              </PatientRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Sign In Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Patient Protected Area')).not.toBeInTheDocument();
  });

  test('PatientRoute blocks non-patient users with an Access Restricted card', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue('DOCTOR');

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <Routes>
          <Route
            path="/patient"
            element={
              <PatientRoute>
                <div>Patient Protected Area</div>
              </PatientRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Patient Portal Restricted')).toBeInTheDocument();
    expect(screen.queryByText('Patient Protected Area')).not.toBeInTheDocument();
  });

  test('PatientOverviewPage loads real upcoming appointments and current active prescription', async () => {
    render(
      <BrowserRouter>
        <PatientOverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.getByText('Active Prescriptions')).toBeInTheDocument();
      expect(screen.getByText('Prescribed Medicines')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Rajesh Allam')[0]).toBeInTheDocument();
      expect(screen.getByText(/CF-APT-10001/)).toBeInTheDocument();
    });
  });

  test('PatientAppointmentsPage renders appointments list and Book an Appointment button', async () => {
    render(
      <BrowserRouter>
        <PatientAppointmentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Appointments')).toBeInTheDocument();
      expect(screen.getByText('CF-APT-10001')).toBeInTheDocument();
      expect(screen.getByText('Scheduled (Pending Confirmation)')).toBeInTheDocument();
    });
  });

  test('PatientPrescriptionsPage separates active prescriptions and displays medicine line items', async () => {
    render(
      <BrowserRouter>
        <PatientPrescriptionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Prescriptions')).toBeInTheDocument();
      expect(screen.getByText('CF-RX-10001')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol 500')).toBeInTheDocument();
      expect(screen.getByText('Pending Dispensation')).toBeInTheDocument();
    });
  });

  test('PatientMedicinesPage displays prescribed medicines and catalogue tabs', async () => {
    render(
      <BrowserRouter>
        <PatientMedicinesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pharmacy & Medicines')).toBeInTheDocument();
      expect(screen.getByText(/My Prescribed Medicines/)).toBeInTheDocument();
      expect(screen.getByText(/Pharmacy Catalogue/)).toBeInTheDocument();
      expect(screen.getByText(/My Orders & Receipts/)).toBeInTheDocument();
    });
  });

  test('PatientAppointmentsPage opens styled Book an Appointment modal with specialist preview and slot chips', async () => {
    render(
      <BrowserRouter>
        <PatientAppointmentsPage />
      </BrowserRouter>
    );

    // Initial load
    await waitFor(() => {
      expect(screen.getByText('My Appointments')).toBeInTheDocument();
    });

    // Click "Book an Appointment"
    const bookBtn = screen.getByRole('button', { name: /Book an Appointment/i });
    fireEvent.click(bookBtn);

    // Modal title should appear
    await waitFor(() => {
      expect(screen.getByText('Book a Clinical Appointment')).toBeInTheDocument();
      expect(screen.getByLabelText(/Select Doctor \/ Clinical Specialist/i)).toBeInTheDocument();
    });

    // Inputs should have styled class .admin-input
    const doctorSelect = screen.getByLabelText(/Select Doctor \/ Clinical Specialist/i);
    expect(doctorSelect).toHaveClass('admin-input');

    // Select doctor
    fireEvent.change(doctorSelect, { target: { value: '3' } });

    // Specialist card should display doctor name and fee
    await waitFor(() => {
      expect(screen.getAllByText('Dr. Rajesh Allam').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('₹500.00').length).toBeGreaterThanOrEqual(2);
    });

    // Interactive time slot chips should render
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('09:30')).toBeInTheDocument();
    });

    // Click on a slot chip
    const slotChip = screen.getByText('09:30');
    fireEvent.click(slotChip);
    expect(slotChip).toHaveClass('selected');
  });

  test('PatientMedicinesPage opens official verified payment receipt and triggers print receipt', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <PatientMedicinesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/My Orders & Receipts/)).toBeInTheDocument();
    });

    // Click Receipts Tab
    fireEvent.click(screen.getByText(/My Orders & Receipts/));

    // View & Print button should be visible
    await waitFor(() => {
      expect(screen.getByText('CF-RCP-10001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View & Print/i })).toBeInTheDocument();
    });

    // Click View & Print
    fireEvent.click(screen.getByRole('button', { name: /View & Print/i }));

    // Official receipt elements must be present
    await waitFor(() => {
      expect(screen.getByText('CareFlow Multi-Speciality Hospital')).toBeInTheDocument();
      expect(screen.getByText(/TAX INVOICE & OFFICIAL PAYMENT RECEIPT/i)).toBeInTheDocument();
      expect(screen.getByText('Two Rupees Only')).toBeInTheDocument();
      expect(screen.getByText('Important Terms & Guidelines:')).toBeInTheDocument();
      expect(screen.getByText(/Swipe table horizontally to view all item details/i)).toBeInTheDocument();
    });

    // Click Print Receipt button
    const printBtn = screen.getByRole('button', { name: /Print Receipt/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
