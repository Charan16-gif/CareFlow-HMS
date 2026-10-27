import React, { useState, useId, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field touch states for inline feedback
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    phone: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const firstNameId = useId();
  const lastNameId = useId();
  const usernameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  useEffect(() => {
    document.title = 'Create Patient Account — CareFlow-HMS';
  }, []);

  // Real Password Rule Calculations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/`~]/.test(password);

  const checks = [
    { id: 'len', label: 'At least 8 characters', satisfied: hasMinLength },
    { id: 'upper', label: 'At least one uppercase letter', satisfied: hasUppercase },
    { id: 'lower', label: 'At least one lowercase letter', satisfied: hasLowercase },
    { id: 'num', label: 'At least one number', satisfied: hasNumber },
    { id: 'spec', label: 'At least one special character', satisfied: hasSpecial },
  ];

  const satisfiedCount = checks.filter((c) => c.satisfied).length;

  // Strength Evaluation
  const getStrengthData = () => {
    if (password.length === 0) {
      return { label: '', color: 'transparent', activeBars: 0 };
    }
    if (satisfiedCount <= 2) {
      return { label: 'Weak', color: '#ef4444', activeBars: satisfiedCount };
    }
    if (satisfiedCount === 3) {
      return { label: 'Fair', color: '#f59e0b', activeBars: 3 };
    }
    if (satisfiedCount === 4) {
      return { label: 'Good', color: '#14b8a6', activeBars: 4 };
    }
    return { label: 'Strong', color: '#10b981', activeBars: 5 };
  };

  const strengthData = getStrengthData();
  const isPasswordValid = satisfiedCount === 5;

  // Field Validations
  const isFirstNameValid = firstName.trim().length >= 2;
  const isLastNameValid = lastName.trim().length >= 1;
  const isUsernameValid =
    username.trim().length === 0 || /^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim());
  const isPhoneValid =
    /^[0-9+\s()-]{7,20}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isConfirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password;

  const isFormValid =
    isFirstNameValid &&
    isLastNameValid &&
    isUsernameValid &&
    isPhoneValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      username: true,
      phone: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);

    try {
      const response = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });

      setSubmissionStatus({
        type: 'success',
        message: 'Account registered! Verification code dispatched to your email. Redirecting...',
      });
      toast.success(
        `Verification code sent to ${email.trim()}. Please verify your account.`,
        'Account Registered'
      );

      setTimeout(() => {
        navigate('/verify-email', {
          state: {
            email: email.trim(),
            message: response.message,
          },
        });
      }, 1000);
    } catch (err) {
      let errorMsg = 'Registration failed. Please check your details and try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.username) {
          errorMsg = Array.isArray(err.response.data.username)
            ? err.response.data.username[0]
            : err.response.data.username;
        } else if (err.response.data.email) {
          errorMsg = Array.isArray(err.response.data.email)
            ? err.response.data.email[0]
            : err.response.data.email;
        } else if (err.response.data.password) {
          errorMsg = Array.isArray(err.response.data.password)
            ? err.response.data.password[0]
            : err.response.data.password;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMsg = err.response.data.non_field_errors[0];
        }
      } else if (err.message && err.message.includes('Network Error')) {
        errorMsg = 'Cannot reach the CareFlow authentication server. Please ensure backend is running.';
      }

      toast.error(errorMsg, 'Registration Failed');
      setSubmissionStatus({
        type: 'error',
        message: errorMsg,
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
        {/* ─────────────────────────────────────────────────────────────
            Left Side: Healthcare Visual Experience (52% width)
        ───────────────────────────────────────────────────────────── */}
        <section className="register-visual-column" aria-label="CareFlow Healthcare Overview">
          {/* High quality doctor photo asset blended into dark navy background */}
          <img
            src={doctorImage}
            alt="Compassionate healthcare doctor in modern CareFlow hospital"
            className="register-doctor-img"
          />
          <div className="register-doctor-overlay" />

          {/* Upper Brand Logo strictly pinned to the top */}
          <div className="register-hero-brand">
            <Link to="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
              <Logo size="md" light={true} />
            </Link>
          </div>

          <div className="register-visual-content">
            {/* Elevated Healthcare Typography & Security Panel */}
            <div className="register-hero-body">
              <h1 className="register-hero-title">
                Your health.
                <br />
                Your care.
                <br />
                <span className="text-gradient-cyan">All connected.</span>
              </h1>

              <p className="register-hero-subtitle">
                Create your CareFlow account to get started. Manage your appointments and stay connected with your healthcare journey in one simple place.
              </p>

              {/* Translucent Glass Information Security Panel */}
              <div className="register-info-panel">
                <div className="register-info-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="register-info-title">Your information matters</h4>
                  <p className="register-info-desc">
                    Verify your email to help keep your account secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Right Side: Floating Glass Registration Card (48% width)
        ───────────────────────────────────────────────────────────── */}
        <section className="register-form-column" aria-label="Patient Registration Form">
          <div className="register-glass-card">
            {/* Step Indicator */}
            <div>
              <span className="register-step-badge">
                STEP 1 OF 2 — YOUR DETAILS
              </span>
            </div>

            {/* Header */}
            <h2 className="register-card-title">Create your account</h2>
            <p className="register-card-subtitle">
              Your journey to simpler healthcare starts here.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Row: First Name & Last Name */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={firstNameId} className="form-label">
                    First Name
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <User size={17} />
                    </span>
                    <input
                      id={firstNameId}
                      type="text"
                      className={`form-input ${
                        touched.firstName && !isFirstNameValid ? 'form-input-error' : ''
                      }`}
                      placeholder="Eleanor"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => handleBlur('firstName')}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  {touched.firstName && !isFirstNameValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>At least 2 characters.</span>
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={lastNameId} className="form-label">
                    Last Name
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <User size={17} />
                    </span>
                    <input
                      id={lastNameId}
                      type="text"
                      className={`form-input ${
                        touched.lastName && !isLastNameValid ? 'form-input-error' : ''
                      }`}
                      placeholder="Vance"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => handleBlur('lastName')}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  {touched.lastName && !isLastNameValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please enter last name.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Field: Phone Number */}
              <div className="form-group">
                <label htmlFor={phoneId} className="form-label">
                  Phone Number
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Phone size={17} />
                  </span>
                  <input
                    id={phoneId}
                    type="tel"
                    className={`form-input ${
                      touched.phone && !isPhoneValid ? 'form-input-error' : ''
                    }`}
                    placeholder="+1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    autoComplete="tel"
                    required
                  />
                </div>
                {touched.phone && !isPhoneValid && (
                  <p className="field-error-msg">
                    <AlertCircle size={13} />
                    <span>Please enter a valid phone number (minimum 7 digits).</span>
                  </p>
                )}
              </div>

              {/* Field: Username */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor={usernameId} className="form-label">
                    Username <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>(Optional - or uses email)</span>
                  </label>
                </div>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <User size={17} />
                  </span>
                  <input
                    id={usernameId}
                    type="text"
                    className={`form-input ${
                      touched.username && !isUsernameValid ? 'form-input-error' : ''
                    }`}
                    placeholder="e.g. eleanor_vance (optional)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => handleBlur('username')}
                    autoComplete="username"
                  />
                </div>
                {touched.username && !isUsernameValid && (
                  <p className="field-error-msg">
                    <AlertCircle size={13} />
                    <span>Username must be 3-30 characters (letters, numbers, underscores, dots, hyphens).</span>
                  </p>
                )}
              </div>

              {/* Field: Email Address */}
              <div className="form-group">
                <label htmlFor={emailId} className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Mail size={17} />
                  </span>
                  <input
                    id={emailId}
                    type="email"
                    className={`form-input ${
                      touched.email && !isEmailValid ? 'form-input-error' : ''
                    }`}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                    required
                  />
                </div>
                {touched.email && !isEmailValid && (
                  <p className="field-error-msg">
                    <AlertCircle size={13} />
                    <span>Please enter a valid email address.</span>
                  </p>
                )}
              </div>

              {/* Field: Password */}
              <div className="form-group">
                <label htmlFor={passwordId} className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${
                      touched.password && !isPasswordValid ? 'form-input-error' : ''
                    }`}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Working Real Password Strength Indicator */}
                <div className="password-strength-container">
                  <div className="strength-meter-header">
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Password Strength
                    </span>
                    {strengthData.label && (
                      <span
                        className="strength-label-text"
                        style={{ color: strengthData.color }}
                      >
                        {strengthData.label}
                      </span>
                    )}
                  </div>

                  {/* 5-segment meter bar */}
                  <div className="strength-bars-track">
                    {[1, 2, 3, 4, 5].map((index) => (
                      <div
                        key={index}
                        className="strength-bar-segment"
                        style={{
                          backgroundColor:
                            index <= strengthData.activeBars
                              ? strengthData.color
                              : 'rgba(255, 255, 255, 0.12)',
                        }}
                      />
                    ))}
                  </div>

                  {/* 5 individual rule check indicators */}
                  <div className="req-checklist">
                    {checks.map((rule) => (
                      <div
                        key={rule.id}
                        className={`req-item ${rule.satisfied ? 'satisfied' : ''}`}
                      >
                        {rule.satisfied ? (
                          <CheckCircle2 size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                        ) : (
                          <Circle size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        )}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field: Confirm Password */}
              <div className="form-group">
                <label htmlFor={confirmPasswordId} className="form-label">
                  Confirm Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    id={confirmPasswordId}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input ${
                      touched.confirmPassword && !isConfirmPasswordValid
                        ? 'form-input-error'
                        : ''
                    }`}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    title={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {touched.confirmPassword && !isConfirmPasswordValid && (
                  <p className="field-error-msg">
                    <AlertCircle size={13} />
                    <span>
                      {confirmPassword.length === 0
                        ? 'Please confirm your password.'
                        : 'Passwords do not match.'}
                    </span>
                  </p>
                )}
                {confirmPassword.length > 0 && isConfirmPasswordValid && (
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#34d399',
                      marginTop: '0.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Passwords match.</span>
                  </p>
                )}
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                className="register-submit-btn"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="pulse-vital" />
                    <span>Validating Details...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to email verification</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Informative Status Banner (Honest Backend Reporting) */}
              {submissionStatus && (
                <div className="register-status-box" role="status">
                  <Info size={18} style={{ color: 'var(--primary-cyan)', flexShrink: 0 }} />
                  <div>{submissionStatus.message}</div>
                </div>
              )}

              {/* Login Link */}
              <p className="register-bottom-text">
                Already have an account?
                <Link to="/login" className="register-login-link">
                  Log in
                </Link>
              </p>

              {/* Clarification Note */}
              <p className="register-disclaimer">
                Your email will be verified before your account is created.
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
