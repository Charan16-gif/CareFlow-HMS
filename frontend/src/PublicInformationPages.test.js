import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import { AppContent } from './App';
import { ToastProvider } from './context/ToastContext';

describe('Public Information Pages – SEO & Discoverability Suite', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });
  test('AboutPage renders H1, mission, architecture and all 7 core modules', () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/A Unified Platform for/i);
    expect(screen.getByText(/Why CareFlow Was Developed/i)).toBeInTheDocument();
    expect(screen.getByText(/Seven Core Implemented Modules/i)).toBeInTheDocument();

    // Verify 7 implemented modules are documented
    expect(screen.getByText(/1\. Patient Management/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Appointment Management/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Doctor Management/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Laboratory Management/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Pharmacy Management/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Billing Management/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. User & Role Management/i)).toBeInTheDocument();

    // Verify Bed management is NOT advertised
    expect(screen.queryByText(/Bed Management/i)).not.toBeInTheDocument();

    // Verify technical architecture
    expect(screen.getByText(/React\.js \(CRA\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Django & Django REST/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PostgreSQL/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Brevo Email API/i)).toBeInTheDocument();
  });

  test('ContactPage renders official email and handles form validation and submission', async () => {
    render(
      <BrowserRouter>
        <ContactPage />
      </BrowserRouter>
    );

    // Official email is present and verified
    expect(screen.getAllByText('careflowofficial@gmail.com').length).toBeGreaterThan(0);

    // Form inputs exist
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const subjectInput = screen.getByLabelText(/Subject/i);
    const messageInput = screen.getByLabelText(/Message Details/i);
    const submitBtn = screen.getByRole('button', { name: /Send Message/i });

    // Submit empty form triggers validation
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/Please provide your full name/i)).toBeInTheDocument();

    // Fill valid data
    fireEvent.change(nameInput, { target: { value: 'Dr. Jane Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane.smith@hospital.org' } });
    fireEvent.change(subjectInput, { target: { value: 'Inquiry regarding clinical workflows' } });
    fireEvent.change(messageInput, { target: { value: 'We would like to learn more about the CareFlow doctor and lab integration.' } });

    fireEvent.click(submitBtn);

    // Confirmation message appears
    await waitFor(() => {
      expect(screen.getByText(/Inquiry Received!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Dr\. Jane Smith/i)).toBeInTheDocument();
  });

  test('PrivacyPolicyPage renders data collection, RBAC, safeguards and verified contact', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/CareFlow Privacy Policy/i);
    expect(screen.getByText(/1\. Overview and Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Information We Collect/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Purpose of Information Processing/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Access Restrictions & Role-Based Security/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Data Protection & Technical Safeguards/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Patient and User Rights/i)).toBeInTheDocument();
    expect(screen.getAllByText('careflowofficial@gmail.com').length).toBeGreaterThan(0);
  });

  test('TermsPage renders clinical disclaimer, acceptable use, and authorized access', () => {
    render(
      <BrowserRouter>
        <TermsPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/CareFlow Terms and Conditions/i);
    expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Clinical & Medical Disclaimer/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Authorized Access & Account Security/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Acceptable Use Policy/i)).toBeInTheDocument();
    expect(screen.getAllByText('careflowofficial@gmail.com').length).toBeGreaterThan(0);
  });

  test('AppContent router routes correctly to public informational pages with Navbar and Footer', () => {
    const routes = ['/about', '/contact', '/privacy', '/terms'];

    routes.forEach((route) => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <AppContent backendConnected={true} backendChecking={false} />
          </ToastProvider>
        </MemoryRouter>
      );

      // CareFlow navbar brand is present on public pages
      expect(screen.getByRole('navigation', { name: /Desktop Navigation/i })).toBeInTheDocument();
      // CareFlow footer is present on public pages
      expect(screen.getAllByText(/Hospital Management System Project/i).length).toBeGreaterThan(0);

      unmount();
    });
  });
});
