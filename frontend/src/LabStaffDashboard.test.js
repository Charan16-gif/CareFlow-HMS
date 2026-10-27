import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import LabStaffHeader from './components/labStaff/LabStaffHeader';
import LabStaffSidebar from './components/labStaff/LabStaffSidebar';
import LabStaffRoute from './components/labStaff/LabStaffRoute';
import LabStaffOverviewPage from './pages/labStaff/LabStaffOverviewPage';
import LabStaffTestRequestsPage from './pages/labStaff/LabStaffTestRequestsPage';
import LabStaffEnterResultsPage from './pages/labStaff/LabStaffEnterResultsPage';
import LabStaffReportsPage from './pages/labStaff/LabStaffReportsPage';
import LabStaffTestResultDetailsPage from './pages/labStaff/LabStaffTestResultDetailsPage';
import authService from './services/authService';
import labStaffService from './services/labStaffService';

// Mock authService and labStaffService
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isLabStaff: jest.fn(),
    isAdmin: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn().mockResolvedValue({
      id: 5,
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      email: 'labtech@careflow.com',
      role: 'LAB_STAFF',
    }),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/labStaffService', () => {
  const service = {
    getStats: jest.fn().mockResolvedValue({
      total: 15,
      requested: 4,
      accepted: 3,
      in_progress: 3,
      completed: 4,
      cancelled: 1,
      pending_cancellations: 1,
      reports_uploaded: 3,
    }),
    getOrders: jest.fn().mockResolvedValue([
      {
        id: 101,
        order_id: 'ORD-20261019-101',
        test_name: 'Complete Blood Count (CBC)',
        patient_name: 'John Doe',
        patient_age: 34,
        patient_gender: 'Male',
        doctor_name: 'Dr. Gregory House',
        doctor_department: 'Diagnostics',
        status: 'REQUESTED',
        clinical_notes: 'Check for anemia',
        created_at: '2026-10-19T08:30:00Z',
        report_file: null,
      },
      {
        id: 102,
        order_id: 'ORD-20261019-102',
        test_name: 'Lipid Panel',
        patient_name: 'Jane Smith',
        patient_age: 45,
        patient_gender: 'Female',
        doctor_name: 'Dr. James Wilson',
        doctor_department: 'Oncology',
        status: 'IN_PROGRESS',
        result_value: '210',
        result_unit: 'mg/dL',
        reference_range_used: '< 200 mg/dL',
        result_interpretation: 'ABNORMAL',
        created_at: '2026-10-18T14:15:00Z',
        report_file: '/media/lab_reports/lipid_102.pdf',
      },
      {
        id: 103,
        order_id: 'ORD-20261019-103',
        test_name: 'Hemoglobin A1c (HbA1c)',
        patient_name: 'Doraemon Nobi',
        patient_age: 10,
        patient_gender: 'Male',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_department: 'General Medicine',
        status: 'COMPLETED',
        result_value: '5.6',
        result_unit: '%',
        reference_range_used: '< 5.7%',
        result_interpretation: 'NORMAL',
        created_at: '2026-10-18T10:00:00Z',
        report_file: null,
      },
    ]),
    getOrderDetails: jest.fn().mockResolvedValue({
      id: 101,
      order_id: 'ORD-20261019-101',
      test_name: 'Complete Blood Count (CBC)',
      patient_name: 'John Doe',
      patient_age: 34,
      patient_gender: 'Male',
      doctor_name: 'Dr. Gregory House',
      doctor_department: 'Diagnostics',
      status: 'REQUESTED',
      clinical_notes: 'Check for anemia',
      created_at: '2026-10-19T08:30:00Z',
      test_detail: {
        code: 'CBC-01',
        category: 'Hematology',
        specimen_type: 'Whole Blood EDTA',
        turnaround_time: '24 Hours',
        unit: 'g/dL',
        reference_range: '13.5 - 17.5 g/dL',
      },
      result_value: '',
      result_unit: '',
      reference_range_used: '',
      result_interpretation: 'NORMAL',
      result_notes: '',
      report_file: null,
    }),
    getTestCatalogue: jest.fn().mockResolvedValue([]),
    getProfile: jest.fn().mockResolvedValue({
      id: 5,
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      email: 'labtech@careflow.com',
      role: 'LAB_STAFF',
    }),
    acceptOrder: jest.fn().mockResolvedValue({ id: 101, status: 'ACCEPTED' }),
    startOrder: jest.fn().mockResolvedValue({ id: 101, status: 'IN_PROGRESS' }),
    updateResults: jest.fn().mockResolvedValue({ id: 101, status: 'IN_PROGRESS' }),
    completeOrder: jest.fn().mockResolvedValue({ id: 101, status: 'COMPLETED' }),
    cancelOrder: jest.fn().mockResolvedValue({ id: 101, status: 'CANCELLED' }),
    processCancellation: jest.fn().mockResolvedValue({ id: 101, status: 'CANCELLED' }),
    uploadReport: jest.fn().mockResolvedValue({ id: 101, report_file: '/media/lab_reports/test.pdf' }),
    downloadReport: jest.fn().mockResolvedValue(new Blob(['dummy pdf'], { type: 'application/pdf' })),
  };
  return {
    __esModule: true,
    default: service,
    labStaffService: service,
  };
});

