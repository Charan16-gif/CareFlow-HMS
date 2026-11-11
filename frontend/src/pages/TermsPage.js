import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Shield,
  HelpCircle,
  Mail,
} from 'lucide-react';

const TermsPage = () => {
  useEffect(() => {
    document.title = 'Terms and Conditions – CareFlow Hospital Management System';
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '2.5rem 1.25rem 5rem' }}>
      <div className="hero-ambient-glow" />

      <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="section-tag" style={{ marginBottom: '1rem' }}>
            <FileText size={14} color="var(--primary-cyan)" />
            <span>Operational Guidelines &amp; Policies</span>
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
            CareFlow Terms and Conditions
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            Last Updated: November 2026 • CareFlow Hospital Management System Project
          </p>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Please read these Terms and Conditions carefully before accessing or using the CareFlow
            Hospital Management System application and associated clinical portals.
          </p>
        </div>

        {/* Content Card */}
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            background: 'var(--panel-elevated-bg)',
            border: '1px solid var(--glass-border-regular)',
          }}
        >
          {/* Section 1: Acceptance */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={20} color="var(--primary-cyan)" />
              1. Acceptance of Terms
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              By registering an account, logging in, or otherwise accessing any portal of the CareFlow Hospital
              Management System, you agree to be bound by these Terms and Conditions. If you do not agree to these
              terms, do not access or use CareFlow.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              These terms govern all user tiers, including Patients, Doctors, Receptionists, Laboratory Staff,
              Pharmacists, and Administrators.
            </p>
          </section>

          {/* Section 2: Medical Disclaimer */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginBottom: '1rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={20} color="#fbbf24" />
                2. Clinical &amp; Medical Disclaimer
              </h2>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                CareFlow is an administrative workflow and electronic documentation software application. CareFlow
                is <strong>NOT</strong> a medical diagnosis engine and does not provide autonomous clinical advice,
                treatment prescriptions, or medical emergency dispatch.
              </p>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                All clinical notes, diagnoses, laboratory test requests, and pharmaceutical prescriptions recorded
                in CareFlow represent the independent professional judgment of the licensed treating physician.
                If you are a patient experiencing a medical emergency, please contact your local emergency emergency
                services immediately.
              </p>
            </div>
          </section>

          {/* Section 3: Authorized Access & Accounts */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <UserCheck size={20} color="var(--primary-teal)" />
              3. Authorized Access &amp; Account Security
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Access to CareFlow portals is conditioned upon the following operational responsibilities:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Account Credentials:</strong> Users are responsible
                for maintaining the absolute confidentiality of their login credentials and OTP verification codes.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Role Fidelity:</strong> Users must operate only within
                the permissions designated for their specific role. Attempting to bypass role-based access controls
                is strictly prohibited.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Accurate Information:</strong> Patients and staff
                must provide truthful, accurate, and current information when registering, booking appointments,
                or documenting clinical encounters.
              </li>
            </ul>
          </section>

          {/* Section 4: Acceptable Use Policy */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Shield size={20} color="#38bdf8" />
              4. Acceptable Use Policy
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Users agree not to engage in any of the following prohibited behaviors:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>Interfering with, disrupting, or compromising the integrity of the CareFlow servers or databases.</li>
              <li>Attempting to access clinical records of other patients without authorized clinical delegation.</li>
              <li>Entering falsified laboratory test measurements or unauthorized prescription orders.</li>
              <li>Using automated scripts, bots, or scrapers to extract hospital records or patient details.</li>
              <li>Reverse engineering or tampering with application authentication tokens or API routes.</li>
            </ul>
          </section>

          {/* Section 5: System Availability & Modifications */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <HelpCircle size={20} color="#c084fc" />
              5. System Availability &amp; Maintenance
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              CareFlow strives for continuous, high-availability service for hospital operations. However, periodic
              maintenance, database index optimizations, and hosting infrastructure updates may necessitate temporary
              service interruptions.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              The development team reserves the right to enhance, modify, or update features to improve security,
              compliance, and user experience.
            </p>
          </section>

          {/* Section 6: Contact for Terms */}
          <section>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Mail size={20} color="var(--primary-teal)" />
              6. Inquiries Regarding Terms
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              For legal, regulatory, or policy-related questions concerning these terms, please contact:
            </p>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-inner-bg)',
                border: '1px solid var(--glass-border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Mail size={20} color="var(--primary-cyan)" />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Official Terms Contact</span>
                <a href="mailto:careflowofficial@gmail.com" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-cyan)' }}>
                  careflowofficial@gmail.com
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation Back to Site */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--primary-cyan)',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <span>&larr; Back to CareFlow Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
