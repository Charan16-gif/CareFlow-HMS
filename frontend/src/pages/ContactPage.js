import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Send,
  CheckCircle2,
  Building,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'general',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Contact CareFlow Support – Hospital Management System';
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Please provide your full name.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Please enter a subject.';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Please provide message details.';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters.';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    // Simulate instantaneous local submission processing
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 450);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      inquiryType: 'general',
      subject: '',
      message: '',
    });
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '2.5rem 1.25rem 5rem' }}>
      <div className="hero-ambient-glow" />

      <div style={{ maxWidth: '1140px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div className="section-tag" style={{ margin: '0 auto 1rem' }}>
            <Mail size={14} color="var(--primary-cyan)" />
            <span>Support &amp; Communications</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}
          >
            Get in Touch with{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CareFlow Support
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 1.6vw, 1.15rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              maxWidth: '720px',
              margin: '0 auto',
            }}
          >
            Have technical questions about CareFlow, need portal access assistance, or looking to schedule
            a platform demonstration? Send our team a message or reach us directly.
          </p>
        </div>

        {/* Contact Layout Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Verified Information & Direct Channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                background: 'var(--panel-elevated-bg)',
                border: '1px solid var(--glass-border-regular)',
              }}
            >
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <Building size={20} color="var(--primary-cyan)" />
                Project Contact Channels
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                    Official Email
                  </span>
                  <a
                    href="mailto:careflowofficial@gmail.com"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--primary-cyan)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    careflowofficial@gmail.com
                  </a>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Monitored for administrative, technical, and patient account support.
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--glass-border-subtle)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                    Clinical Operating Support
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                    <Clock size={16} color="var(--primary-teal)" />
                    <span>Monday – Saturday: 8:00 AM – 8:00 PM</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Front desk and receptionist queues run according to clinical consultation schedules.
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--glass-border-subtle)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                    Existing Portal Users
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    Registered patients can view prescriptions, download lab test reports, and submit doctor feedback directly from within their authenticated patient dashboard.
                  </p>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link
                      to="/login"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--primary-cyan)',
                      }}
                    >
                      <span>Sign In to Portal</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Informational Links Card */}
            <div
              className="glass-card"
              style={{
                padding: '1.5rem',
                background: 'var(--panel-elevated-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#34d399" />
                Data Protection &amp; Terms
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '0.75rem' }}>
                Learn how CareFlow protects health data through role-based access control and strict encryption protocols.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <Link to="/privacy" style={{ color: 'var(--primary-cyan)' }}>Privacy Policy &rarr;</Link>
                <Link to="/terms" style={{ color: 'var(--primary-cyan)' }}>Terms &amp; Conditions &rarr;</Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem',
              background: 'var(--panel-elevated-bg)',
              border: '1px solid var(--glass-border-regular)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <CheckCircle2 size={36} color="#34d399" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Inquiry Received!
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '460px', margin: '0 auto 1.75rem' }}>
                  Thank you, <strong>{formData.name}</strong>. Your message regarding &ldquo;{formData.subject}&rdquo; has been logged. Our administrative team will review your inquiry and follow up at <strong>{formData.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="glass-btn glass-btn-primary"
                  style={{ padding: '0.75rem 1.75rem', fontSize: '0.9rem' }}
                >
                  <span>Send Another Message</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Send an Inquiry
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Complete the fields below and our operations desk will review your inquiry promptly.
                </p>

                {/* Name Field */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="contact-name"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Full Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Sarah Jenkins or John Doe"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--panel-inner-bg)',
                      border: errors.name ? '1px solid #f87171' : '1px solid var(--glass-border-regular)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  {errors.name && (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={12} /> {errors.name}
                    </span>
                  )}
                </div>

                {/* Email Field */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="contact-email"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Email Address <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. name@example.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--panel-inner-bg)',
                      border: errors.email ? '1px solid #f87171' : '1px solid var(--glass-border-regular)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  {errors.email && (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={12} /> {errors.email}
                    </span>
                  )}
                </div>

                {/* Inquiry Type Field */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="contact-type"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Inquiry Category
                  </label>
                  <select
                    id="contact-type"
                    name="inquiryType"
                    value={formData.inquiryType}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--panel-inner-bg)',
                      border: '1px solid var(--glass-border-regular)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="general">General Project Information</option>
                    <option value="patient">Patient Portal &amp; Appointment Booking</option>
                    <option value="clinical">Doctor &amp; Clinical Operations</option>
                    <option value="lab">Laboratory Diagnostics Workflow</option>
                    <option value="pharmacy">Pharmacy &amp; Medication Stock</option>
                    <option value="billing">Billing &amp; Payment Inquiries</option>
                    <option value="technical">Technical Architecture &amp; Deployment</option>
                  </select>
                </div>

                {/* Subject Field */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="contact-subject"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Subject <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description of your inquiry"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--panel-inner-bg)',
                      border: errors.subject ? '1px solid #f87171' : '1px solid var(--glass-border-regular)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  {errors.subject && (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={12} /> {errors.subject}
                    </span>
                  )}
                </div>

                {/* Message Field */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label
                    htmlFor="contact-message"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Message Details <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please provide specific details so we can best route your inquiry..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--panel-inner-bg)',
                      border: errors.message ? '1px solid #f87171' : '1px solid var(--glass-border-regular)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  {errors.message && (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={12} /> {errors.message}
                    </span>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-btn glass-btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    justifyContent: 'center',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <span>Submitting Inquiry...</span>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
