import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import {
  Mail,
  ShieldCheck,
  ArrowRight,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Edit3,
  HelpCircle,
  Server,
} from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const EmailVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve initial email from router state or search query param
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = location.state?.email || queryParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [tempEmail, setTempEmail] = useState(initialEmail);

  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);

  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'warning', message: string }
  const [emailConfig, setEmailConfig] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = 'Verify Email OTP — CareFlow-HMS';
  }, []);

  // Fetch backend SMTP status to assist developer/user
  useEffect(() => {
    let isMounted = true;
    authService
      .getEmailStatus()
      .then((data) => {
        if (isMounted) {
          setEmailConfig(data);
          if (!data.is_configured) {
            setFeedback({
              type: 'warning',
              message:
                'SMTP email credentials are not yet configured in backend/.env. Enter your email & app password to receive real emails.',
            });
          }
        }
      })
      .catch(() => {
        // Silent fallback if health check not reachable
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Resend Countdown Timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }

    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Focus the first input box upon initial mount
  useEffect(() => {
    if (!isEditingEmail && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isEditingEmail]);

  // Handle individual digit input
  const handleDigitChange = (index, value) => {
    // Only accept numeric inputs
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...otpDigits];
    const lastChar = cleanVal.slice(-1);
    newDigits[index] = lastChar;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (lastChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-trigger verification if all digits entered
    if (lastChar && index === OTP_LENGTH - 1 && newDigits.every((d) => d !== '')) {
      const fullOtp = newDigits.join('');
      executeVerification(fullOtp);
    }
  };

  // Handle KeyDown (Backspace & Left/Right navigation)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Clipboard Paste for whole 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const cleanNumbers = pastedData.replace(/\D/g, '').slice(0, OTP_LENGTH);

    if (cleanNumbers.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < OTP_LENGTH; i++) {
        newDigits[i] = cleanNumbers[i] || '';
      }
      setOtpDigits(newDigits);

      // Focus appropriate input
      const focusIndex = Math.min(cleanNumbers.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();

      // If full 6 digits pasted, trigger verify
      if (cleanNumbers.length === OTP_LENGTH) {
        executeVerification(cleanNumbers);
      }
    }
  };

  // Execute OTP Verification
  const executeVerification = async (codeToVerify) => {
    const otpCode = codeToVerify || otpDigits.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setFeedback({
        type: 'error',
        message: `Please enter all ${OTP_LENGTH} digits of your verification code.`,
      });
      return;
    }

    if (!email.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please provide a valid email address to verify.',
      });
      setIsEditingEmail(true);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await authService.verifyOtp({
        email: email.trim(),
        otpCode,
        purpose: 'registration',
      });

      setFeedback({
        type: 'success',
        message: response.message || 'Email verified successfully! Welcome to CareFlow.',
      });
      toast.success('Email verified successfully! Welcome to CareFlow.', 'Account Verified');

      // Redirect to login page upon successful verification
      setTimeout(() => {
        navigate('/login', {
          state: {
            successMessage: 'Email verified successfully! Please sign in with your credentials.',
          },
        });
      }, 1500);
    } catch (err) {
      let errorMsg = 'Verification failed. Please check the code and try again.';
      if (err.response?.data) {
        if (typeof err.response.data.otp_code === 'string') {
          errorMsg = err.response.data.otp_code;
        } else if (Array.isArray(err.response.data.otp_code)) {
          errorMsg = err.response.data.otp_code[0];
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.message && err.message.includes('Network Error')) {
        errorMsg = 'Cannot reach the CareFlow backend. Ensure server is active on port 8000.';
      }

      toast.error(errorMsg, 'Verification Failed');
      setFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isResending) return;

    if (!email.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid email address first.',
      });
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setFeedback(null);

    try {
      const response = await authService.resendOtp({
        email: email.trim(),
        purpose: 'registration',
      });

      setFeedback({
        type: 'success',
        message: response.message || 'A new verification code has been dispatched to your email.',
      });
      toast.info(`A new 6-digit OTP code has been dispatched to ${email.trim()}`, 'Code Dispatched');

      // Clear input fields and reset cooldown
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimer(RESEND_COOLDOWN);
      inputRefs.current[0]?.focus();
    } catch (err) {
      let errorMsg = 'Failed to resend code. Please try again shortly.';
      if (err.response?.data) {
        if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response.data.email) {
          errorMsg = Array.isArray(err.response.data.email)
            ? err.response.data.email[0]
            : err.response.data.email;
        }
      }
      toast.error(errorMsg, 'Resend Failed');

      setFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Save modified email
  const handleSaveEmail = (e) => {
    e.preventDefault();
    if (!tempEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tempEmail.trim())) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid email address.',
      });
      return;
    }
    setEmail(tempEmail.trim());
    setIsEditingEmail(false);
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setTimer(0); // Allow immediate resend for new email
  };

  return (
    <div className="register-page-wrapper">
      {/* Decorative Glowing Ambient Lights */}
      <div className="register-floating-orb register-orb-1" />
      <div className="register-floating-orb register-orb-2" />

      {/* Medical ECG Waveform Background */}
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
        {/* ─────────────────────────────────────────────────────────────
            Left Side: Healthcare Security Showcase (50% width)
        ───────────────────────────────────────────────────────────── */}
        <section className="register-visual-column" aria-label="CareFlow Account Verification">
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

          <div className="register-visual-content">
            <div className="register-hero-body">
              <h1 className="register-hero-title">
                Verify your email.
                <br />
                Protect your records.
                <br />
                <span className="text-gradient-cyan">Stay connected.</span>
              </h1>

              <p className="register-hero-subtitle">
                Two-factor email verification ensures only you have access to your clinical records, test diagnostics, prescription history, and private physician communication.
              </p>

              {/* Security Shield Card */}
              <div className="register-info-panel">
                <div className="register-info-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="register-info-title">Zero-Trust Healthcare Security</h4>
                  <p className="register-info-desc">
                    Time-bound 6-digit cryptographic verification codes protect sensitive patient health information (PHI).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Right Side: Glass OTP Verification Card (50% width)
        ───────────────────────────────────────────────────────────── */}
        <section className="register-form-column" aria-label="Email Verification Code Form">
          <div className="register-glass-card">
            {/* Step Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="register-step-badge">
                STEP 2 OF 2 &bull; EMAIL VERIFICATION
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={13} /> Code valid 10m
              </span>
            </div>

            <h2 className="register-card-title">Enter Verification Code</h2>
            <p className="register-card-subtitle" style={{ marginBottom: '0.75rem' }}>
              We sent a real 6-digit OTP verification code to your email address.
            </p>

            {/* Email Address Indicator / Editor */}
            {isEditingEmail ? (
              <form onSubmit={handleSaveEmail} style={{ marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label">Email to Verify</label>
                  <div className="input-field-wrapper">
                    <span className="input-icon-box">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      className="form-input"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="glass-btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                  >
                    Confirm Email
                  </button>
                  {email && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      className="glass-btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="otp-email-chip">
                <Mail size={16} color="#38bdf8" />
                <span className="otp-email-text" title={email}>
                  {email}
                </span>
                <button
                  type="button"
                  className="otp-email-edit-btn"
                  onClick={() => {
                    setTempEmail(email);
                    setIsEditingEmail(true);
                  }}
                  title="Change destination email"
                >
                  <Edit3 size={13} /> Change
                </button>
              </div>
            )}

            {/* Feedback Alert Banners */}
            {feedback && (
              <div
                className={`status-alert ${
                  feedback.type === 'error'
                    ? 'status-alert-error'
                    : feedback.type === 'warning'
                    ? 'status-alert-warning'
                    : 'status-alert-success'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle size={16} className="status-alert-icon" />
                ) : feedback.type === 'warning' ? (
                  <Server size={16} className="status-alert-icon" />
                ) : (
                  <CheckCircle2 size={16} className="status-alert-icon" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* 6 Individual Digit Boxes */}
            <div className="otp-input-group" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className={`otp-digit-input ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            {/* Resend Cooldown Row */}
            <div className="otp-resend-container">
              <div className="otp-resend-info">
                <Clock size={15} />
                {canResend ? (
                  <span>Code not received?</span>
                ) : (
                  <span>
                    Resend available in{' '}
                    <span className="otp-timer-highlight">{timer}s</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResendOtp}
                disabled={!canResend || isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 size={14} className="spin-vital" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    Resend Code
                  </>
                )}
              </button>
            </div>

            {/* Primary Verification Action Button */}
            <button
              type="button"
              className="register-submit-btn"
              onClick={() => executeVerification()}
              disabled={isSubmitting || otpDigits.some((d) => !d)}
              style={{
                opacity: isSubmitting || otpDigits.some((d) => !d) ? 0.7 : 1,
                cursor:
                  isSubmitting || otpDigits.some((d) => !d) ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin-vital" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Activate Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Footer Navigation */}
            <div className="register-footer-prompt" style={{ marginTop: '1.25rem' }}>
              <span>Need help or need to re-register? </span>
              <Link to="/register" className="register-signin-link">
                Back to Registration
              </Link>
            </div>

            {/* Quick Diagnostic / Help Info */}
            {emailConfig && !emailConfig.is_configured && (
              <div className="otp-diag-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <HelpCircle size={15} color="#f59e0b" />
                  <strong style={{ color: '#f59e0b' }}>SMTP Email Configuration Note</strong>
                </div>
                To send emails from your personal email (Gmail or Outlook), update your{' '}
                <code style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '4px' }}>
                  backend/.env
                </code>{' '}
                with your <code style={{ color: '#38bdf8' }}>EMAIL_HOST_USER</code> and App Password.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
