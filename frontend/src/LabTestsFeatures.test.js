import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DoctorSidebar from './components/doctor/DoctorSidebar';
import PatientSidebar from './components/patient/PatientSidebar';
import AdminSidebar from './components/admin/AdminSidebar';
import DoctorLabTestsPage from './pages/doctor/DoctorLabTestsPage';
import PatientLabTestsPage from './pages/patient/PatientLabTestsPage';
import AdminLabReportsPage from './pages/admin/AdminLabReportsPage';
import doctorService from './services/doctorService';
import patientService from './services/patientService';
import adminService from './services/adminService';

// Mock Services
jest.mock('./services/doctorService', () => ({
  __esModule: true,
  default: {
    getLabOrders: jest.fn(),
    getLabOrderDetails: jest.fn(),
    getLabTests: jest.fn(),
    getEligiblePatients: jest.fn(),
    createLabOrder: jest.fn(),
    requestCancellation: jest.fn(),
    downloadReport: jest.fn(),
  },
}));

jest.mock('./services/patientService', () => ({
  __esModule: true,
  default: {
    getLabOrders: jest.fn(),
    getLabOrderDetails: jest.fn(),
    downloadReport: jest.fn(),
  },
}));

jest.mock('./services/adminService', () => ({
  __esModule: true,
  default: {
    getLabReports: jest.fn(),
    getLabReportDetails: jest.fn(),
    downloadReport: jest.fn(),
  },
}));

const mockOrders = [
  {
    id: 1,
    order_id: 'CF-LAB-10001',
    patient: 1,
    patient_name: 'Matt Murdock',
    patient_identifier: 'CF-P-10001',
    patient_phone: '555-5555',
    doctor: 1,
    doctor_name: 'Dr. Claire Temple',
    doctor_specialization: 'Internal Medicine',
    test: 101,
    test_name: 'Complete Blood Count (CBC)',
    test_category: 'HEMATOLOGY',
    test_code: 'LAB-101',
    test_price: '35.00',
    status: 'REQUESTED',
    clinical_notes: 'Evaluate recurrent fatigue and anemia',
    ordered_at: '2026-10-15T09:00:00Z',
    cancellation_requested: false,
    report_file: null,
  },
  {
    id: 2,
    order_id: 'CF-LAB-10002',
    patient: 1,
    patient_name: 'Matt Murdock',
    patient_identifier: 'CF-P-10001',
    patient_phone: '555-5555',
    doctor: 1,
    doctor_name: 'Dr. Claire Temple',
    doctor_specialization: 'Internal Medicine',
    test: 102,
    test_name: 'Comprehensive Metabolic Panel (CMP)',
    test_category: 'BIOCHEMISTRY',
    test_code: 'LAB-102',
    test_price: '55.00',
    status: 'COMPLETED',
    clinical_notes: 'Routine pre-operative workup',
    result_value: '14.5',
    result_unit: 'mg/dL',
    reference_range_used: 'Standard thresholds',
    result_interpretation: 'Normal metabolic profile',
    result_notes: 'All electrolytes within normal range',
    ordered_at: '2026-10-14T08:30:00Z',
    completed_at: '2026-10-14T14:00:00Z',
    cancellation_requested: false,
    report_file: '/media/lab_reports/2026/10/report.pdf',
  },
];

