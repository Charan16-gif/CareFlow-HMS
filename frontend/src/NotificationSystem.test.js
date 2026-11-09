import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotificationCenter from './components/common/NotificationCenter';
import AdminHeader from './components/admin/AdminHeader';
import DoctorHeader from './components/doctor/DoctorHeader';
import PatientHeader from './components/patient/PatientHeader';
import ReceptionistHeader from './components/receptionist/ReceptionistHeader';
import PharmacistHeader from './components/pharmacist/PharmacistHeader';
import LabStaffHeader from './components/labStaff/LabStaffHeader';
import notificationService from './services/notificationService';
import authService from './services/authService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('./services/authService', () => {
  const mockAuth = {
    isAuthenticated: jest.fn(() => true),
    getUserProfile: jest.fn(() => ({ username: 'testuser', role: 'ADMIN' })),
  };
  return {
    __esModule: true,
    default: mockAuth,
    ...mockAuth,
  };
});

jest.mock('./services/notificationService', () => {
  const mockNotif = {
    fetchUnreadCount: jest.fn(),
    fetchNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    clearAll: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockNotif,
    ...mockNotif,
  };
});

const mockNotifications = [
  {
    id: 1,
    notification_id: 'NTF-001',
    title: 'New Appointment Scheduled',
    message: 'Appointment APT-101 scheduled with Dr. Watson.',
    notification_type: 'APPOINTMENT',
    action_url: '/doctor/appointments',
    reference_id: 'APT-101',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    notification_id: 'NTF-002',
    title: 'Prescription Issued',
    message: 'New prescription issued for Dolo 650.',
    notification_type: 'PRESCRIPTION',
    action_url: '/patient/prescriptions',
    reference_id: 'RX-202',
    is_read: true,
    created_at: new Date().toISOString(),
  },
];

describe('CareFlow HMS – Centralized Notification System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationService.fetchUnreadCount.mockResolvedValue(1);
    notificationService.fetchNotifications.mockResolvedValue({
      results: mockNotifications,
      unreadCount: 1,
      count: 2,
    });
    notificationService.markAsRead.mockResolvedValue({ success: true, unread_count: 0 });
    notificationService.markAllAsRead.mockResolvedValue({ success: true, unread_count: 0 });
    notificationService.clearAll.mockResolvedValue({ success: true, unread_count: 0 });
  });

  test('renders notification bell in all 6 dashboard headers', async () => {
    const headers = [
      <AdminHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
      <DoctorHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
      <PatientHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
      <ReceptionistHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
      <PharmacistHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
      <LabStaffHeader isSidebarOpen={false} onToggleSidebar={jest.fn()} onOpenProfile={jest.fn()} />,
    ];

    for (const HeaderComponent of headers) {
      const { unmount } = render(
        <BrowserRouter>
          {HeaderComponent}
        </BrowserRouter>
      );
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toBeInTheDocument();
      unmount();
    }
  });

  test('displays unread notification badge counter on bell', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const badge = await screen.findByTestId('notification-unread-count');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  test('clicking bell opens notification panel and displays notifications', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const dialog = await screen.findByRole('dialog', { name: /notification center/i });
    expect(dialog).toBeInTheDocument();

    expect(await screen.findByText('New Appointment Scheduled')).toBeInTheDocument();
    expect(await screen.findByText('Prescription Issued')).toBeInTheDocument();
  });

  test('closing behavior 1: clicking X button closes the panel', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close notification panel/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closing behavior 2: clicking outside closes the panel', async () => {
    render(
      <BrowserRouter>
        <div data-testid="outside-element">Outside Area</div>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closing behavior 3: clicking bell again closes the panel (toggle)', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    // Open
    fireEvent.click(bellButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Toggle close
    fireEvent.click(bellButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closing behavior 4: pressing Escape key closes the panel', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('clicking inside the panel does NOT close it', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('clicking Mark as Read updates unread count and keeps panel open', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const markAsReadBtn = await screen.findByRole('button', { name: /mark notification as read/i });
    fireEvent.click(markAsReadBtn);

    expect(notificationService.markAsRead).toHaveBeenCalledWith(1);
    // Panel remains open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('clicking Mark All as Read updates unread count to 0', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const markAllBtn = await screen.findByRole('button', { name: /mark all read/i });
    fireEvent.click(markAllBtn);

    expect(notificationService.markAllAsRead).toHaveBeenCalled();
  });

  test('clicking Clear All clears notifications list and shows empty state', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const clearBtn = await screen.findByRole('button', { name: /clear/i });
    fireEvent.click(clearBtn);

    expect(notificationService.clearAll).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  test('clicking a notification navigates to action_url, marks as read, and closes panel', async () => {
    render(
      <BrowserRouter>
        <NotificationCenter />
      </BrowserRouter>
    );

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    const item = await screen.findByText('New Appointment Scheduled');
    fireEvent.click(item);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith(1);
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/appointments');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
