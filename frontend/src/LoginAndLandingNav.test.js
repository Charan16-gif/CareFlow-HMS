import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AppContent } from './App';
import { ToastProvider, toast } from './context/ToastContext';
import authService from './services/authService';

jest.mock('./services/authService');
jest.mock('./services/api', () => ({
  fetchBackendHealth: jest.fn().mockResolvedValue({ status: 'healthy', database: 'connected' }),
}));

describe('Login & Register - Back to Home, Toast-Only Validation & Switch Account Removal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    toast.clearHistory?.();
  });

  test('LoginPage renders "Back to Home" navigation button with link to "/"', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('link', { name: /Back to CareFlow Home/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/');
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  test('RegisterPage renders "Back to Home" navigation button with link to "/"', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('link', { name: /Back to CareFlow Home/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveAttribute('href', '/');
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });

  test('RegisterPage does NOT render any inline email validation UI, checking text or retry buttons', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/Checking email address/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Retry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/We couldn't verify this email address/i)).not.toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/name@example\.com/i);
    expect(emailInput).toBeInTheDocument();

    // Typing in the input should not spawn inline checking text
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    expect(screen.queryByText(/Checking email address/i)).not.toBeInTheDocument();
  });

  test('LoginPage completely removes Saved Account, masked email, and Switch Account button', () => {
    localStorage.setItem('careflow_remembered_email', 'charan@gmail.com');

    render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    // Saved Account, masked email, and Switch Account button must be completely gone
    expect(screen.queryByText(/Saved Account/i)).not.toBeInTheDocument();
    expect(screen.queryByText('ch****@gmail.com')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch account/i })).not.toBeInTheDocument();

    // Standard username/email input is directly rendered and visible
    const input = screen.getByPlaceholderText(/Enter your username or email/i);
    expect(input).toBeInTheDocument();
  });

  test('LoginPage blocks invalid email format submission with error toast only', async () => {
    authService.login = jest.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Enter your username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Portal/i });

    // Invalid email format (missing domain suffix)
    fireEvent.change(input, { target: { value: 'charan@gmail' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    // authService.login must NOT be called
    expect(authService.login).not.toHaveBeenCalled();

    // Error toast must appear
    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email address\./i)
      ).toBeInTheDocument();
    });
  });

  test('RegisterPage blocks registration immediately and shows error toast when email format is invalid', async () => {
    authService.validateEmail = jest.fn();
    authService.register = jest.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/name@example\.com/i);
    const registerBtn = screen.getByRole('button', { name: /Continue to email verification/i });

    // Fill valid details except invalid email
    fireEvent.change(screen.getByPlaceholderText('Eleanor'), { target: { value: 'Eleanor' } });
    fireEvent.change(screen.getByPlaceholderText('Vance'), { target: { value: 'Vance' } });
    fireEvent.change(screen.getByPlaceholderText('+1 (555) 019-2834'), { target: { value: '9876543210' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email-address' } });
    fireEvent.change(screen.getByPlaceholderText('Create a secure password'), { target: { value: 'StrongPass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'StrongPass123!' } });

    fireEvent.click(registerBtn);

    // Neither email verification nor register API should be called
    expect(authService.validateEmail).not.toHaveBeenCalled();
    expect(authService.register).not.toHaveBeenCalled();

    // Error toast appears
    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email address\./i)
      ).toBeInTheDocument();
    });
  });

  test('RegisterPage blocks registration when asynchronous validate-email returns invalid mailbox', async () => {
    authService.validateEmail = jest.fn().mockResolvedValue({
      email: 'nonexistent_box@careflow.com',
      status: 'MAILBOX_NOT_FOUND',
      is_valid: false,
      message: 'This email address does not exist.',
      allow_continue: false,
    });
    authService.register = jest.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/name@example\.com/i);
    const registerBtn = screen.getByRole('button', { name: /Continue to email verification/i });

    fireEvent.change(screen.getByPlaceholderText('Eleanor'), { target: { value: 'Eleanor' } });
    fireEvent.change(screen.getByPlaceholderText('Vance'), { target: { value: 'Vance' } });
    fireEvent.change(screen.getByPlaceholderText('+1 (555) 019-2834'), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1995-05-20' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'FEMALE' } });
    fireEvent.change(emailInput, { target: { value: 'nonexistent_box@careflow.com' } });
    fireEvent.change(screen.getByPlaceholderText('Create a secure password'), { target: { value: 'StrongPass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'StrongPass123!' } });

    fireEvent.click(registerBtn);

    // authService.validateEmail was called to verify mailbox
    await waitFor(() => {
      expect(authService.validateEmail).toHaveBeenCalledWith('nonexistent_box@careflow.com');
    });

    // authService.register must strictly NOT be called
    expect(authService.register).not.toHaveBeenCalled();

    // Error toast matching the deliverability error must appear
    await waitFor(() => {
      expect(screen.getByText('This email address does not exist.')).toBeInTheDocument();
    });

    // User details must be preserved on page
    expect(emailInput.value).toBe('nonexistent_box@careflow.com');
  });

  test('RegisterPage proceeds with registration only after email successfully passes validation', async () => {
    authService.validateEmail = jest.fn().mockResolvedValue({
      email: 'valid_user@careflow.com',
      status: 'VALID',
      is_valid: true,
      message: 'Email address looks valid.',
      allow_continue: true,
    });
    authService.register = jest.fn().mockResolvedValue({
      success: true,
      message: 'Verification email sending initiated. Please check your inbox.',
      email: 'valid_user@careflow.com',
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/name@example\.com/i);
    const registerBtn = screen.getByRole('button', { name: /Continue to email verification/i });

    fireEvent.change(screen.getByPlaceholderText('Eleanor'), { target: { value: 'Eleanor' } });
    fireEvent.change(screen.getByPlaceholderText('Vance'), { target: { value: 'Vance' } });
    fireEvent.change(screen.getByPlaceholderText('+1 (555) 019-2834'), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1995-05-20' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'FEMALE' } });
    fireEvent.change(emailInput, { target: { value: 'valid_user@careflow.com' } });
    fireEvent.change(screen.getByPlaceholderText('Create a secure password'), { target: { value: 'StrongPass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'StrongPass123!' } });

    fireEvent.click(registerBtn);

    // Both validation and registration were called in correct sequence
    await waitFor(() => {
      expect(authService.validateEmail).toHaveBeenCalledWith('valid_user@careflow.com');
      expect(authService.register).toHaveBeenCalledWith({
        firstName: 'Eleanor',
        lastName: 'Vance',
        username: '',
        email: 'valid_user@careflow.com',
        phone: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'FEMALE',
        bloodGroup: null,
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!',
      });
    });

    // Success feedback appears (both toast and informative banner)
    await waitFor(() => {
      const msgs = screen.getAllByText(/Verification email sending initiated\. Please check your inbox\./i);
      expect(msgs.length).toBeGreaterThan(0);
    });
  });

  test('Invalid random URLs redirect to LoginPage and do NOT show 404 page', async () => {
    render(
      <MemoryRouter initialEntries={['/hgsedufbeahdfvjakdhvjref']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );

    // Should NOT show 404
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Page Not Found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();

    // Should render LoginPage elements
    expect(screen.getByText('Sign in to CareFlow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Portal/i })).toBeInTheDocument();
  });

  test('Footer is completely removed from /login and /register, but present on landing page', () => {
    // 1. On /login: Footer should not exist
    const { unmount: unmountLogin } = render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText(/Hospital Management System Project/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/i)).not.toBeInTheDocument();
    unmountLogin();

    // 2. On /register: Footer should not exist
    const { unmount: unmountRegister } = render(
      <MemoryRouter initialEntries={['/register']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText(/Hospital Management System Project/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/i)).not.toBeInTheDocument();
    unmountRegister();

    // 3. On Landing Page (/): Footer MUST exist
    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getAllByText(/Hospital Management System Project/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/All rights reserved/i).length).toBeGreaterThan(0);
  });

  test('Auth pages (/login, /register) apply no-scroll layout classes', () => {
    const { container: loginContainer, unmount: unmountLogin } = render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );

    const layout = loginContainer.querySelector('.careflow-app-layout');
    expect(layout).toHaveClass('auth-layout-no-scroll');

    const main = loginContainer.querySelector('.careflow-main-content');
    expect(main).toHaveClass('auth-main-no-scroll');
    unmountLogin();

    const { container: registerContainer } = render(
      <MemoryRouter initialEntries={['/register']}>
        <ToastProvider>
          <AppContent backendConnected={true} backendChecking={false} />
        </ToastProvider>
      </MemoryRouter>
    );

    const regLayout = registerContainer.querySelector('.careflow-app-layout');
    expect(regLayout).toHaveClass('auth-layout-no-scroll');

    const regMain = registerContainer.querySelector('.careflow-main-content');
    expect(regMain).toHaveClass('auth-main-no-scroll');
  });
});