describe('CareFlow HMS — Lab Tests Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Navigation Verification', () => {
    test('DoctorSidebar renders Lab Tests navigation item', () => {
      render(
        <MemoryRouter>
          <DoctorSidebar
            isOpen={true}
            onClose={() => {}}
            doctorUser={{ first_name: 'Claire', last_name: 'Temple', specialization: 'Internal Medicine' }}
          />
        </MemoryRouter>
      );
      expect(screen.getByText('Lab Tests')).toBeInTheDocument();
      const labLink = screen.getByText('Lab Tests').closest('a');
      expect(labLink).toHaveAttribute('href', '/doctor/lab-tests');
    });

    test('PatientSidebar renders My Lab Tests navigation item', () => {
      render(
        <MemoryRouter>
          <PatientSidebar
            isOpen={true}
            onClose={() => {}}
            patientUser={{ first_name: 'Matt', last_name: 'Murdock' }}
          />
        </MemoryRouter>
      );
      expect(screen.getByText('My Lab Tests')).toBeInTheDocument();
      const labLink = screen.getByText('My Lab Tests').closest('a');
      expect(labLink).toHaveAttribute('href', '/patient/lab-tests');
    });

    test('AdminSidebar renders Lab Reports navigation item', () => {
      render(
        <MemoryRouter>
          <AdminSidebar
            isOpen={true}
            onClose={() => {}}
            adminUser={{ first_name: 'Charan', last_name: 'Admin' }}
          />
        </MemoryRouter>
      );
      expect(screen.getByText('Lab Reports')).toBeInTheDocument();
      const reportsLink = screen.getByText('Lab Reports').closest('a');
      expect(reportsLink).toHaveAttribute('href', '/admin/lab-reports');
    });
  });

  describe('2. Doctor Dashboard — Lab Tests Page', () => {
    test('renders orders, metrics, and handles Create Request modal', async () => {
      doctorService.getLabOrders.mockResolvedValue(mockOrders);
      doctorService.getEligiblePatients.mockResolvedValue([
        { id: 1, full_name: 'Matt Murdock', patient_id: 'CF-P-10001' },
      ]);
      doctorService.getLabTests.mockResolvedValue([
        { id: 101, test_code: 'LAB-101', test_name: 'Complete Blood Count (CBC)', category: 'HEMATOLOGY', price: '35.00' },
      ]);

      render(
        <MemoryRouter>
          <DoctorLabTestsPage />
        </MemoryRouter>
      );

      // Verify header and metrics after async data loads
      expect(await screen.findByText('CF-LAB-10001')).toBeInTheDocument();
      expect(screen.getByText('Complete Blood Count (CBC)')).toBeInTheDocument();
      expect(screen.getByText('CF-LAB-10002')).toBeInTheDocument();

      // Open Request Lab Test Modal
      const requestBtn = screen.getByRole('button', { name: /Request Lab Test/i });
      fireEvent.click(requestBtn);

      expect(await screen.findByText('Request Laboratory Diagnostic Test')).toBeInTheDocument();
      expect(screen.getByText(/Patient Under Your Care/i)).toBeInTheDocument();
    });

    test('renders cancellation button for eligible orders and opens cancellation modal', async () => {
      doctorService.getLabOrders.mockResolvedValue(mockOrders);

      render(
        <MemoryRouter>
          <DoctorLabTestsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('CF-LAB-10001')).toBeInTheDocument();

      // Order 1 is REQUESTED, so it is eligible for cancellation
      const cancelBtn = screen.getByTitle('Request Test Cancellation');
      expect(cancelBtn).toBeInTheDocument();

      fireEvent.click(cancelBtn);
      expect(await screen.findByText(/Request Test Cancellation/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancellation Reason/i)).toBeInTheDocument();
    });

    test('opens details modal with structured results and report download', async () => {
      doctorService.getLabOrders.mockResolvedValue(mockOrders);
      doctorService.getLabOrderDetails.mockResolvedValue(mockOrders[1]);

      render(
        <MemoryRouter>
          <DoctorLabTestsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('CF-LAB-10002')).toBeInTheDocument();

      const detailBtns = screen.getAllByRole('button', { name: /Details/i });
      fireEvent.click(detailBtns[1]);

      expect(await screen.findByText(/Diagnostic Order CF-LAB-10002/i)).toBeInTheDocument();
      expect(await screen.findByText(/Structured Laboratory Findings/i)).toBeInTheDocument();
      expect(screen.getByText(/Normal metabolic profile/i)).toBeInTheDocument();
    });
  });

  describe('3. Patient Dashboard — My Lab Tests Page', () => {
    test('renders patient lab tests with 4-step progress and no create/cancel controls', async () => {
      patientService.getLabOrders.mockResolvedValue(mockOrders);

      render(
        <MemoryRouter>
          <PatientLabTestsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('Complete Blood Count (CBC)')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4: Requested')).toBeInTheDocument();

      // Ensure patient CANNOT create or cancel tests
      expect(screen.queryByRole('button', { name: /Request Lab Test/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
    });

    test('opens test details modal for patient and displays findings', async () => {
      patientService.getLabOrders.mockResolvedValue(mockOrders);
      patientService.getLabOrderDetails.mockResolvedValue(mockOrders[1]);

      render(
        <MemoryRouter>
          <PatientLabTestsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('Comprehensive Metabolic Panel (CMP)')).toBeInTheDocument();

      const detailBtns = screen.getAllByRole('button', { name: /Details/i });
      fireEvent.click(detailBtns[1]);

      expect(await screen.findByText(/Analysis Lifecycle/i)).toBeInTheDocument();
      expect(await screen.findByText(/Clinical Test Results & Findings/i)).toBeInTheDocument();
      expect(screen.getByText(/Normal metabolic profile/i)).toBeInTheDocument();
    });
  });

  describe('4. Admin Dashboard — Lab Reports Page (Read-Only)', () => {
    test('renders read-only lab reports archive with metadata and no modification controls', async () => {
      adminService.getLabReports.mockResolvedValue(mockOrders);

      render(
        <MemoryRouter>
          <AdminLabReportsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('Laboratory Reports Archive')).toBeInTheDocument();
      expect(screen.getByText('Read-Only')).toBeInTheDocument();
      expect(await screen.findByText('CF-LAB-10001')).toBeInTheDocument();
      expect(screen.getByText('CF-LAB-10002')).toBeInTheDocument();

      // Ensure NO action to create, change status, cancel, or delete
      expect(screen.queryByRole('button', { name: /Request Lab Test/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });

    test('opens audit details view with complete physician and patient references', async () => {
      adminService.getLabReports.mockResolvedValue(mockOrders);
      adminService.getLabReportDetails.mockResolvedValue(mockOrders[1]);

      render(
        <MemoryRouter>
          <AdminLabReportsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText('CF-LAB-10002')).toBeInTheDocument();

      const metaBtns = screen.getAllByRole('button', { name: /Metadata/i });
      fireEvent.click(metaBtns[1]);

      expect(await screen.findByText(/Administrative Diagnostic Audit View \(Read-Only\)/i)).toBeInTheDocument();
      expect(await screen.findByText(/Patient Reference/i)).toBeInTheDocument();
      expect(screen.getByText(/Requesting Doctor Reference/i)).toBeInTheDocument();
      expect(screen.getByText('Close Audit View')).toBeInTheDocument();
    });
  });
});
