import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import GlassCard from '../components/common/GlassCard';
import {
  HeartPulse,
  UserCheck,
  CalendarClock,
  FlaskConical,
  Pill,
  Receipt,
  Shield,
  Stethoscope,
  Microscope,
  PackageCheck,
  ArrowRight,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Layers,
  Activity,
  FolderHeart,
  Clock,
  Mail,
  Building,
} from 'lucide-react';

const HomePage = () => {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ambient Radial Mesh Lighting in Hero Background */}
      <div className="hero-ambient-glow" />

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="home-section-responsive"
        style={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="home-hero-grid">
          {/* Left Column: Headlines & Actions */}
          <div>
            <div className="section-tag" style={{ marginBottom: '1.25rem' }}>
              <Sparkles size={14} color="var(--primary-cyan)" />
              <span>Hospital Management System</span>
            </div>

            <h1
              className="home-hero-title"
              style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                lineHeight: 1.15,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                marginBottom: '1.5rem',
              }}
            >
              Smarter Hospital Management.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Better Connected Care.
              </span>
            </h1>

            <p
              className="home-hero-subtitle"
              style={{
                fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)',
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                marginBottom: '2.5rem',
                maxWidth: '560px',
              }}
            >
              Meet CareFlow, a hospital management system designed to bring patient
              records, appointments, laboratory tests, medicines, and billing together in
              one place.
            </p>

            {/* Hero CTAs */}
            <div className="home-hero-ctas">
              <Link
                to="/register"
                className="glass-btn glass-btn-primary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
              >
                <span>Get Started</span>
                <ArrowRight size={17} />
              </Link>

              <a
                href="#about"
                className="glass-btn glass-btn-secondary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
              >
                <span>Explore CareFlow</span>
              </a>
            </div>
          </div>

          {/* Right Column: Modern Healthcare Interface Illustration */}
          <div style={{ position: 'relative' }}>
            <div
              className="glass-panel home-hero-card"
            >
              {/* Illustration Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--glass-border-subtle)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Logo size="sm" animated={true} />
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      CareFlow Clinical Flow
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Connected Hospital Interface
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Active Care</span>
                </div>
              </div>

              {/* Glowing Animated ECG Line Inside Illustration */}
              <div
                style={{
                  background: 'var(--ecg-box-bg)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <HeartPulse size={14} color="var(--primary-cyan)" className="pulse-vital" />
                    Patient Vital Rhythm
                  </span>
                  <span style={{ color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' }}>72 BPM</span>
                </div>

                <svg viewBox="0 0 500 50" style={{ width: '100%', height: '40px', overflow: 'visible' }}>
                  <path
                    className="ecg-animated-path"
                    d="M0,25 L80,25 L90,15 L100,35 L110,25 L140,25 L155,5 L170,45 L185,25 L210,25 L220,18 L230,30 L240,25 L340,25 L355,5 L370,45 L385,25 L500,25"
                    fill="none"
                    stroke="var(--ecg-stroke)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Mock Patient Appointment Card */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel-inner-bg)',
                  border: '1px solid var(--glass-border-regular)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Consultation & Examination
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--primary-cyan)',
                      background: 'rgba(6, 182, 212, 0.12)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                    }}
                  >
                    10:30 AM
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <UserCheck size={14} color="var(--primary-teal-light)" />
                  <span>Outpatient Visit • General Medicine</span>
                </div>
              </div>

              {/* Mock Medical Records & Billing Row */}
              <div className="home-hero-lab-billing-grid">
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--panel-inner-bg)',
                    border: '1px solid var(--glass-border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                    Laboratory Order
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                    Complete Blood Count
                  </span>
                </div>

                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--panel-inner-bg)',
                    border: '1px solid var(--glass-border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                    Billing Status
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                    Invoice Reconciled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: ABOUT CAREFLOW
      ───────────────────────────────────────────────────────────── */}
      <section
        id="about"
        className="home-section-responsive"
      >
        <div
          className="glass-panel home-panel-responsive"
          style={{
            background: 'var(--panel-elevated-bg)',
            border: '1px solid var(--glass-border-regular)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            <div>
              <div className="section-tag">
                <Building size={14} color="var(--primary-cyan)" />
                <span>About CareFlow</span>
              </div>

              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '1.25rem',
                  lineHeight: 1.2,
                }}
              >
                Healthcare Management,{' '}
                <span style={{ color: 'var(--primary-cyan)' }}>Made Simpler.</span>
              </h2>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: '1.75rem',
                }}
              >
                CareFlow helps hospital teams organize everyday work in one system.
                From managing patient information and appointments to laboratory requests,
                medicines, and billing, CareFlow brings important hospital activities into
                a clear and organized experience.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={18} color="var(--primary-cyan)" />
                  <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                    Single unified system for patient records and clinical workflows
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={18} color="var(--primary-teal-light)" />
                  <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                    Coordination between front desk, doctors, laboratory, and pharmacy
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={18} color="var(--primary-sky)" />
                  <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                    Designed for clarity, usability, and patient care
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Overview Card */}
            <div className="home-about-features-grid">
              <div
                className="glass-card"
                style={{ padding: '1.5rem', textAlign: 'center' }}
              >
                <FolderHeart size={28} color="var(--primary-cyan)" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Patient Records
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Organized medical profiles and visit history
                </p>
              </div>

              <div
                className="glass-card"
                style={{ padding: '1.5rem', textAlign: 'center' }}
              >
                <CalendarClock size={28} color="var(--primary-teal)" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Appointments
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Clear schedules and consultation tracking
                </p>
              </div>

              <div
                className="glass-card"
                style={{ padding: '1.5rem', textAlign: 'center' }}
              >
                <FlaskConical size={28} color="#38bdf8" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Diagnostics
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Laboratory tests and report records
                </p>
              </div>

              <div
                className="glass-card"
                style={{ padding: '1.5rem', textAlign: 'center' }}
              >
                <Receipt size={28} color="#34d399" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Billing
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Structured invoices and payment tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: SERVICES — WHAT CAREFLOW OFFERS (5 CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="services"
        className="home-section-responsive"
      >
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div className="section-tag">
            <Layers size={14} color="var(--primary-cyan)" />
            <span>Hospital Services</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
            What CareFlow Offers
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Five core capabilities designed to support everyday hospital activities.
          </p>
        </div>

        {/* 5 Feature Cards */}
        <div className="home-grid-services">
          {/* Service 1: Patient Management */}
          <GlassCard>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              <UserCheck size={24} color="var(--primary-cyan)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Patient Management
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Organize patient information and medical records in a structured format.
              Keep contact details, emergency information, and visit summaries organized.
            </p>
          </GlassCard>

          {/* Service 2: Appointment Management */}
          <GlassCard>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(13, 148, 136, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid rgba(13, 148, 136, 0.3)',
              }}
            >
              <CalendarClock size={24} color="var(--primary-teal)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Appointment Management
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Schedule and manage patient visits with clear time slots.
              Coordinate doctor availability, manage check-ins, and avoid double-booking.
            </p>
          </GlassCard>

          {/* Service 3: Laboratory Management */}
          <GlassCard>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <FlaskConical size={24} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Laboratory Management
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Handle ordered tests and record results clearly.
              Track test requests from doctor orders to specimen collection and result entry.
            </p>
          </GlassCard>

          {/* Service 4: Pharmacy Management */}
          <GlassCard>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid rgba(20, 184, 166, 0.3)',
              }}
            >
              <Pill size={24} color="var(--primary-teal-light)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Pharmacy Management
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Manage medicine information, stock, and dispensing.
              Verify doctor prescriptions and update medicine quantities when items are dispensed.
            </p>
          </GlassCard>

          {/* Service 5: Billing Management */}
          <GlassCard>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Receipt size={24} color="#34d399" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Billing Management
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Prepare bills and track payments for hospital services.
              Consolidate consultations, laboratory tests, and medicines into clear, transparent invoices.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: HOW IT WORKS (5 STEPS WORKFLOW)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="home-section-responsive"
      >
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div className="section-tag">
            <Clock size={14} color="var(--primary-cyan)" />
            <span>Hospital Workflow</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
            How It Works
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            A clear step-by-step hospital workflow designed for smooth patient care.
          </p>
        </div>

        {/* 5 Steps Grid */}
        <div className="home-grid-steps">
          {/* Step 1 */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', position: 'relative' }}
          >
            <div className="workflow-step-badge" style={{ marginBottom: '1rem' }}>
              1
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Register a Patient
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Patient information is entered and saved with a unique identification record.
            </p>
          </div>

          {/* Step 2 */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', position: 'relative' }}
          >
            <div className="workflow-step-badge" style={{ marginBottom: '1rem' }}>
              2
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Schedule Appointment
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              A visit is scheduled with a doctor at an available consultation time slot.
            </p>
          </div>

          {/* Step 3 */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', position: 'relative' }}
          >
            <div className="workflow-step-badge" style={{ marginBottom: '1rem' }}>
              3
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Doctor Consultation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The doctor examines the patient, records observations, and provides care guidance.
            </p>
          </div>

          {/* Step 4 */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', position: 'relative' }}
          >
            <div className="workflow-step-badge" style={{ marginBottom: '1rem' }}>
              4
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Lab Tests & Prescriptions
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Diagnostic tests are managed by lab staff and medicines are dispensed by pharmacy.
            </p>
          </div>

          {/* Step 5 */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem', position: 'relative' }}
          >
            <div className="workflow-step-badge" style={{ marginBottom: '1rem' }}>
              5
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Billing & Payment
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Bills are generated from services provided, and payments are recorded with receipts.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: OUR TEAM — WHO USES CAREFLOW? (6 ROLES)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="our-team"
        className="home-section-responsive"
      >
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div className="section-tag">
            <UserCheck size={14} color="var(--primary-cyan)" />
            <span>Supported Roles</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
            Who Uses CareFlow?
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            CareFlow supports six distinct roles, ensuring each person has the right tools
            for their daily responsibilities.
          </p>
        </div>

        {/* 6 Roles Cards */}
        <div className="home-grid-roles">
          {/* Role 1: Administrator */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                <Shield size={22} color="var(--primary-cyan)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Administrator</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>System Management</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Manages user accounts and oversees overall system configuration.
              Ensures hospital workflows and settings operate securely.
            </p>
          </GlassCard>

          {/* Role 2: Receptionist */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(13, 148, 136, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                }}
              >
                <ClipboardList size={22} color="var(--primary-teal)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Receptionist</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Front Desk Operations</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Registers patients, books appointments, and assists with check-in.
              Helps patients navigate their visits and manages front-desk billing.
            </p>
          </GlassCard>

          {/* Role 3: Doctor */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <Stethoscope size={22} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Doctor</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Clinical Practice</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Reviews patient appointment queues and conducts medical consultations.
              Records clinical notes, requests laboratory tests, and writes prescriptions.
            </p>
          </GlassCard>

          {/* Role 4: Patient */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                }}
              >
                <HeartPulse size={22} color="#fb7185" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Patient</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Patient Portal</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Registers online, requests doctor appointments, and checks visit history.
              Views personal laboratory results and payment records when ready.
            </p>
          </GlassCard>

          {/* Role 5: Lab Staff */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(168, 85, 247, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <Microscope size={22} color="#c084fc" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Lab Staff</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Laboratory Services</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Processes ordered diagnostic tests and collects patient specimens.
              Records test results and findings for the consulting doctor to review.
            </p>
          </GlassCard>

          {/* Role 6: Pharmacist */}
          <GlassCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <PackageCheck size={22} color="#fbbf24" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pharmacist</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Dispensary & Inventory</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Verifies prescription orders written by doctors and dispenses medications.
              Tracks medicine stock levels and helps maintain pharmacy inventory.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: WHY CHOOSE CAREFLOW?
      ───────────────────────────────────────────────────────────── */}
      <section
        id="why-careflow"
        className="home-section-responsive"
      >
        <div
          className="glass-panel home-panel-responsive"
          style={{
            background: 'var(--panel-elevated-bg)',
            border: '1px solid var(--glass-border-regular)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem' }}>
            <div className="section-tag">
              <CheckCircle2 size={14} color="var(--primary-cyan)" />
              <span>Project Advantages</span>
            </div>

            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
              }}
            >
              Everything Organized.{' '}
              <span style={{ color: 'var(--primary-cyan)' }}>Everyday Work Simplified.</span>
            </h2>

            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              CareFlow focuses on clear organization and reliable hospital workflows.
            </p>
          </div>

          {/* 5 Value Goals */}
          <div className="home-grid-values">
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <CheckCircle2 size={20} color="var(--primary-cyan)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Organized Hospital Information
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Keeps patient details, clinical notes, and billing in one accessible system.
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <CheckCircle2 size={20} color="var(--primary-teal-light)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Clear Appointment Management
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Helps doctors and staff manage consultation times and prevent schedule conflicts.
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <CheckCircle2 size={20} color="var(--primary-sky)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Easier Team Coordination
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Improves communication between receptionists, doctors, laboratory, and pharmacy.
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <CheckCircle2 size={20} color="#34d399" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Structured Records
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Standardized records for patient care, laboratory tests, medicine stock, and billing.
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <CheckCircle2 size={20} color="#fbbf24" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Role-Based Security
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Ensures users access only the features and information relevant to their assigned role.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: CONTACT SECTION
      ───────────────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="home-section-responsive"
      >
        <div
          className="glass-panel home-panel-responsive"
          style={{
            background: 'var(--panel-elevated-bg)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            textAlign: 'center',
          }}
        >
          <div className="section-tag" style={{ margin: '0 auto 1rem' }}>
            <Mail size={14} color="var(--primary-cyan)" />
            <span>Project Inquiries</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}
          >
            Let's Connect.
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 2rem',
              lineHeight: 1.65,
            }}
          >
            CareFlow Hospital Management System Project. Learn more about the project,
            explore its capabilities, or reach out to the development team.
          </p>

          <div
            className="home-contact-pills-box"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Building size={18} color="var(--primary-cyan)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                CareFlow Hospital Management System Project
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Activity size={18} color="var(--primary-teal-light)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Integrated Full-Stack Architecture
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: FINAL CALL TO ACTION
      ───────────────────────────────────────────────────────────── */}
      <section
        className="home-section-responsive"
        style={{
          paddingTop: '1rem',
          paddingBottom: '4.5rem',
        }}
      >
        <div
          className="glass-card home-panel-responsive"
          style={{
            textAlign: 'center',
            background: 'var(--panel-elevated-bg)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: 'var(--glass-shadow-lg), var(--glow-cyan)',
          }}
        >
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.8vw, 3rem)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                lineHeight: 1.2,
              }}
            >
              Discover a Simpler Way to Manage Hospital Work.
            </h2>

            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                marginBottom: '2.5rem',
              }}
            >
              Explore CareFlow and see how a connected system can help organize
              everyday hospital activities.
            </p>

            <div className="home-final-ctas">
              <Link
                to="/register"
                className="glass-btn glass-btn-primary"
                style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
              >
                <span>Register as a Patient</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                className="glass-btn glass-btn-secondary"
                style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
              >
                <span>Login to CareFlow</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
