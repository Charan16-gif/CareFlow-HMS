import React, { useState, useId, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  HeartPulse,
  Stethoscope,
  UserCheck,
  FlaskConical,
  Pill,
} from 'lucide-react';

const ROLES = [
  { id: 'PATIENT', label: 'Patient', icon: HeartPulse },
  { id: 'DOCTOR', label: 'Doctor', icon: Stethoscope },
  { id: 'RECEPTIONIST', label: 'Receptionist', icon: UserCheck },
  { id: 'PHARMACIST', label: 'Pharmacist', icon: Pill },
  { id: 'LAB_STAFF', label: 'Lab Staff', icon: FlaskConical },
  { id: 'ADMIN', label: 'Admin', icon: ShieldCheck },
];

const LoginPage = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState('PATIENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState({
    username: false,
    password: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameId = useId();
  const passwordId = useId();
  const rememberId = useId();

  useEffect(() => {
    document.title = 'Sign In to Patient & Staff Portal — CareFlow-HMS';
    if (location.state?.successMessage) {
      toast.success(location.state.successMessage, 'Sign In Notification');
    }
  }, [location.state]);

  const isUsernameValid = username.trim().length >= 2;
  const isPasswordValid = password.length >= 1;
  const isFormValid = isUsernameValid && isPasswordValid;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      username: true,
      password: true,
    });

    if (!username.trim() || !password) {
      toast.error('Please enter your required login details.', 'Missing Information');
      return;
    }

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authResult = await authService.login(username.trim(), password, selectedRole);

      toast.success('Welcome back! You have signed in successfully.', 'Sign In Successful');

      const verifiedRole = authResult?.user?.role || authService.getUserRole();
      if (verifiedRole === 'ADMIN' || authService.isAdmin()) {
        navigate('/admin');
      } else if (verifiedRole === 'PATIENT') {
        navigate('/patient');
      } else if (verifiedRole === 'DOCTOR') {
        navigate('/doctor');
      } else if (verifiedRole === 'LAB_STAFF') {
        navigate('/lab-staff');
      } else if (verifiedRole === 'RECEPTIONIST') {
        navigate('/receptionist');
      } else if (verifiedRole === 'PHARMACIST') {
        navigate('/pharmacist');
      } else {
        navigate('/');
      }
    } catch (err) {
      let errorMessage = 'Unable to sign in. Please check your credentials and try again.';
      let errorTitle = 'Sign In Failed';

      if (err.response && err.response.data) {
        const data = err.response.data;
        const code = data.code;
        const detail = Array.isArray(data.detail)
          ? data.detail[0]
          : data.detail || (data.non_field_errors && data.non_field_errors[0]) || '';

        if (code === 'incorrect_password' || (typeof detail === 'string' && detail.toLowerCase().includes('incorrect password'))) {
          errorMessage = 'Incorrect password. Please try again.';
          errorTitle = 'Password Error';
        } else if (code === 'role_mismatch' || (typeof detail === 'string' && detail.toLowerCase().includes('wrong role'))) {
          errorMessage = 'Wrong role selected. Please select the correct role.';
          errorTitle = 'Role Mismatch';
        } else if (code === 'unregistered_account' || (typeof detail === 'string' && detail.toLowerCase().includes('no account found'))) {
          errorMessage = 'No account found with these details.';
          errorTitle = 'Account Not Found';
        } else if (code === 'unverified_email' || (typeof detail === 'string' && detail.toLowerCase().includes('verify your email'))) {
          errorMessage = 'Please verify your email before logging in.';
          errorTitle = 'Unverified Email';
        } else if (detail) {
          errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail);
        }
      } else if (err.message && (err.message.includes('Network Error') || err.message.includes('connect'))) {
        errorMessage = 'Unable to connect to the server. Please try again.';
        errorTitle = 'Connection Error';
      }

      toast.error(errorMessage, errorTitle);
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
            Left Side: Healthcare Visual Experience (50% width)
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

          {/* Elevated Healthcare Typography & Security Panel in middle */}
          <div className="register-visual-content">
            <div className="register-hero-body">
              <h1 className="register-hero-title">
                Welcome back.
                <br />
                Your care.
                <br />
                <span className="text-gradient-cyan">All connected.</span>
              </h1>

              <p className="register-hero-subtitle">
                Access your medical records, upcoming appointments, prescriptions, and communicate directly with your care team in one secure place.
              </p>

              {/* Translucent Glass Information Security Panel */}
              <div className="register-info-panel">
                <div className="register-info-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="register-info-title">Enterprise-Grade Protection</h4>
                  <p className="register-info-desc">
                    HIPAA compliant, end-to-end encrypted session with biometric & token validation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Right Side: Floating Glass Login Card (50% width)
        ───────────────────────────────────────────────────────────── */}
        <section className="register-form-column" aria-label="Patient & Staff Login Form">
          <div className="register-glass-card">
            {/* Portal Badge */}
            <div>
              <span className="register-step-badge">
                SECURE PORTAL ACCESS
              </span>
            </div>

            {/* Header */}
            <h2 className="register-card-title">Sign in to CareFlow</h2>
            <p className="register-card-subtitle">
              Welcome back! Please enter your details to continue.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Professional Role Selector */}
              <div className="login-role-selector-wrap">
                <div className="login-role-selector-label">
                  <span className="login-role-title">Sign In As</span>
                  <span className="login-role-subtitle">Select Portal Role</span>
                </div>
                <div className="login-role-grid" role="radiogroup" aria-label="Select Portal Role">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`login-role-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedRole(r.id)}
                      >
                        <Icon size={17} className="role-icon" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Username / Email */}
              <div className="form-group">
                <label htmlFor={usernameId} className="form-label">
                  Username or Email
                </label>
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
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => handleBlur('username')}
                    autoComplete="username"
                    required
                  />
                </div>
                {touched.username && !isUsernameValid && (
                  <p className="field-error-msg">Please enter your username or email</p>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor={passwordId} className="form-label" style={{ marginBottom: '0.3rem' }}>
                    Password
                  </label>
                </div>
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    autoComplete="current-password"
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
                {touched.password && !isPasswordValid && (
                  <p className="field-error-msg">Please enter your password</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="login-options-row">
                <label htmlFor={rememberId} className="login-remember-label">
                  <input
                    id={rememberId}
                    type="checkbox"
                    className="login-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this device</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="login-forgot-link"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="register-submit-btn"
                disabled={isSubmitting}
                style={{ marginTop: '0.75rem' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spinner-icon" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Navigation */}
            <p className="register-login-prompt">
              Don&apos;t have an account yet?
              <Link to="/register" className="register-login-link">
                Register as Patient
              </Link>
            </p>

            <p className="register-disclaimer">
              CareFlow-HMS ensures HIPAA-compliant data security and encrypted patient record management.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
