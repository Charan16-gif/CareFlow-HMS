import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import {
  Building2,
  CheckCircle2,
  Layers,
  Shield,
  Stethoscope,
  Microscope,
  Pill,
  Receipt,
  UserCheck,
  CalendarClock,
  ArrowRight,
  Cpu,
} from 'lucide-react';

const AboutPage = () => {
  useEffect(() => {
    document.title = 'About CareFlow – Smart Hospital Management System';
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '2.5rem 1.25rem 5rem' }}>
      <div className="hero-ambient-glow" />

      <div style={{ maxWidth: '1140px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header Breadcrumb / Meta */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="section-tag" style={{ marginBottom: '1rem' }}>
            <Building2 size={14} color="var(--primary-cyan)" />
            <span>About CareFlow-HMS</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            A Unified Platform for{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Modern Healthcare Operations
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: '820px',
            }}
          >
            CareFlow is an integrated hospital management system engineered to connect patients,
            clinicians, receptionists, laboratory technicians, pharmacists, and administrators
            into one collaborative clinical workflow.
          </p>
        </div>

        {/* Project Mission & Background Panel */}
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            marginBottom: '3rem',
            background: 'var(--panel-elevated-bg)',
            border: '1px solid var(--glass-border-regular)',
          }}
        >
          <div style={{ maxWidth: '900px' }}>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
              }}
            >
              Why CareFlow Was Developed
            </h2>
            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                marginBottom: '1.25rem',
              }}
            >
              Modern healthcare facilities frequently operate with disjointed software solutions:
              appointment bookings handled on paper ledgers or standalone spreadsheets, diagnostic
              orders tracked through manual slips, pharmacy stock recorded separately from patient
              prescriptions, and billing calculated with high risk of manual error.
            </p>
            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                marginBottom: '1.5rem',
              }}
            >
              CareFlow was built to resolve this fragmentation. By establishing a central repository
              for clinical encounters, verified diagnostic metrics, digital prescriptions, and
              itemized invoices, CareFlow eliminates inter-departmental bottlenecks and ensures
              transparent, accountable patient care from registration to discharge.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel-inner-bg)',
                  border: '1px solid var(--glass-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={18} color="var(--primary-cyan)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Single Source of Clinical Truth
                </span>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel-inner-bg)',
                  border: '1px solid var(--glass-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={18} color="var(--primary-teal-light)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Zero Disjointed Paper Trails
                </span>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel-inner-bg)',
                  border: '1px solid var(--glass-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Transparent Audit &amp; Reconciliation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Seven Implemented Modules Section */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <div className="section-tag">
              <Layers size={14} color="var(--primary-cyan)" />
              <span>System Capabilities</span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Seven Core Implemented Modules
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              CareFlow provides dedicated, purpose-built tools across seven essential areas of
              hospital administration.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* 1. Patient Management */}
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
                  <UserCheck size={22} color="var(--primary-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    1. Patient Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Records &amp; Profiles</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Patient registration with verified email OTP, demographic profiles, emergency
                contacts, consultation history, personal diagnostic reports, and digital prescriptions.
              </p>
            </GlassCard>

            {/* 2. Appointment Management */}
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
                  <CalendarClock size={22} color="var(--primary-teal)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    2. Appointment Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Scheduling &amp; Allocation</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Real-time appointment requests, intelligent doctor assignment mapped to reported
                clinical symptoms, status management (Pending, Confirmed, Completed, Cancelled), and queue tracking.
              </p>
            </GlassCard>

            {/* 3. Doctor & Clinical Management */}
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
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    3. Doctor Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Consultations &amp; Care</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Physician schedule overview, outpatient clinical notes, diagnostic test ordering,
                electronic prescription authoring with dosage instructions, and patient query replies.
              </p>
            </GlassCard>

            {/* 4. Laboratory Management */}
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
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    4. Laboratory Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Diagnostics &amp; Testing</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Test request intake from doctors, specimen tracking, quantitative and qualitative
                result entry, and verified diagnostic report generation viewable and downloadable by patients.
              </p>
            </GlassCard>

            {/* 5. Pharmacy Management */}
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
                  <Pill size={22} color="#fbbf24" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    5. Pharmacy Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Dispensary &amp; Stock</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Pharmaceutical inventory catalog, stock count management with automatic depletion
                upon patient purchase or dispensing, expiry tracking, and prescription validation.
              </p>
            </GlassCard>

            {/* 6. Billing Management */}
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Receipt size={22} color="#34d399" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    6. Billing Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Invoicing &amp; Receipts</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Consolidated billing for consultation fees, laboratory diagnostics, and dispensed
                medicines. Front-desk payment recording and itemized receipts for transparent financial tracking.
              </p>
            </GlassCard>

            {/* 7. User & Role Management */}
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <Shield size={22} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    7. User &amp; Role Management
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Security &amp; Governance</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Six-tier role-based access control protecting clinical records across Administrators,
                Doctors, Receptionists, Laboratory Staff, Pharmacists, and Patients with strict boundary enforcement.
              </p>
            </GlassCard>
          </div>
        </div>

        {/* Technical Architecture & Stack */}
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            marginBottom: '3.5rem',
            background: 'var(--panel-elevated-bg)',
            border: '1px solid var(--glass-border-regular)',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <div className="section-tag" style={{ marginBottom: '0.75rem' }}>
              <Cpu size={14} color="var(--primary-cyan)" />
              <span>Engineering Stack</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Built with Proven Full-Stack Technology
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              CareFlow combines a responsive React frontend with a secure Django REST Framework backend
              and PostgreSQL database.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Frontend Interface
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                React.js (CRA)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Component-driven architecture, React Router v6, responsive Glassmorphism design system,
                and real-time theme switching (Slate, White, Black).
              </p>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-teal)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                API &amp; Business Logic
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Django &amp; Django REST
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Python 3.12, robust Django REST Framework endpoints, serialized data validation,
                and session/token authentication with granular permission classes.
              </p>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Relational Database
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                PostgreSQL
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                ACID-compliant relational schema, foreign key referential integrity across patients,
                consultations, test orders, medicines, and invoices.
              </p>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Transactional Email
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Brevo Email API
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Direct transactional dispatch from careflowofficial@gmail.com for patient
                registration verification codes and account communications.
              </p>
            </div>
          </div>
        </div>

        {/* Next Step / Call to Action */}
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--panel-elevated-bg)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Ready to Experience Connected Healthcare?
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            Sign in to access your role-specific dashboard or register as a patient to book your next consultation.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              className="glass-btn glass-btn-primary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
            >
              <span>Sign In to Portal</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/register"
              className="glass-btn glass-btn-secondary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}
            >
              <span>Register as Patient</span>
            </Link>
            <Link
              to="/contact"
              className="glass-btn"
              style={{
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border-subtle)',
              }}
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
