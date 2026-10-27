import React, { useState, useId, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const emailId = useId();

  useEffect(() => {
    document.title = 'Forgot Password — CareFlow-HMS';
  }, []);

  const isEmailValid = email.trim().length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    if (!isEmailValid) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await authService.requestPasswordReset(email.trim());
      const successMessage =
        response.message ||
        `A password reset link has been dispatched to ${email.trim()}. Please check your email inbox to reset your password.`;
      setStatus({
        type: 'success',
        message: successMessage,
      });
      toast.success(successMessage, 'Reset Link Dispatched');
    } catch (err) {
      let errorMessage = 'Unable to send password reset link. Please check the email/username and try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.email) {
          errorMessage = Array.isArray(err.response.data.email)
            ? err.response.data.email[0]
            : err.response.data.email;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMessage = err.response.data.non_field_errors[0];
        }
      } else if (err.message && err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to CareFlow authentication server. Please ensure the backend is running.';
      }

      toast.error(errorMessage, 'Reset Request Failed');
      setStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      {/* Decorative Glowing Ambient Lights */}
      <div className="register-floating-orb register-orb-1" />
      <div className="register-floating-orb register-orb-2" />

      {/* Faint Medical ECG Line Background Waveform */}
      <svg
        className="register-bg-ecg"
        viewBox="0 0 1200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M0 60 H300 L320 20 L335 105 L350 45 L365 75 L380 60 H650 L670 15 L685 110 L700 40 L715 80 L730 60 H1000 L1020 25 L1035 100 L1050 48 L1065 72 L1080 60 H1200"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="register-grid">
        {/* Left Side: Healthcare Visual Experience */}
        <section className="register-visual-column" aria-label="CareFlow Account Recovery">
          <img
            src={doctorImage}
            alt="Compassionate healthcare doctor in modern CareFlow hospital"
            className="register-doctor-img"
          />
          <div className="register-doctor-overlay" />

          {/* Upper Brand Logo */}
          <div className="register-hero-brand">
            <Link to="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
              <Logo size="md" light={true} />
            </Link>
          </div>

          {/* Healthcare Recovery Typography */}
          <div className="register-visual-content">
            <div className="register-hero-body">
              <h1 className="register-hero-title">
                Secure Account
                <br />
                <span className="text-gradient-cyan">Recovery.</span>
              </h1>

              <p className="register-hero-subtitle">
                Restoring access to your medical records, clinical notes, and healthcare portal is quick and securely verified.
              </p>

              {/* Translucent Glass Information Security Panel */}
              <div className="register-info-panel">
                <div className="register-info-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="register-info-title">Encrypted Recovery Dispatch</h4>
                  <p className="register-info-desc">
                    One-time cryptographically hashed links with automatic expiration safeguard your medical privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Floating Glass Form Card */}
        <section className="register-form-column" aria-label="Password Reset Request Form">
          <div className="register-glass-card">
            {/* Step / Purpose Badge */}
            <div>
              <span className="register-step-badge">
                <KeyRound size={13} style={{ display: 'inline', marginRight: '6px' }} />
                ACCOUNT RECOVERY
              </span>
            </div>

            {/* Header */}
            <h2 className="register-card-title">Forgot your password?</h2>
            <p className="register-card-subtitle">
              Enter your registered email address or username and we'll send you a secure link to reset your credentials.
            </p>

            {status?.type === 'success' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <Link
                  to="/login"
                  className="glass-btn glass-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                >
                  <ArrowLeft size={16} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Email / Username Input */}
                <div className="form-group">
                  <label htmlFor={emailId} className="form-label">
                    Registered Email or Username
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Mail size={17} />
                    </span>
                    <input
                      id={emailId}
                      type="text"
                      className={`form-input ${
                        touched && !isEmailValid ? 'form-input-error' : ''
                      }`}
                      placeholder="e.g. name@example.com or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                  {touched && !isEmailValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please enter your registered email address or username.</span>
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`register-submit-btn ${
                    isSubmitting ? 'register-submit-btn-disabled' : ''
                  }`}
                  style={{ marginTop: '1.25rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="spinner-icon" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                {/* Back to Login */}
                <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
                  <Link
                    to="/login"
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    <ArrowLeft size={15} />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