describe('CareFlow HMS — Lab Staff Dashboard Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authService.isAuthenticated.mockReturnValue(true);
    authService.isLabStaff.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('LAB_STAFF');
    authService.getUserProfile.mockReturnValue({
      id: 5,
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      email: 'labtech@careflow.com',
      role: 'LAB_STAFF',
    });
    authService.fetchProfile.mockResolvedValue({
      id: 5,
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      email: 'labtech@careflow.com',
      role: 'LAB_STAFF',
    });

    labStaffService.getStats.mockResolvedValue({
      total: 15,
      requested: 4,
      accepted: 3,
      in_progress: 3,
      completed: 4,
      cancelled: 1,
      pending_cancellations: 1,
      reports_uploaded: 3,
    });

    const mockOrders = [
      {
        id: 101,
        order_id: 'ORD-20261019-101',
        test_name: 'Complete Blood Count (CBC)',
        patient_name: 'John Doe',
        patient_age: 34,
        patient_gender: 'Male',
        doctor_name: 'Dr. Gregory House',
        doctor_department: 'Diagnostics',
        status: 'REQUESTED',
        clinical_notes: 'Check for anemia',
        created_at: '2026-10-19T08:30:00Z',
        report_file: null,
      },
      {
        id: 102,
        order_id: 'ORD-20261019-102',
        test_name: 'Lipid Panel',
        patient_name: 'Jane Smith',
        patient_age: 45,
        patient_gender: 'Female',
        doctor_name: 'Dr. James Wilson',
        doctor_department: 'Oncology',
        status: 'IN_PROGRESS',
        result_value: '210',
        result_unit: 'mg/dL',
        reference_range_used: '< 200 mg/dL',
        result_interpretation: 'ABNORMAL',
        created_at: '2026-10-18T14:15:00Z',
        report_file: '/media/lab_reports/lipid_102.pdf',
      },
      {
        id: 103,
        order_id: 'ORD-20261019-103',
        test_name: 'Hemoglobin A1c (HbA1c)',
        patient_name: 'Doraemon Nobi',
        patient_age: 10,
        patient_gender: 'Male',
        doctor_name: 'Dr. Rajesh Allam',
        doctor_department: 'General Medicine',
        status: 'COMPLETED',
        result_value: '5.6',
        result_unit: '%',
        reference_range_used: '< 5.7%',
        result_interpretation: 'NORMAL',
        created_at: '2026-10-18T10:00:00Z',
        report_file: null,
      },
    ];

    labStaffService.getOrders.mockResolvedValue(mockOrders);
    labStaffService.getOrderDetails.mockResolvedValue({
      id: 101,
      order_id: 'ORD-20261019-101',
      test_name: 'Complete Blood Count (CBC)',
      patient_name: 'John Doe',
      patient_age: 34,
      patient_gender: 'Male',
      doctor_name: 'Dr. Gregory House',
      doctor_department: 'Diagnostics',
      status: 'REQUESTED',
      clinical_notes: 'Check for anemia',
      created_at: '2026-10-19T08:30:00Z',
      test_detail: {
        code: 'CBC-01',
        category: 'Hematology',
        specimen_type: 'Whole Blood EDTA',
        turnaround_time: '24 Hours',
        unit: 'g/dL',
        reference_range: '13.5 - 17.5 g/dL',
      },
      result_value: '',
      result_unit: '',
      reference_range_used: '',
      result_interpretation: 'NORMAL',
      result_notes: '',
      report_file: null,
    });
    labStaffService.getProfile.mockResolvedValue({
      id: 5,
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      email: 'labtech@careflow.com',
      role: 'LAB_STAFF',
    });
  });

  test('LabStaffHeader renders "Laboratory Dashboard" heading, user chip, and theme switcher', () => {
    const user = {
      username: 'labtech1',
      first_name: 'Sarah',
      last_name: 'Bio',
      role: 'LAB_STAFF',
    };

    render(
      <BrowserRouter>
        <LabStaffHeader
          isSidebarOpen={false}
          onToggleSidebar={jest.fn()}
          onOpenProfile={jest.fn()}
          labUser={user}
          currentTheme="default"
          onThemeChange={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Laboratory Staff Portal/i })).toBeInTheDocument();
    expect(screen.getByText(/Sarah Bio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change theme/i })).toBeInTheDocument();
  });

  test('LabStaffSidebar renders all 4 navigation destinations and sign out button', () => {
    render(
      <BrowserRouter>
        <LabStaffSidebar isOpen={true} onClose={jest.fn()} onOpenProfile={jest.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Test Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Enter Results/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upload Reports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
  });

  test('LabStaffRoute blocks non-lab-staff authenticated users with Access Restricted notice', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isLabStaff.mockReturnValue(false);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('PATIENT');

    render(
      <MemoryRouter>
        <LabStaffRoute>
          <div>Protected Lab Staff Content</div>
        </LabStaffRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Laboratory Portal Restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected Lab Staff Content/i)).not.toBeInTheDocument();
  });

  test('LabStaffRoute allows authenticated LAB_STAFF user to access children', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isLabStaff.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('LAB_STAFF');

    render(
      <MemoryRouter>
        <LabStaffRoute>
          <div>Protected Lab Staff Content</div>
        </LabStaffRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Protected Lab Staff Content/i)).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });

  test('LabStaffOverviewPage displays summary metrics from backend and loads active requests', async () => {
    render(
      <BrowserRouter>
        <LabStaffOverviewPage />
      </BrowserRouter>
    );

    // Verify stats from backend get loaded
    await waitFor(() => {
      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('Newly Requested')).toBeInTheDocument();
      expect(screen.getByText('Tests Accepted')).toBeInTheDocument();
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
      expect(screen.getByText('Completed Tests')).toBeInTheDocument();
      expect(screen.getAllByText(/Cancelled/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('15').length).toBeGreaterThan(0); // total count in card and tab
    });

    // Verify orders table loaded
    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count (CBC)')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  test('LabStaffTestRequestsPage renders tabs and allows status-based filtering', async () => {
    render(
      <BrowserRouter>
        <LabStaffTestRequestsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Diagnostic Test Requests/i })).toBeInTheDocument();
      expect(screen.getByText(/Needs Intake \/ Acceptance/i)).toBeInTheDocument();
      expect(screen.getByText(/Complete Blood Count \(CBC\)/i)).toBeInTheDocument();
      expect(screen.getByText('ORD-20261019-101')).toBeInTheDocument();
    });
  });

  test('LabStaffEnterResultsPage renders diagnostic input fields and allows draft saving', async () => {
    render(
      <MemoryRouter initialEntries={['/lab-staff/enter-results/101']}>
        <Routes>
          <Route path="/lab-staff/enter-results/:orderId" element={<LabStaffEnterResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Enter & Validate Test Results/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. 14\.2, Negative, Normal/i)).toBeInTheDocument();
      expect(screen.getByText(/Save Findings Draft/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify & Finalize Complete/i)).toBeInTheDocument();
    });
  });

  test('LabStaffReportsPage renders upload controls and report management table', async () => {
    render(
      <BrowserRouter>
        <LabStaffReportsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Upload & Manage Diagnostic Reports/i)).toBeInTheDocument();
      expect(screen.getByText(/Awaiting Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Reports Attached/i)).toBeInTheDocument();
    });
  });

  test('LabStaffReportsPage excludes completed tests without report file from Awaiting Report and hides Upload button', async () => {
    render(
      <BrowserRouter>
        <LabStaffReportsPage />
      </BrowserRouter>
    );

    // Initial render shows All Requests. Wait for table
    await waitFor(() => {
      expect(screen.getByText('ORD-20261019-103')).toBeInTheDocument();
    });

    // Click on "Awaiting Report" tab
    const awaitingTab = screen.getByRole('button', { name: /Awaiting Report/i });
    fireEvent.click(awaitingTab);

    // Order 103 (COMPLETED) must NOT appear in Awaiting Report
    await waitFor(() => {
      expect(screen.queryByText('ORD-20261019-103')).not.toBeInTheDocument();
      // Order 101 (REQUESTED without file) should be in Awaiting Report
      expect(screen.getByText('ORD-20261019-101')).toBeInTheDocument();
    });

    // Switch to Completed tab
    const completedTab = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261019-103')).toBeInTheDocument();
      expect(screen.getByText('Results Recorded')).toBeInTheDocument();
      // The row for ORD-20261019-103 should NOT contain an "Upload" button
      const row = screen.getByText('ORD-20261019-103').closest('tr');
      expect(row).not.toHaveTextContent('Upload');
    });
  });

  test('LabStaffTestRequestsPage does not render Upload or Enter Results buttons for completed orders', async () => {
    render(
      <BrowserRouter>
        <LabStaffTestRequestsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-20261019-103')).toBeInTheDocument();
    });

    const completedRow = screen.getByText('ORD-20261019-103').closest('tr');
    expect(completedRow).not.toHaveTextContent('Upload');
    expect(completedRow).not.toHaveTextContent('Enter Results');
  });

  test('LabStaffEnterResultsPage renders clean empty state and disabled select when no active orders exist', async () => {
    // Mock getOrders to return only completed or cancelled orders
    labStaffService.getOrders.mockResolvedValueOnce([
      { id: 103, status: 'COMPLETED' },
      { id: 104, status: 'CANCELLED' },
    ]);

    render(
      <MemoryRouter initialEntries={['/lab-staff/enter-results']}>
        <Routes>
          <Route path="/lab-staff/enter-results" element={<LabStaffEnterResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /No Active Test Requests Pending Results/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /No Active Test Requests/i })).toBeInTheDocument();
    });
  });

  test('LabStaffTestResultDetailsPage renders Print Diagnostic Report and printable report element', async () => {
    labStaffService.getOrderDetails.mockResolvedValueOnce({
      id: 103,
      order_id: 'ORD-20261019-103',
      test_name: 'Hemoglobin A1c (HbA1c)',
      patient_name: 'Doraemon Nobi',
      patient_age: 10,
      patient_gender: 'Male',
      doctor_name: 'Dr. Rajesh Allam',
      doctor_department: 'General Medicine',
      status: 'COMPLETED',
      result_value: '5.6',
      result_unit: '%',
      reference_range_used: '< 5.7%',
      result_interpretation: 'NORMAL',
      result_notes: 'Specimen verified via automated analyzer.',
      created_at: '2026-10-18T10:00:00Z',
      completed_at: '2026-10-18T11:00:00Z',
      report_file: null,
    });

    render(
      <MemoryRouter initialEntries={['/lab-staff/results/103']}>
        <Routes>
          <Route path="/lab-staff/results/:orderId" element={<LabStaffTestResultDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Print Diagnostic Report/i })).toBeInTheDocument();
    });

    // Check that the printable laboratory report container is in the document
    const printableReport = document.getElementById('printable-lab-report');
    expect(printableReport).toBeInTheDocument();
    expect(printableReport).toHaveTextContent('Diagnostic Report');
    expect(printableReport).toHaveTextContent('CareFlow Hospital');
    expect(printableReport).toHaveTextContent('Doraemon Nobi');
    expect(printableReport).toHaveTextContent('Hemoglobin A1c (HbA1c)');
    expect(printableReport).toHaveTextContent('5.6 %');
  });
});


