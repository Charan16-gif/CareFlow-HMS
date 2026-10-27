import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminHeader from './components/admin/AdminHeader';
import AdminSidebar from './components/admin/AdminSidebar';
import AdminRoute from './components/admin/AdminRoute';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPrescriptionsPage from './pages/admin/AdminPrescriptionsPage';
import AdminTabletsPage from './pages/admin/AdminTabletsPage';
import authService from './services/authService';
import adminService from './services/adminService';

// Mock authService and adminService to isolate frontend component rendering
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isAdmin: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn().mockResolvedValue({
      id: 1,
      username: 'charan',
      first_name: 'Charan',
      last_name: 'Admin',
      email: 'admin@careflow.com',
      role: 'ADMIN',
    }),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/adminService', () => {
  const service = {
    getOverviewMetrics: jest.fn().mockResolvedValue({
      counts: {
        patients: 12,
        doctors: 4,
        labStaff: 3,
        pharmacists: 2,
        receptionists: 5,
      },
      inventory: {
        totalTypes: 8,
        totalStock: 450,
        lowStockCount: 1,
        outOfStockCount: 0,
      },
      patientsList: [
        { id: 1, created_at: '2026-10-01T10:00:00Z' },
        { id: 2, created_at: '2026-10-02T11:00:00Z' },
      ],
    }),
    getPatients: jest.fn().mockResolvedValue([]),
    getDoctors: jest.fn().mockResolvedValue([]),
    getStaff: jest.fn().mockResolvedValue([]),
    getPrescriptions: jest.fn().mockResolvedValue([]),
    getMedicines: jest.fn().mockResolvedValue([]),
    getProfile: jest.fn().mockResolvedValue({
      id: 1,
      username: 'charan',
      first_name: 'Charan',
      last_name: 'Admin',
      email: 'admin@careflow.com',
      phone: '+91 98765 43210',
      role: 'ADMIN',
    }),
  };
  return {
    __esModule: true,
    default: service,
    adminService: service,
  };
});

describe('CareFlow HMS — Admin Dashboard Component Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AdminHeader renders "Admin Dashboard" heading, profile chip, and theme switcher', () => {
    const adminUser = {
      username: 'charan',
      first_name: 'Charan',
      last_name: 'Admin',
      role: 'ADMIN',
    };

    const handleThemeChange = jest.fn();
    render(
      <BrowserRouter>
        <AdminHeader
          isSidebarOpen={false}
          onToggleSidebar={jest.fn()}
          onOpenProfile={jest.fn()}
          adminUser={adminUser}
          currentTheme="default"
          onThemeChange={handleThemeChange}
        />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Admin Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Charan Admin/i)).toBeInTheDocument();
    // Verify theme switcher exists in header
    expect(screen.getByRole('button', { name: /Change theme/i })).toBeInTheDocument();
  });

  test('AdminSidebar renders all 4 navigation destinations and sign out button', () => {
    render(
      <BrowserRouter>
        <AdminSidebar isOpen={true} onClose={jest.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prescriptions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tablets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
  });

  test('AdminRoute blocks non-admin authenticated users with Access Restricted notice', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);
    authService.getUserRole.mockReturnValue('PATIENT');

    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Protected Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/PATIENT/i)).toBeInTheDocument();
  });

  test('AdminRoute permits authenticated ADMIN user to view protected content', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Protected Hospital Content</div>
        </AdminRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Hospital Content')).toBeInTheDocument();
  });

  test('AdminOverviewPage renders role summary cards and tablet inventory', async () => {
    adminService.getOverviewMetrics.mockResolvedValue({
      counts: {
        patients: 12,
        doctors: 4,
        labStaff: 3,
        pharmacists: 2,
        receptionists: 5,
      },
      inventory: {
        totalTypes: 8,
        totalStock: 450,
        lowStockCount: 1,
        outOfStockCount: 0,
      },
      patientsList: [
        { id: 1, created_at: '2026-10-01T10:00:00Z' },
        { id: 2, created_at: '2026-10-02T11:00:00Z' },
      ],
    });

    render(
      <BrowserRouter>
        <AdminOverviewPage />
      </BrowserRouter>
    );

    // Verify summary cards
    expect(await screen.findByText(/Total Patients/i)).toBeInTheDocument();
    expect(await screen.findByText(/Total Doctors/i)).toBeInTheDocument();
    expect(await screen.findByText(/Total Lab Staff/i)).toBeInTheDocument();
    expect(await screen.findByText(/Total Pharmacists/i)).toBeInTheDocument();
    expect(await screen.findByText(/Total Receptionists/i)).toBeInTheDocument();
    expect(await screen.findByText(/Tablet Stock Summary/i)).toBeInTheDocument();
  });

  test('AdminUsersPage renders all 5 role tabs and Add User button', async () => {
    render(
      <BrowserRouter>
        <AdminUsersPage />
      </BrowserRouter>
    );

    expect(await screen.findByRole('tab', { name: /Patients/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Doctors/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Lab Staff/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pharmacists/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Receptionists/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add User/i })).toBeInTheDocument();
  });

  test('AdminPrescriptionsPage renders clinical prescriptions table and policy banner', async () => {
    render(
      <BrowserRouter>
        <AdminPrescriptionsPage />
      </BrowserRouter>
    );

    expect(await screen.findByRole('heading', { level: 2, name: /Hospital Prescriptions/i })).toBeInTheDocument();
    expect(screen.getByText(/Clinical Prescription Policy/i)).toBeInTheDocument();
  });

  test('AdminTabletsPage renders pharmacy tablets inventory heading with view-only audit policy and no Add Tablet button', async () => {
    render(
      <BrowserRouter>
        <AdminTabletsPage />
      </BrowserRouter>
    );

    expect(await screen.findByRole('heading', { level: 2, name: /Pharmacy Tablets & Medicines/i })).toBeInTheDocument();
    expect(screen.getByText(/View-Only Inventory Audit/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Tablet/i })).not.toBeInTheDocument();
  });
});
