import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  Mail,
  UserCheck,
  Server,
} from 'lucide-react';

const PrivacyPolicyPage = () => {
  useEffect(() => {
    document.title = 'Privacy Policy – CareFlow Hospital Management System';
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
            <ShieldCheck size={14} color="var(--primary-cyan)" />
            <span>Data Protection &amp; Confidentiality</span>
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
            CareFlow Privacy Policy
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            Last Updated: November 2026 • CareFlow Hospital Management System Project
          </p>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            This Privacy Policy describes how the CareFlow Hospital Management System collects, uses,
            protects, and manages personal, administrative, and clinical healthcare information across
            its applications and services.
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
          {/* Section 1: Overview & Scope */}
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
              <FileText size={20} color="var(--primary-cyan)" />
              1. Overview and Scope
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              CareFlow operates as a centralized hospital management system intended for authorized healthcare
              providers, clinical staff, administrators, and patients. Because CareFlow processes sensitive
              medical and appointment records, we enforce strict technical and operational confidentiality
              measures across every system tier.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              This policy applies to all registered accounts and public interactions with the CareFlow web application.
            </p>
          </section>

          {/* Section 2: Information Collected */}
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
              2. Information We Collect
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              CareFlow collects only the data necessary to provide effective hospital administration and clinical care continuity:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Account &amp; Identity Data:</strong> Full name,
                verified email address, contact telephone number, date of birth, gender, and securely salted/hashed passwords.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Clinical Healthcare Records:</strong> Outpatient
                consultation summaries, doctor diagnostic notes, medical symptom classifications, ordered laboratory tests,
                and digital prescription dosage instructions.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Laboratory Findings:</strong> Specimen collection
                records, quantitative biometric metrics, clinical reference intervals, and verified laboratory conclusion reports.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Billing &amp; Transaction Details:</strong> Itemized fee
                records for consultations, pharmacy dispensations, and diagnostic tests, along with payment status timestamps.
              </li>
            </ul>
          </section>

          {/* Section 3: Purpose of Processing */}
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
              <Server size={20} color="#38bdf8" />
              3. Purpose of Information Processing
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              We process collected records strictly for legitimate clinical and operational hospital functions:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>Coordinating patient appointment booking and physician queue management.</li>
              <li>Authorizing and dispensing verified prescriptions through the hospital pharmacy inventory.</li>
              <li>Conducting diagnostic tests and releasing verified lab reports directly to the requesting physician and patient.</li>
              <li>Delivering automated transactional emails, including registration one-time passwords (OTP) via the Brevo Email API.</li>
              <li>Reconciling financial receipts and maintaining transparent hospital audit trails.</li>
            </ul>
          </section>

          {/* Section 4: Access Restrictions & RBAC */}
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
              <Lock size={20} color="#f87171" />
              4. Access Restrictions &amp; Role-Based Security
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              CareFlow enforces strict Role-Based Access Control (RBAC) at both the API and database levels:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--panel-inner-bg)', border: '1px solid var(--glass-border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-cyan)', display: 'block', marginBottom: '0.25rem' }}>
                  Patients
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Can access solely their own personal appointments, prescriptions, invoices, and diagnostic test reports.
                </span>
              </div>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--panel-inner-bg)', border: '1px solid var(--glass-border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'block', marginBottom: '0.25rem' }}>
                  Doctors
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Can access assigned consultation queues, author prescriptions, and order diagnostics for their patients.
                </span>
              </div>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--panel-inner-bg)', border: '1px solid var(--glass-border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', display: 'block', marginBottom: '0.25rem' }}>
                  Laboratory Staff
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Restricted to test requests, sample tracking, and entering verified laboratory diagnostic values.
                </span>
              </div>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--panel-inner-bg)', border: '1px solid var(--glass-border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: '0.25rem' }}>
                  Pharmacists
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Restricted to pharmaceutical inventory counts, medicine reorders, and validated prescription dispensing.
                </span>
              </div>
            </div>
          </section>

          {/* Section 5: Data Protection Practices */}
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
              <ShieldCheck size={20} color="#34d399" />
              5. Data Protection &amp; Technical Safeguards
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              We implement industry-standard technical measures to safeguard health records against unauthorized access,
              alteration, disclosure, or destruction:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Cryptographic Password Hashing:</strong> Passwords
                are never stored in plaintext; they are hashed using Django&rsquo;s PBKDF2 algorithm with SHA-256 and unique per-user salts.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Transport Layer Security:</strong> All client-server
                exchanges are encrypted using HTTPS (TLS 1.2+).
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Database Isolation:</strong> Data is hosted on a managed
                PostgreSQL database with strict referential integrity constraints.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>No Third-Party Monetization:</strong> We do not sell,
                rent, monetize, or disclose patient medical data to third-party advertisers, data brokers, or marketing networks.
              </li>
            </ul>
          </section>

          {/* Section 6: Patient Rights */}
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
              <Eye size={20} color="var(--primary-cyan)" />
              6. Patient and User Rights
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Every registered patient possesses clear rights regarding their health information within CareFlow:
            </p>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75 }}>
              <li>Right to view all historical appointments, consultation summaries, and prescriptions at any time.</li>
              <li>Right to download digital copies of verified laboratory test reports in PDF format.</li>
              <li>Right to request corrections to demographic contact information through the front desk or profile settings.</li>
              <li>Right to request account deactivation by submitting an inquiry to project administration.</li>
            </ul>
          </section>

          {/* Section 7: Contact Information */}
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
              7. Privacy Inquiries &amp; Contact
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
              If you have questions, concerns, or requests regarding this Privacy Policy or how your healthcare records
              are handled in CareFlow, please contact the project administrator:
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Official Privacy Contact</span>
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

export default PrivacyPolicyPage;
