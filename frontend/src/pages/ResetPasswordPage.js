import React, { useState, useId, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordId = useId();
  const confirmPasswordId = useId();

  useEffect(() => {
    document.title = 'Set New Password — CareFlow-HMS';
  }, []);

  // Password Complexity Rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/`~]/.test(newPassword);

  const checks = [
    { id: 'len', label: 'At least 8 characters', satisfied: hasMinLength },
    { id: 'upper', label: 'At least one uppercase letter', satisfied: hasUppercase },
    { id: 'lower', label: 'At least one lowercase letter', satisfied: hasLowercase },
    { id: 'num', label: 'At least one number', satisfied: hasNumber },
    { id: 'spec', label: 'At least one special character', satisfied: hasSpecial },
  ];

  const satisfiedCount = checks.filter((c) => c.satisfied).length;
  const isPasswordValid = satisfiedCount === 5;
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === newPassword;
  const isFormValid = isPasswordValid && isConfirmValid && uid && token;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ newPassword: true, confirmPassword: true });

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.confirmPasswordReset({
        uid,
        token,
        newPassword,
        confirmPassword,
      });

      setIsSuccess(true);
      const successMsg =
        response.message ||
        'Your password has been successfully reset! Redirecting to login...';
      toast.success(successMsg, 'Password Reset Successful');

      setTimeout(() => {
        navigate('/login', {
          state: {
            successMessage: 'Password successfully reset! Please sign in with your new password.',
          },
        });
      }, 2000);
    } catch (err) {
      let errorMessage = 'Failed to reset password. The link may have expired or is invalid.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.token) {
          errorMessage = Array.isArray(err.response.data.token)
            ? err.response.data.token[0]
            : err.response.data.token;
        } else if (err.response.data.new_password) {
          errorMessage = Array.isArray(err.response.data.new_password)
            ? err.response.data.new_password[0]
            : err.response.data.new_password;
        } else if (err.response.data.confirm_password) {
          errorMessage = Array.isArray(err.response.data.confirm_password)
            ? err.response.data.confirm_password[0]
            : err.response.data.confirm_password;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        }
      }

      toast.error(errorMessage, 'Reset Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMissingLink = !uid || !token;

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
        <section className="register-visual-column" aria-label="CareFlow Password Reset Overview">
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
                Set Your New
                <br />
                <span className="text-gradient-cyan">Password.</span>
              </h1>

              <p className="register-hero-subtitle">
                Create a strong, unique password to secure your medical records and hospital management portal.
              </p>

              <div className="register-info-panel">
                <div className="register-info-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="register-info-title">Zero-Knowledge Storage</h4>
                  <p className="register-info-desc">
                    Your password is cryptographically salted and hashed before persistence. It is never stored in plain text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Floating Glass Reset Card */}
        <section className="register-form-column" aria-label="Reset Password Form">
          <div className="register-glass-card">
            <div>
              <span className="register-step-badge">
                <KeyRound size={13} style={{ display: 'inline', marginRight: '6px' }} />
                CHOOSE NEW PASSWORD
              </span>
            </div>

            <h2 className="register-card-title">Reset your password</h2>
            <p className="register-card-subtitle">
              Please enter and confirm your new secure account password below.
            </p>

            {hasMissingLink ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    color: '#ef4444',
                    marginBottom: '1rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={20} />
                  <span>Invalid or incomplete reset link parameters.</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Please request a fresh password reset link from our recovery portal.
                </p>
                <Link
                  to="/forgot-password"
                  className="glass-btn glass-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Request New Reset Link</span>
                </Link>
              </div>
            ) : isSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 1.25rem auto',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Password Updated!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Your password has been changed successfully. You can now log in with your new credentials.
                </p>
                <Link
                  to="/login"
                  className="glass-btn glass-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Go to Sign In Now</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Field: New Password */}
                <div className="form-group">
                  <label htmlFor={passwordId} className="form-label">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Lock size={17} />
                    </span>
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input ${
                        touched.newPassword && !isPasswordValid ? 'form-input-error' : ''
                      }`}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onBlur={() => handleBlur('newPassword')}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Rule Checklist */}
                <div className="pwd-checklist" style={{ margin: '0.75rem 0 1.25rem 0' }}>
                  <div className="checklist-grid">
                    {checks.map((c) => (
                      <div
                        key={c.id}
                        className={`checklist-item ${
                          c.satisfied ? 'checklist-item-valid' : 'checklist-item-invalid'
                        }`}
                      >
                        {c.satisfied ? (
                          <CheckCircle2 size={13} className="check-icon-valid" />
                        ) : (
                          <Circle size={13} className="check-icon-invalid" />
                        )}
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field: Confirm Password */}
                <div className="form-group">
                  <label htmlFor={confirmPasswordId} className="form-label">
                    Confirm New Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Lock size={17} />
                    </span>
                    <input
                      id={confirmPasswordId}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-input ${
                        touched.confirmPassword && !isConfirmValid ? 'form-input-error' : ''
                      }`}
                      placeholder="Re-enter your new password"
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
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.confirmPassword && !isConfirmValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Passwords do not match.</span>
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
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
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

export default ResetPasswordPage;
