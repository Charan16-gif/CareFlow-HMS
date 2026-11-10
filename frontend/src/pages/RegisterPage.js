import React, { useState, useId, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import doctorImage from '../assets/doctor-hospital.webp';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';
import { useRealtimeEmailValidation } from '../hooks/useRealtimeEmailValidation';
import { RealtimeEmailValidationMessage } from '../components/common/RealtimeEmailValidationMessage';
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
  ArrowLeft,
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
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time email validation hook with debounced checking
  const emailValidation = useRealtimeEmailValidation(email, {
    debounceMs: 500,
    enabled: true,
    checkMailbox: true,
    showToastOnError: false,
  });

  // Field touch states for inline feedback
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    phone: false,
    dateOfBirth: false,
    gender: false,
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
  const dateOfBirthId = useId();
  const genderId = useId();
  const bloodGroupId = useId();
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
  const isDateOfBirthValid = Boolean(dateOfBirth && dateOfBirth <= new Date().toISOString().split('T')[0]);
  const isGenderValid = Boolean(gender && ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(gender));
  const isConfirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password;

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
      dateOfBirth: true,
      gender: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const cleanEmail = email.trim();

    // 1. Mandatory Email Presence and Format Validation (Immediate Client-side Stop)
    if (!cleanEmail) {
      toast.error('Please enter a valid email address.', 'Invalid Email');
      return;
    }

    const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!EMAIL_FORMAT_REGEX.test(cleanEmail.toLowerCase())) {
      toast.error('Please enter a valid email address.', 'Invalid Email');
      return;
    }

    const parts = cleanEmail.split('@');
    if (parts.length !== 2 || !parts[1] || !parts[1].includes('.') || parts[1].startsWith('.') || parts[1].endsWith('.')) {
      toast.error('Please enter a valid email address.', 'Invalid Email');
      return;
    }

    // 2. Validate Other Required Form Fields
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password || !confirmPassword) {
      toast.error('Please enter all required registration details.', 'Missing Information');
      return;
    }

    if (!dateOfBirth) {
      toast.error('Please enter your date of birth.', 'Missing Information');
      return;
    }

    if (!isDateOfBirthValid) {
      toast.error('Date of birth cannot be in the future.', 'Invalid Date');
      return;
    }

    if (!gender) {
      toast.error('Please select your gender.', 'Missing Information');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please ensure your password satisfies all security requirements.', 'Password Error');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.', 'Password Error');
      return;
    }

    // Lock submission to prevent duplicate concurrent clicks while validating & registering
    setIsSubmitting(true);
    setSubmissionStatus(null);

    // 3. Await Asynchronous Email Verification BEFORE calling registration API
    try {
      const valResult = await authService.validateEmail(cleanEmail);

      // Check deliverability, domain existence, mailbox, disposable, typo, and service availability
      const isInvalid = valResult.is_valid === false;
      const cannotContinue = valResult.allow_continue === false;

      // If allow_continue is true, permit registration to continue.
      // If syntax, domain and MX validation pass, do not classify the email as invalid merely because mailbox verification is unavailable.
      if (cannotContinue || isInvalid) {
        let errorMsg = 'Please enter a valid email address.';
        let errorTitle = 'Invalid Email';

        if (valResult.details?.syntax === false) {
          errorMsg = 'Please enter a valid email address.';
          errorTitle = 'Invalid Email';
        } else if (valResult.details?.disposable === true || valResult.status === 'DISPOSABLE') {
          errorMsg = valResult.message || 'Temporary email addresses are not allowed.';
          errorTitle = 'Disposable Email';
        } else if (valResult.status === 'POSSIBLE_TYPO') {
          errorMsg = valResult.suggested_email
            ? `Did you mean ${valResult.suggested_email}?`
            : (valResult.message || 'Please check your email domain spelling.');
          errorTitle = 'Email Typo';
        } else if (valResult.status === 'MAILBOX_NOT_FOUND') {
          errorMsg = valResult.message || 'This email address does not exist.';
          errorTitle = 'Mailbox Not Found';
        } else if (valResult.status === 'INVALID_DOMAIN') {
          errorMsg = valResult.message || 'This email domain cannot receive emails.';
          errorTitle = 'Invalid Domain';
        } else if (valResult.status === 'UNKNOWN') {
          errorMsg = valResult.message || 'Email verification is temporarily unavailable. Please try again later.';
          errorTitle = 'Verification Notice';
        } else if (valResult.message) {
          errorMsg = valResult.message;
        }

        toast.error(errorMsg, errorTitle);
        setIsSubmitting(false);
        // STRICTLY STOP: DO NOT PROCEED TO REGISTER, DO NOT CREATE USER, DO NOT SEND OTP, DO NOT NAVIGATE!
        return;
      }
    } catch (valErr) {
      let valErrMsg = 'Unable to verify email address. Please try again.';
      let valErrTitle = 'Validation Error';

      if (valErr.response?.data?.email) {
        const rawErr = Array.isArray(valErr.response.data.email)
          ? valErr.response.data.email[0]
          : valErr.response.data.email;
        const lowerRawErr = String(rawErr || '').toLowerCase();
        if (lowerRawErr.includes('already registered')) {
          valErrMsg = rawErr;
          valErrTitle = 'Already Registered';
        } else if (lowerRawErr.includes('temporarily unavailable') || lowerRawErr.includes('try again later')) {
          valErrMsg = 'Email verification is temporarily unavailable. Please try again later.';
          valErrTitle = 'Service Unavailable';
        } else {
          valErrMsg = rawErr;
          valErrTitle = 'Invalid Email';
        }
      } else if (valErr.message && (valErr.message.includes('Network Error') || valErr.message.includes('connect') || valErr.message.includes('timeout'))) {
        valErrMsg = 'Unable to connect to email verification service. Please check your internet connection.';
        valErrTitle = 'Network Error';
      } else if (valErr.response?.status >= 500) {
        valErrMsg = 'Email verification is temporarily unavailable. Please try again later.';
        valErrTitle = 'Service Unavailable';
      }

      toast.error(valErrMsg, valErrTitle);
      setIsSubmitting(false);
      // STRICTLY STOP: DO NOT PROCEED TO REGISTER!
      return;
    }

    // 4. Proceed to Registration API ONLY AFTER Email Passes Validation
    try {
      const response = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        dateOfBirth: dateOfBirth,
        gender: gender,
        bloodGroup: bloodGroup || null,
        password,
        confirmPassword,
      });

      const successMsg = response.message || 'Verification email sending initiated. Please check your inbox.';
      setSubmissionStatus({
        type: 'success',
        message: successMsg,
      });
      toast.success(successMsg, 'Account Registered');

      setTimeout(() => {
        navigate('/verify-email', {
          state: {
            email: cleanEmail,
            message: successMsg,
          },
        });
      }, 1000);
    } catch (err) {
      let errorMsg = 'Registration failed. Please check your details and try again.';
      let errorTitle = 'Registration Error';

      if (err.response?.data) {
        if (err.response.data.email) {
          const rawEmail = Array.isArray(err.response.data.email)
            ? err.response.data.email[0]
            : err.response.data.email;
          const lowerEmailErr = String(rawEmail || '').toLowerCase();

          if (lowerEmailErr.includes('already registered')) {
            errorMsg = rawEmail;
            errorTitle = 'Already Registered';
          } else if (
            lowerEmailErr.includes('testing emails') ||
            lowerEmailErr.includes('resend.com') ||
            lowerEmailErr.includes('brevo.com') ||
            lowerEmailErr.includes('brevo') ||
            lowerEmailErr.includes('only send testing') ||
            lowerEmailErr.includes('verify a domain') ||
            lowerEmailErr.includes('sender email is not valid') ||
            lowerEmailErr.includes('sender domain') ||
            lowerEmailErr.includes('not authorized') ||
            lowerEmailErr.includes('recipient restriction')
          ) {
            errorMsg = rawEmail;
            errorTitle = 'Email Delivery Restricted';
          } else if (lowerEmailErr.includes('temporarily unavailable') || lowerEmailErr.includes('try again later')) {
            errorMsg = 'Email verification is temporarily unavailable. Please try again later.';
            errorTitle = 'Service Unavailable';
          } else if (lowerEmailErr.includes('temporary email') || lowerEmailErr.includes('disposable')) {
            errorMsg = rawEmail;
            errorTitle = 'Disposable Email';
          } else {
            errorMsg = rawEmail;
            errorTitle = 'Invalid Email';
          }
        } else if (err.response.data.username) {
          errorMsg = Array.isArray(err.response.data.username)
            ? err.response.data.username[0]
            : err.response.data.username;
          errorTitle = 'Invalid Username';
        } else if (err.response.data.password) {
          errorMsg = Array.isArray(err.response.data.password)
            ? err.response.data.password[0]
            : err.response.data.password;
          errorTitle = 'Invalid Password';
        } else if (err.response.data.non_field_errors) {
          errorMsg = Array.isArray(err.response.data.non_field_errors)
            ? err.response.data.non_field_errors[0]
            : err.response.data.non_field_errors;
        } else if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        }
      } else if (err.message && (err.message.includes('Network Error') || err.message.includes('connect') || err.message.includes('timeout'))) {
        errorMsg = 'Unable to connect to the server. Please check your internet connection.';
        errorTitle = 'Connection Error';
      }

      toast.error(errorMsg, errorTitle);
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
            {/* Top Navigation Row: Back to Home & Step Indicator */}
            <div className="login-top-nav-bar">
              <Link to="/" className="back-to-home-btn" aria-label="Back to CareFlow Home">
                <ArrowLeft size={16} />
                <span>Back to Home</span>
              </Link>
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

              {/* Row: Phone Number & Blood Group */}
              <div className="form-row">
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
                      <span>Please enter a valid phone number.</span>
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={bloodGroupId} className="form-label">
                    Blood Group <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <div className="input-wrapper">
                    <select
                      id={bloodGroupId}
                      className="form-input"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      style={{ paddingLeft: '1rem', cursor: 'pointer' }}
                    >
                      <option value="">-- Select Blood Group (Optional) --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row: Date of Birth & Gender */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={dateOfBirthId} className="form-label">
                    Date of Birth
                  </label>
                  <div className="input-wrapper">
                    <input
                      id={dateOfBirthId}
                      type="date"
                      className={`form-input ${
                        touched.dateOfBirth && !isDateOfBirthValid ? 'form-input-error' : ''
                      }`}
                      value={dateOfBirth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      onBlur={() => handleBlur('dateOfBirth')}
                      required
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>
                  {touched.dateOfBirth && !isDateOfBirthValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please enter a valid date of birth.</span>
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={genderId} className="form-label">
                    Gender
                  </label>
                  <div className="input-wrapper">
                    <select
                      id={genderId}
                      className={`form-input ${
                        touched.gender && !isGenderValid ? 'form-input-error' : ''
                      }`}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      onBlur={() => handleBlur('gender')}
                      required
                      style={{ paddingLeft: '1rem', cursor: 'pointer' }}
                    >
                      <option value="">-- Select Gender --</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                  {touched.gender && !isGenderValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please select your gender.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Row: Username & Email Address */}
              <div className="form-row">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor={usernameId} className="form-label">
                      Username <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>(Optional)</span>
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
                      <span>Username must be 3-30 characters.</span>
                    </p>
                  )}
                </div>

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
                        touched.email && email.trim() && (emailValidation.isInvalid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                          ? 'form-input-error'
                          : ''
                      }`}
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => {
                        handleBlur('email');
                        emailValidation.validateImmediately();
                      }}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <RealtimeEmailValidationMessage
                    validation={emailValidation}
                    onApplySuggestion={(sug) => setEmail(sug)}
                    onRetry={() => emailValidation.retry()}
                  />
                  {touched.email && !email.trim() && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please enter your email address.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Row: Password & Confirm Password */}
              <div className="form-row">
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
                  {touched.password && !isPasswordValid && (
                    <p className="field-error-msg">
                      <AlertCircle size={13} />
                      <span>Please enter a secure password.</span>
                    </p>
                  )}
                </div>

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

              {/* Primary Action Button */}
              <button
                type="submit"
                className="register-submit-btn"
                disabled={isSubmitting}
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
