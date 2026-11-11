/**
 * CareFlow-HMS Static HTML Prerendering Engine
 *
 * Generates standalone, crawlable static HTML files for all genuine public routes
 * directly inside the CRA build/ directory.
 *
 * Each generated HTML file contains:
 * - Unique <title>
 * - Unique meta description
 * - Unique canonical <link rel="canonical">
 * - Unique primary <h1>
 * - Unique Open Graph and Twitter Card tags
 * - Unique JSON-LD structured data
 * - Meaningful semantic HTML content (300-800+ words) inside <div id="root">
 * - Linked hashed Webpack bundles for client-side React hydration
 */

const fs = require('fs');
const path = require('path');

// Determine build directory (works from repo root or frontend/)
const buildDir = fs.existsSync(path.resolve(__dirname, '../build'))
  ? path.resolve(__dirname, '../build')
  : path.resolve(__dirname, '../../frontend/build');

if (!fs.existsSync(buildDir)) {
  console.error('[Prerender] Error: build directory not found at', buildDir);
  process.exit(1);
}

const baseIndexHtmlPath = path.join(buildDir, 'index.html');
if (!fs.existsSync(baseIndexHtmlPath)) {
  console.error('[Prerender] Error: base build/index.html not found at', baseIndexHtmlPath);
  process.exit(1);
}

const baseHtml = fs.readFileSync(baseIndexHtmlPath, 'utf8');

// Shared Public Navigation Shell (Crawler-accessible and styled with clinical palette)
const sharedHeader = `
  <header style="padding: 1.25rem 1.5rem; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <a href="/" style="display: flex; align-items: center; gap: 0.65rem; text-decoration: none; color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.25rem;">
        <span style="color: #22d3ee;">Care</span><span style="color: #38bdf8;">Flow</span>
        <span style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 4px; color: #22d3ee; font-weight: 700; margin-left: 0.25rem;">HMS</span>
      </a>
      <nav aria-label="CareFlow Navigation" style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; font-size: 0.9rem;">
        <a href="/" style="color: #cbd5e1; text-decoration: none; font-weight: 500;">Home</a>
        <a href="/about" style="color: #cbd5e1; text-decoration: none; font-weight: 500;">About CareFlow</a>
        <a href="/about#features" style="color: #cbd5e1; text-decoration: none; font-weight: 500;">Hospital Services</a>
        <a href="/about#workflow" style="color: #cbd5e1; text-decoration: none; font-weight: 500;">Hospital Workflow</a>
        <a href="/contact" style="color: #cbd5e1; text-decoration: none; font-weight: 500;">Contact Support</a>
        <a href="/login" style="padding: 0.5rem 1rem; border-radius: 6px; background: rgba(255, 255, 255, 0.08); color: #22d3ee; text-decoration: none; font-weight: 600; border: 1px solid rgba(6, 182, 212, 0.3);">Sign In</a>
        <a href="/register" style="padding: 0.5rem 1rem; border-radius: 6px; background: #0d9488; color: #ffffff; text-decoration: none; font-weight: 600;">Register as Patient</a>
      </nav>
    </div>
  </header>
`;

// Shared Public Footer Shell
const sharedFooter = `
  <footer style="padding: 3rem 1.5rem 2rem; background: rgba(10, 15, 29, 0.98); border-top: 1px solid rgba(255, 255, 255, 0.08); font-family: 'Inter', sans-serif; color: #94a3b8; font-size: 0.875rem;">
    <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      <div>
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.15rem; color: #f8fafc; margin-bottom: 0.75rem;">
          <span style="color: #22d3ee;">Care</span><span>Flow</span> <span style="font-size: 0.7rem; color: #22d3ee;">HMS</span>
        </div>
        <p style="line-height: 1.6; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.75rem;">
          CareFlow is a hospital management system designed to simplify daily healthcare operations by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators through one centralized platform.
        </p>
        <p style="font-size: 0.85rem; color: #cbd5e1;">Official Email: <a href="mailto:careflowofficial@gmail.com" style="color: #22d3ee; text-decoration: none;">careflowofficial@gmail.com</a></p>
      </div>
      <div>
        <h4 style="color: #f8fafc; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem;">System Navigation</h4>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
          <li><a href="/" style="color: #94a3b8; text-decoration: none;">Home Overview</a></li>
          <li><a href="/about" style="color: #94a3b8; text-decoration: none;">About CareFlow</a></li>
          <li><a href="/contact" style="color: #94a3b8; text-decoration: none;">Contact Support Desk</a></li>
          <li><a href="/login" style="color: #94a3b8; text-decoration: none;">Sign In to Portal</a></li>
          <li><a href="/register" style="color: #94a3b8; text-decoration: none;">Patient Registration</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color: #f8fafc; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem;">Clinical Modules</h4>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 2; font-size: 0.85rem;">
          <li>Patient Profile &amp; Records Management</li>
          <li>Appointment Scheduling &amp; Allocation</li>
          <li>Doctor Consultations &amp; Digital Prescriptions</li>
          <li>Laboratory Test Orders &amp; Verified PDF Reports</li>
          <li>Pharmacy Inventory &amp; Stock Dispensing</li>
          <li>Consolidated Invoicing &amp; Payment Receipts</li>
        </ul>
      </div>
      <div>
        <h4 style="color: #f8fafc; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.85rem;">Governance &amp; Policies</h4>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
          <li><a href="/privacy" style="color: #94a3b8; text-decoration: none;">Privacy Policy</a></li>
          <li><a href="/terms" style="color: #94a3b8; text-decoration: none;">Terms and Conditions</a></li>
          <li>Role-Based Access Control (RBAC)</li>
          <li>PBKDF2 Password Hashing &amp; TLS Encryption</li>
        </ul>
      </div>
    </div>
    <div style="max-width: 1200px; margin: 0 auto; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem;">
      <div>&copy; 2026 CareFlow-HMS. All rights reserved. Hospital Management System Project.</div>
      <div>
        <a href="/privacy" style="color: #94a3b8; text-decoration: none; margin-right: 1rem;">Privacy Policy</a>
        <a href="/terms" style="color: #94a3b8; text-decoration: none;">Terms &amp; Conditions</a>
      </div>
    </div>
  </footer>
`;

// Definitions of genuine public pages
const pages = [
  // 1. Homepage (/)
  {
    routes: ['/', '/index.html'],
    title: 'CareFlow – Smart Hospital Management System',
    metaDescription: 'CareFlow is a hospital management system designed to simplify daily healthcare operations by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators through one centralized platform.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/',
    ogTitle: 'CareFlow – Smart Hospital Management System',
    ogDescription: 'CareFlow is a hospital management system designed to simplify daily healthcare operations by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators through one centralized platform.',
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "@id": "https://care-flow-hms-opal.vercel.app/#software",
          "name": "CareFlow HMS",
          "alternateName": "CareFlow Hospital Management System",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web Browser",
          "url": "https://care-flow-hms-opal.vercel.app/",
          "description": "CareFlow is a hospital management system designed to simplify daily healthcare operations by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators through one centralized platform.",
          "featureList": [
            "Patient registration and medical profile management",
            "Appointment scheduling and automated physician matching",
            "Doctor consultation records and digital prescriptions",
            "Diagnostic laboratory test ordering and verified reports",
            "Pharmacy medicine inventory tracking and dispensing",
            "Consolidated patient billing and receipt management",
            "Role-based portal security for six distinct user roles"
          ],
          "screenshot": "https://care-flow-hms-opal.vercel.app/og-image.png"
        },
        {
          "@type": "WebSite",
          "@id": "https://care-flow-hms-opal.vercel.app/#website",
          "url": "https://care-flow-hms-opal.vercel.app/",
          "name": "CareFlow – Smart Hospital Management System",
          "description": "Comprehensive hospital management system connecting clinical workflows, diagnostics, pharmacy, and patient administration.",
          "inLanguage": "en"
        }
      ]
    },
    bodyHtml: `
      <main style="max-width: 1160px; margin: 0 auto; padding: 3rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc;">
        <section aria-labelledby="main-heading" style="margin-bottom: 3.5rem;">
          <span style="display: inline-block; padding: 0.35rem 0.9rem; background: rgba(13, 148, 136, 0.2); color: #2dd4bf; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.25rem;">
            Hospital Management System
          </span>
          <h1 id="main-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(2.3rem, 4vw, 3.4rem); line-height: 1.15; font-weight: 800; margin-bottom: 1.25rem; letter-spacing: -0.03em;">
            CareFlow – <span style="color: #22d3ee;">Smart Hospital Management System</span>
          </h1>
          <p style="font-size: 1.15rem; line-height: 1.7; color: #cbd5e1; max-width: 820px; margin-bottom: 2rem;">
            CareFlow is a hospital management system designed to simplify daily healthcare operations by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators through one centralized platform.
          </p>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/login" style="display: inline-block; padding: 0.85rem 1.75rem; background: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem;">
              Sign In to Portal &rarr;
            </a>
            <a href="/register" style="display: inline-block; padding: 0.85rem 1.75rem; background: rgba(255, 255, 255, 0.08); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem; border: 1px solid rgba(255, 255, 255, 0.15);">
              Register as Patient
            </a>
            <a href="/about" style="display: inline-block; padding: 0.85rem 1.5rem; background: transparent; color: #22d3ee; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
              Explore System Documentation &rarr;
            </a>
          </div>
        </section>

        <section id="about" aria-labelledby="about-heading" style="margin-bottom: 3.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.25rem;">
          <h2 id="about-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 1rem;">
            About CareFlow
          </h2>
          <p style="line-height: 1.75; color: #cbd5e1; margin-bottom: 1rem; font-size: 1rem;">
            CareFlow was developed to address common operational challenges encountered in modern healthcare environments, including fragmented medical records, disjointed scheduling across departments, delayed diagnostic report dissemination, and uncoordinated medicine dispensing.
          </p>
          <p style="line-height: 1.75; color: #cbd5e1; font-size: 1rem;">
            By unifying front-desk registration, clinical consultation notes, laboratory workflows, prescription tracking, and billing into an integrated system, CareFlow ensures that medical professionals have access to verified patient data when they need it most.
          </p>
        </section>

        <section id="features" aria-labelledby="features-heading" style="margin-bottom: 3.5rem;">
          <div style="margin-bottom: 2rem;">
            <h2 id="features-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.5rem;">
              Seven Core Implemented Modules
            </h2>
            <p style="color: #94a3b8; font-size: 1rem;">CareFlow focuses strictly on actual implemented features supporting hospital operations.</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">1. Patient Management</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Self-registration, profile management, medical appointment tracking, prescription history, and personal lab results access.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">2. Appointment Management</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Real-time appointment booking, automated physician assignment based on clinical symptoms, and live consultation status tracking.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">3. Doctor Consultations</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Clinician appointment schedule management, consultation review, electronic prescription authoring, and direct diagnostic test requests.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">4. Laboratory Diagnostics</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Diagnostic test order intake, sample tracking, clinical result value entry, and verified diagnostic PDF report generation.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">5. Pharmacy Inventory</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Pharmaceutical catalog maintenance, stock level tracking, automated stock reduction upon dispense, and patient medicine purchases.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">6. Billing &amp; Receipts</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Transparent fee collection for consultations, medicine purchases, and diagnostic tests with itemized payment receipts.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.15rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">7. Six-Tier Role Management</h3>
              <p style="color: #cbd5e1; font-size: 0.925rem; line-height: 1.6;">Granular role-based access control safeguarding patient information across Administrators, Doctors, Receptionists, Lab Staff, Pharmacists, and Patients.</p>
            </article>
          </div>
        </section>

        <section id="workflow" aria-labelledby="workflow-heading" style="margin-bottom: 3.5rem;">
          <h2 id="workflow-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 1.25rem;">
            How CareFlow Works
          </h2>
          <ol style="color: #cbd5e1; line-height: 1.85; padding-left: 1.5rem; font-size: 1rem;">
            <li><strong>Patient Registration:</strong> Patients create a secure verified account with real-time OTP confirmation.</li>
            <li><strong>Appointment Booking:</strong> Patient selects their health problem and is scheduled with an appropriate specialist.</li>
            <li><strong>Doctor Consultation:</strong> The physician examines the patient, records clinical notes, and writes prescriptions or requests lab tests.</li>
            <li><strong>Laboratory Testing:</strong> Lab technicians collect samples, record quantitative results, and finalize diagnostic reports.</li>
            <li><strong>Pharmacy Dispense:</strong> Pharmacist fulfills validated prescriptions and inventory automatically reflects dispensed items.</li>
            <li><strong>Billing &amp; Payment:</strong> Front desk or online checkout processes transparent billing with verified payment tracking.</li>
          </ol>
        </section>

        <section aria-labelledby="roles-heading" style="margin-bottom: 3.5rem;">
          <h2 id="roles-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 1.25rem;">
            User Roles &amp; Responsibilities
          </h2>
          <ul style="color: #cbd5e1; line-height: 1.85; padding-left: 1.5rem; font-size: 1rem;">
            <li><strong>Patients:</strong> Book appointments, review prescriptions, view lab reports, purchase prescribed medicines, and submit physician feedback.</li>
            <li><strong>Doctors:</strong> View assigned patients, manage daily clinical queues, record diagnoses, order lab tests, and author prescriptions.</li>
            <li><strong>Receptionists:</strong> Onboard walk-in patients, manage front-desk appointment queues, process consultations, and collect payments.</li>
            <li><strong>Laboratory Staff:</strong> Process incoming test orders, record diagnostic metrics, and publish verified laboratory reports.</li>
            <li><strong>Pharmacists:</strong> Maintain medicine catalog, verify prescription orders, dispense pharmaceuticals, and track stock reorder thresholds.</li>
            <li><strong>Administrators:</strong> Monitor hospital operational metrics, audit user accounts, supervise pharmacy inventory, and manage system logs.</li>
          </ul>
        </section>

        <section aria-labelledby="contact-heading" style="margin-bottom: 2rem; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); border-radius: 12px; padding: 2.25rem; text-align: center;">
          <h2 id="contact-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.75rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.75rem;">
            Project Inquiries &amp; Support
          </h2>
          <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; max-width: 600px; margin: 0 auto 1.5rem;">
            For platform demonstrations, technical inquiries, or account verification support, connect with our administration team.
          </p>
          <p style="font-size: 1.1rem; font-weight: 600; color: #22d3ee; margin-bottom: 1.5rem;">
            Official Email: <a href="mailto:careflowofficial@gmail.com" style="color: #22d3ee; text-decoration: underline;">careflowofficial@gmail.com</a>
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a href="/contact" style="padding: 0.75rem 1.5rem; background: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Contact Support Page</a>
            <a href="/login" style="padding: 0.75rem 1.5rem; background: rgba(255, 255, 255, 0.08); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.15);">Sign In to Portal</a>
          </div>
        </section>
      </main>
    `
  },

  // 2. About Page (/about)
  {
    routes: ['/about', '/about/index.html', '/about.html'],
    title: 'About CareFlow – Smart Hospital Management System',
    metaDescription: 'Learn about CareFlow Hospital Management System, its mission to eliminate healthcare operational fragmentation, seven core clinical modules, and full-stack architecture.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/about',
    ogTitle: 'About CareFlow – Smart Hospital Management System',
    ogDescription: 'Learn about CareFlow Hospital Management System, its mission to eliminate healthcare operational fragmentation, seven core clinical modules, and full-stack architecture.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": "https://care-flow-hms-opal.vercel.app/about#webpage",
      "url": "https://care-flow-hms-opal.vercel.app/about",
      "name": "About CareFlow – Smart Hospital Management System",
      "description": "Comprehensive overview of CareFlow Hospital Management System: purpose, seven implemented clinical modules, and technology architecture.",
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "CareFlow HMS",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web Browser",
        "url": "https://care-flow-hms-opal.vercel.app/"
      }
    },
    bodyHtml: `
      <main style="max-width: 1140px; margin: 0 auto; padding: 3rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc;">
        <div style="margin-bottom: 3rem;">
          <span style="display: inline-block; padding: 0.35rem 0.85rem; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">
            About CareFlow-HMS
          </span>
          <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 1.25rem;">
            A Unified Platform for <span style="color: #22d3ee;">Modern Healthcare Operations</span>
          </h1>
          <p style="font-size: 1.15rem; color: #cbd5e1; line-height: 1.7; max-width: 820px;">
            CareFlow is an integrated hospital management system engineered to connect patients, clinicians, receptionists, laboratory technicians, pharmacists, and administrators into one collaborative clinical workflow.
          </p>
        </div>

        <section aria-labelledby="mission-heading" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.5rem; margin-bottom: 3rem;">
          <h2 id="mission-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: #f8fafc;">
            Why CareFlow Was Developed
          </h2>
          <p style="font-size: 1rem; color: #cbd5e1; line-height: 1.75; margin-bottom: 1.25rem;">
            Modern healthcare facilities frequently operate with disjointed software solutions: appointment bookings handled on paper ledgers or standalone spreadsheets, diagnostic orders tracked through manual slips, pharmacy stock recorded separately from patient prescriptions, and billing calculated with high risk of manual error.
          </p>
          <p style="font-size: 1rem; color: #cbd5e1; line-height: 1.75; margin-bottom: 1.5rem;">
            CareFlow was built to resolve this fragmentation. By establishing a central repository for clinical encounters, verified diagnostic metrics, digital prescriptions, and itemized invoices, CareFlow eliminates inter-departmental bottlenecks and ensures transparent, accountable patient care from registration to discharge.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;">
              <strong style="color: #22d3ee; display: block; margin-bottom: 0.35rem;">Single Source of Truth</strong>
              <span style="font-size: 0.9rem; color: #94a3b8;">Unified patient medical records accessible across authorized hospital departments.</span>
            </div>
            <div style="padding: 1rem; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;">
              <strong style="color: #2dd4bf; display: block; margin-bottom: 0.35rem;">Elimination of Paper Trails</strong>
              <span style="font-size: 0.9rem; color: #94a3b8;">End-to-end digital coordination between front-desk, doctor clinics, lab, and pharmacy.</span>
            </div>
            <div style="padding: 1rem; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;">
              <strong style="color: #38bdf8; display: block; margin-bottom: 0.35rem;">Financial Accountability</strong>
              <span style="font-size: 0.9rem; color: #94a3b8;">Transparent reconciliation of consultation fees, test orders, and medicine dispensing.</span>
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="modules-heading" style="margin-bottom: 3.5rem;">
          <h2 id="modules-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.85rem; font-weight: 800; color: #f8fafc; margin-bottom: 1.5rem;">
            Seven Core Implemented Modules
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #22d3ee; margin-bottom: 0.5rem; font-weight: 700;">1. Patient Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Patient registration with verified email OTP, demographic profiles, emergency contacts, consultation history, personal diagnostic reports, and digital prescriptions.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #2dd4bf; margin-bottom: 0.5rem; font-weight: 700;">2. Appointment Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Real-time appointment requests, intelligent doctor assignment mapped to reported clinical symptoms, status management (Pending, Confirmed, Completed, Cancelled), and queue tracking.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #38bdf8; margin-bottom: 0.5rem; font-weight: 700;">3. Doctor Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Physician schedule overview, outpatient clinical notes, diagnostic test ordering, electronic prescription authoring with dosage instructions, and patient query replies.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #c084fc; margin-bottom: 0.5rem; font-weight: 700;">4. Laboratory Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Test request intake from doctors, specimen tracking, quantitative and qualitative result entry, and verified diagnostic report generation viewable and downloadable by patients.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #fbbf24; margin-bottom: 0.5rem; font-weight: 700;">5. Pharmacy Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Pharmaceutical inventory catalog, stock count management with automatic depletion upon patient purchase or dispensing, expiry tracking, and prescription validation.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #34d399; margin-bottom: 0.5rem; font-weight: 700;">6. Billing Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Consolidated billing for consultation fees, laboratory diagnostics, and dispensed medicines. Front-desk payment recording and itemized receipts for transparent financial tracking.</p>
            </article>
            <article style="padding: 1.5rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px;">
              <h3 style="font-size: 1.2rem; color: #f87171; margin-bottom: 0.5rem; font-weight: 700;">7. User &amp; Role Management</h3>
              <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">Six-tier role-based access control protecting clinical records across Administrators, Doctors, Receptionists, Laboratory Staff, Pharmacists, and Patients with strict boundary enforcement.</p>
            </article>
          </div>
          <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic;">
            Note: CareFlow is designed for outpatient clinical operations; inpatient bed and ward management is deliberately excluded to maintain operational focus.
          </p>
        </section>

        <section aria-labelledby="arch-heading" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.5rem; margin-bottom: 3rem;">
          <h2 id="arch-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: #f8fafc;">
            Built with Proven Full-Stack Technology
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
            <div>
              <strong style="color: #22d3ee; display: block; margin-bottom: 0.25rem;">React.js Frontend</strong>
              <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6;">Create React App with React Router v6, responsive modular Glassmorphism CSS, and real-time theme switching (Slate, White, Black).</p>
            </div>
            <div>
              <strong style="color: #2dd4bf; display: block; margin-bottom: 0.25rem;">Django REST Framework</strong>
              <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6;">Python 3.12 backend providing RESTful API endpoints, request validation, serialized payloads, and granular permission enforcement.</p>
            </div>
            <div>
              <strong style="color: #38bdf8; display: block; margin-bottom: 0.25rem;">PostgreSQL Database</strong>
              <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6;">ACID-compliant relational database ensuring referential integrity across appointments, clinical encounters, lab tests, and inventory.</p>
            </div>
            <div>
              <strong style="color: #34d399; display: block; margin-bottom: 0.25rem;">Brevo Transactional Email</strong>
              <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6;">Automated email notifications and one-time password (OTP) verification codes dispatched from verified careflowofficial@gmail.com.</p>
            </div>
          </div>
        </section>

        <div style="text-align: center; margin-top: 2rem;">
          <a href="/login" style="display: inline-block; padding: 0.85rem 1.75rem; background: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 1rem;">Sign In to Portal</a>
          <a href="/register" style="display: inline-block; padding: 0.85rem 1.75rem; background: rgba(255, 255, 255, 0.08); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.15);">Register as Patient</a>
        </div>
      </main>
    `
  },

  // 3. Contact Page (/contact)
  {
    routes: ['/contact', '/contact/index.html', '/contact.html'],
    title: 'Contact CareFlow Support – Hospital Management System',
    metaDescription: 'Contact the CareFlow Hospital Management System support desk for platform inquiries, technical assistance, and demonstration requests. Official email: careflowofficial@gmail.com.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/contact',
    ogTitle: 'Contact CareFlow Support – Hospital Management System',
    ogDescription: 'Contact the CareFlow Hospital Management System support desk for platform inquiries, technical assistance, and demonstration requests. Official email: careflowofficial@gmail.com.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "@id": "https://care-flow-hms-opal.vercel.app/contact#webpage",
      "url": "https://care-flow-hms-opal.vercel.app/contact",
      "name": "Contact CareFlow Support",
      "description": "Official contact and communication channels for CareFlow Hospital Management System.",
      "mainEntity": {
        "@type": "Organization",
        "name": "CareFlow Hospital Management System Project",
        "email": "careflowofficial@gmail.com",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "careflowofficial@gmail.com",
          "contactType": "technical support",
          "availableLanguage": "English"
        }
      }
    },
    bodyHtml: `
      <main style="max-width: 1140px; margin: 0 auto; padding: 3rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc;">
        <div style="margin-bottom: 3rem; text-align: center;">
          <span style="display: inline-block; padding: 0.35rem 0.85rem; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">
            Support &amp; Communications
          </span>
          <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 1rem;">
            Get in Touch with <span style="color: #22d3ee;">CareFlow Support</span>
          </h1>
          <p style="font-size: 1.15rem; color: #cbd5e1; line-height: 1.65; max-width: 720px; margin: 0 auto;">
            Have technical questions about CareFlow, need portal access assistance, or looking to schedule a platform demonstration? Send our team a message or reach us directly.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 2rem;">
          <section aria-labelledby="channels-heading" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.25rem;">
            <h2 id="channels-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 1.25rem; color: #f8fafc;">
              Project Contact Channels
            </h2>
            <div style="margin-bottom: 1.5rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 0.25rem; letter-spacing: 0.05em;">Official Support Email</span>
              <a href="mailto:careflowofficial@gmail.com" style="font-size: 1.15rem; font-weight: 700; color: #22d3ee; text-decoration: none;">careflowofficial@gmail.com</a>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.35rem; line-height: 1.5;">Monitored for administrative, technical, and patient account verification inquiries.</p>
            </div>
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1.25rem; margin-bottom: 1.5rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 0.25rem; letter-spacing: 0.05em;">Operational Support Hours</span>
              <strong style="color: #f8fafc; font-size: 0.95rem; display: block;">Monday – Saturday: 8:00 AM – 8:00 PM</strong>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.35rem; line-height: 1.5;">Front desk and receptionist queues run according to clinical consultation schedules.</p>
            </div>
            <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1.25rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 0.25rem; letter-spacing: 0.05em;">Registered Portal Patients</span>
              <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">Registered patients can view prescriptions, download lab test reports, and submit doctor feedback directly from within their authenticated patient dashboard.</p>
              <div style="margin-top: 0.75rem;">
                <a href="/login" style="color: #22d3ee; font-weight: 600; text-decoration: none; font-size: 0.9rem;">Sign In to Portal &rarr;</a>
              </div>
            </div>
          </section>

          <section aria-labelledby="inquiry-heading" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.25rem;">
            <h2 id="inquiry-heading" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #f8fafc;">
              Send an Inquiry
            </h2>
            <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 1.5rem;">The interactive contact form is available directly in the client application:</p>
            <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 1.25rem; font-size: 0.9rem; color: #cbd5e1; line-height: 1.7;">
              <p style="margin-bottom: 0.5rem;"><strong>Supported Inquiry Types:</strong></p>
              <ul style="padding-left: 1.25rem; margin-bottom: 1rem;">
                <li>General Project &amp; Architecture Information</li>
                <li>Patient Portal &amp; Appointment Scheduling</li>
                <li>Doctor &amp; Clinical Operations</li>
                <li>Laboratory Diagnostics Workflow</li>
                <li>Pharmacy &amp; Medication Stock Inquiries</li>
                <li>Billing &amp; Payment Reconciliations</li>
              </ul>
              <p>For urgent operational assistance, please contact <a href="mailto:careflowofficial@gmail.com" style="color: #22d3ee;">careflowofficial@gmail.com</a>.</p>
            </div>
          </section>
        </div>
      </main>
    `
  },

  // 4. Privacy Policy (/privacy)
  {
    routes: ['/privacy', '/privacy/index.html', '/privacy.html', '/privacy-policy', '/privacy-policy/index.html', '/privacy-policy.html'],
    title: 'Privacy Policy – CareFlow Hospital Management System',
    metaDescription: 'CareFlow Hospital Management System privacy policy detailing clinical health records protection, PBKDF2 password hashing, TLS encryption, and six-tier role-based access control.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/privacy',
    ogTitle: 'CareFlow Privacy Policy',
    ogDescription: 'CareFlow Hospital Management System privacy policy detailing clinical health records protection, PBKDF2 password hashing, TLS encryption, and six-tier role-based access control.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://care-flow-hms-opal.vercel.app/privacy#webpage",
      "url": "https://care-flow-hms-opal.vercel.app/privacy",
      "name": "CareFlow Privacy Policy",
      "description": "Privacy policy outlining data collection, clinical record safeguards, and role-based confidentiality in CareFlow."
    },
    bodyHtml: `
      <main style="max-width: 960px; margin: 0 auto; padding: 3rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc;">
        <div style="margin-bottom: 2.5rem;">
          <span style="display: inline-block; padding: 0.35rem 0.85rem; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">
            Data Protection &amp; Confidentiality
          </span>
          <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 0.75rem;">
            CareFlow Privacy Policy
          </h1>
          <p style="font-size: 0.95rem; color: #94a3b8; margin-bottom: 0.75rem;">
            Last Updated: November 2026 • CareFlow Hospital Management System Project
          </p>
          <p style="font-size: 1.05rem; color: #cbd5e1; line-height: 1.65;">
            This Privacy Policy describes how the CareFlow Hospital Management System collects, uses, protects, and manages personal, administrative, and clinical healthcare information across its applications and services.
          </p>
        </div>

        <article style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.5rem; line-height: 1.75; font-size: 0.95rem; color: #cbd5e1;">
          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">1. Overview and Scope</h2>
            <p>CareFlow operates as a centralized hospital management system intended for authorized healthcare providers, clinical staff, administrators, and patients. Because CareFlow processes sensitive medical and appointment records, we enforce strict technical and operational confidentiality measures across every system tier.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">2. Information We Collect</h2>
            <p style="margin-bottom: 0.75rem;">CareFlow collects only the data necessary to provide effective hospital administration and clinical care continuity:</p>
            <ul style="padding-left: 1.5rem; margin-bottom: 0.5rem;">
              <li><strong style="color: #f8fafc;">Account &amp; Identity Data:</strong> Full name, verified email address, contact telephone number, date of birth, gender, and securely salted/hashed passwords.</li>
              <li><strong style="color: #f8fafc;">Clinical Healthcare Records:</strong> Outpatient consultation summaries, doctor diagnostic notes, medical symptom classifications, ordered laboratory tests, and digital prescription dosage instructions.</li>
              <li><strong style="color: #f8fafc;">Laboratory Findings:</strong> Specimen collection records, quantitative biometric metrics, clinical reference intervals, and verified laboratory conclusion reports.</li>
              <li><strong style="color: #f8fafc;">Billing &amp; Transaction Details:</strong> Itemized fee records for consultations, pharmacy dispensations, and diagnostic tests, along with payment status timestamps.</li>
            </ul>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">3. Purpose of Information Processing</h2>
            <ul style="padding-left: 1.5rem;">
              <li>Coordinating patient appointment booking and physician queue management.</li>
              <li>Authorizing and dispensing verified prescriptions through the hospital pharmacy inventory.</li>
              <li>Conducting diagnostic tests and releasing verified lab reports directly to the requesting physician and patient.</li>
              <li>Delivering automated transactional emails, including registration one-time passwords (OTP) via the Brevo Email API.</li>
              <li>Reconciling financial receipts and maintaining transparent hospital audit trails.</li>
            </ul>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">4. Access Restrictions &amp; Role-Based Security</h2>
            <p>CareFlow enforces strict Role-Based Access Control (RBAC) at both the API and database levels: Patients access only their own medical records; Doctors access assigned clinical queues and author prescriptions; Laboratory staff handle test metrics; Pharmacists manage medicine inventory; Receptionists coordinate front-desk queues; Administrators audit system operational logs.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">5. Data Protection &amp; Technical Safeguards</h2>
            <p>All passwords are encrypted with PBKDF2 and SHA-256 with per-user salts. All web traffic is transmitted exclusively over HTTPS with TLS 1.2+ encryption. Data is isolated within a managed PostgreSQL database with referential integrity. We never monetize, rent, or disclose medical data to third-party advertisers or data brokers.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">6. Patient and User Rights</h2>
            <p>Patients have the full right to review historical consultation notes, download verified diagnostic lab reports in PDF format, update contact details, and request account deactivation.</p>
          </section>

          <section>
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">7. Privacy Inquiries &amp; Contact</h2>
            <p>For questions regarding health data protection in CareFlow, email: <a href="mailto:careflowofficial@gmail.com" style="color: #22d3ee; text-decoration: underline;">careflowofficial@gmail.com</a>.</p>
          </section>
        </article>
      </main>
    `
  },

  // 5. Terms and Conditions (/terms)
  {
    routes: ['/terms', '/terms/index.html', '/terms.html', '/terms-and-conditions', '/terms-and-conditions/index.html', '/terms-and-conditions.html'],
    title: 'Terms and Conditions – CareFlow Hospital Management System',
    metaDescription: 'Terms and conditions for CareFlow Hospital Management System. Guidelines on authorized access, medical disclaimer, account security, and acceptable clinical software use.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/terms',
    ogTitle: 'CareFlow Terms and Conditions',
    ogDescription: 'Terms and conditions for CareFlow Hospital Management System. Guidelines on authorized access, medical disclaimer, account security, and acceptable clinical software use.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://care-flow-hms-opal.vercel.app/terms#webpage",
      "url": "https://care-flow-hms-opal.vercel.app/terms",
      "name": "CareFlow Terms and Conditions",
      "description": "Terms of service and operational guidelines for CareFlow Hospital Management System."
    },
    bodyHtml: `
      <main style="max-width: 960px; margin: 0 auto; padding: 3rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc;">
        <div style="margin-bottom: 2.5rem;">
          <span style="display: inline-block; padding: 0.35rem 0.85rem; background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">
            Operational Guidelines &amp; Policies
          </span>
          <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 0.75rem;">
            CareFlow Terms and Conditions
          </h1>
          <p style="font-size: 0.95rem; color: #94a3b8; margin-bottom: 0.75rem;">
            Last Updated: November 2026 • CareFlow Hospital Management System Project
          </p>
          <p style="font-size: 1.05rem; color: #cbd5e1; line-height: 1.65;">
            Please read these Terms and Conditions carefully before accessing or using the CareFlow Hospital Management System application and associated clinical portals.
          </p>
        </div>

        <article style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2.5rem; line-height: 1.75; font-size: 0.95rem; color: #cbd5e1;">
          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">1. Acceptance of Terms</h2>
            <p>By registering an account, logging in, or otherwise accessing any portal of the CareFlow Hospital Management System, you agree to be bound by these Terms and Conditions. These terms govern all user tiers, including Patients, Doctors, Receptionists, Laboratory Staff, Pharmacists, and Administrators.</p>
          </section>

          <section style="margin-bottom: 2rem; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 1.25rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; color: #fbbf24; font-weight: 700; margin-bottom: 0.5rem;">2. Clinical &amp; Medical Disclaimer</h2>
            <p style="margin-bottom: 0.5rem;">CareFlow is an administrative workflow and electronic documentation software application. CareFlow is <strong>NOT</strong> a medical diagnosis engine and does not provide autonomous clinical advice, treatment prescriptions, or medical emergency dispatch.</p>
            <p>All clinical notes, diagnoses, laboratory test requests, and pharmaceutical prescriptions recorded in CareFlow represent the independent professional judgment of the licensed treating physician. For medical emergencies, contact emergency services immediately.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">3. Authorized Access &amp; Account Security</h2>
            <p>Users must maintain confidential account credentials and OTP verification codes. Users must operate only within their assigned role permissions. Attempting to bypass role-based security boundaries or impersonate medical personnel is strictly prohibited.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">4. Acceptable Use Policy</h2>
            <p>Prohibited activities include: attempting unauthorized elevation of privileges, automated scraping of clinical databases, entering falsified patient or diagnostic records, and reverse engineering authentication routines.</p>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">5. System Availability &amp; Maintenance</h2>
            <p>CareFlow targets continuous, high-availability service for hospital operations. Scheduled maintenance, database optimizations, and hosting infrastructure updates may occasionally be conducted with advance notice.</p>
          </section>

          <section>
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.75rem;">6. Inquiries Regarding Terms</h2>
            <p>For questions concerning these terms and operational guidelines, contact: <a href="mailto:careflowofficial@gmail.com" style="color: #22d3ee; text-decoration: underline;">careflowofficial@gmail.com</a>.</p>
          </section>
        </article>
      </main>
    `
  },

  // 6. Login Page (/login)
  {
    routes: ['/login', '/login/index.html', '/login.html'],
    title: 'Sign In – CareFlow Hospital Management System',
    metaDescription: 'Secure sign-in portal for CareFlow Hospital Management System. Access authorized dashboards for Administrators, Doctors, Receptionists, Laboratory Staff, Pharmacists, and Patients.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/login',
    ogTitle: 'Sign In – CareFlow Hospital Management System',
    ogDescription: 'Access your secure CareFlow portal for clinical appointments, prescriptions, laboratory diagnostics, and administrative workflows.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": "https://care-flow-hms-opal.vercel.app/login",
      "name": "Sign In to CareFlow Portal"
    },
    bodyHtml: `
      <main style="max-width: 600px; margin: 0 auto; padding: 4rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc; text-align: center;">
        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 2.2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.75rem;">
          Sign In to CareFlow Portal
        </h1>
        <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem;">
          Welcome back to CareFlow Hospital Management System. Enter your registered email address and password to access your role-based clinical dashboard.
        </p>
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2rem; text-align: left; margin-bottom: 2rem;">
          <h2 style="font-size: 1.1rem; color: #22d3ee; margin-bottom: 0.75rem;">Supported Access Roles</h2>
          <ul style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.8; padding-left: 1.25rem;">
            <li><strong>Patient:</strong> Appointments, prescriptions, lab results, feedback</li>
            <li><strong>Doctor:</strong> Clinical queues, consultations, prescriptions, lab orders</li>
            <li><strong>Receptionist:</strong> Patient registration, queue check-ins, payments</li>
            <li><strong>Laboratory Staff:</strong> Test requests, sample intake, diagnostic reports</li>
            <li><strong>Pharmacist:</strong> Medicine stock inventory, prescription dispensing</li>
            <li><strong>Administrator:</strong> Hospital operational metrics, user governance</li>
          </ul>
        </div>
        <p style="color: #94a3b8; font-size: 0.9rem;">
          Don't have an account? <a href="/register" style="color: #22d3ee; font-weight: 600;">Register as a Patient</a>
        </p>
      </main>
    `
  },

  // 7. Register Page (/register)
  {
    routes: ['/register', '/register/index.html', '/register.html'],
    title: 'Register as Patient – CareFlow Hospital Management System',
    metaDescription: 'Register as a new patient on CareFlow Hospital Management System. Create an account to book doctor appointments, track prescriptions, and view diagnostic laboratory test reports.',
    canonicalUrl: 'https://care-flow-hms-opal.vercel.app/register',
    ogTitle: 'Register as Patient – CareFlow Hospital Management System',
    ogDescription: 'Register as a new patient on CareFlow Hospital Management System. Create an account to book doctor appointments, track prescriptions, and view diagnostic laboratory test reports.',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": "https://care-flow-hms-opal.vercel.app/register",
      "name": "Register as Patient – CareFlow HMS"
    },
    bodyHtml: `
      <main style="max-width: 600px; margin: 0 auto; padding: 4rem 1.5rem; font-family: 'Inter', sans-serif; color: #f8fafc; text-align: center;">
        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 2.2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.75rem;">
          Register as a Patient
        </h1>
        <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem;">
          Create your CareFlow patient profile to schedule consultations with specialized physicians, track medical appointments, view electronic prescriptions, and access verified laboratory reports.
        </p>
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 2rem; text-align: left; margin-bottom: 2rem;">
          <h2 style="font-size: 1.1rem; color: #22d3ee; margin-bottom: 0.75rem;">Registration Requirements</h2>
          <ul style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.8; padding-left: 1.25rem;">
            <li>Full legal name and contact phone number</li>
            <li>Valid email address (requires Brevo OTP verification)</li>
            <li>Date of birth and gender for clinical records</li>
            <li>Secure password (minimum 8 characters)</li>
          </ul>
        </div>
        <p style="color: #94a3b8; font-size: 0.9rem;">
          Already registered? <a href="/login" style="color: #22d3ee; font-weight: 600;">Sign in to your portal</a>
        </p>
      </main>
    `
  }
];

// Helper to count words in generated HTML (excluding tags)
function getWordCount(htmlString) {
  const plainText = htmlString.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.split(' ').filter(Boolean).length;
}

// Generate static HTML for each page specification
let totalGenerated = 0;
const report = [];

pages.forEach((page) => {
  // Construct full HTML by injecting page metadata and body into base HTML
  let outputHtml = baseHtml;

  // 1. Update Title
  outputHtml = outputHtml.replace(/<title>.*?<\/title>/is, `<title>${page.title}</title>`);

  // 2. Update Meta Description
  if (outputHtml.includes('name="description"')) {
    outputHtml = outputHtml.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/is,
      `<meta name="description" content="${page.metaDescription}"/>`
    );
  } else {
    outputHtml = outputHtml.replace('</head>', `<meta name="description" content="${page.metaDescription}"/>\n</head>`);
  }

  // 3. Update Canonical URL
  if (outputHtml.includes('rel="canonical"')) {
    outputHtml = outputHtml.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is,
      `<link rel="canonical" href="${page.canonicalUrl}"/>`
    );
  } else {
    outputHtml = outputHtml.replace('</head>', `<link rel="canonical" href="${page.canonicalUrl}"/>\n</head>`);
  }

  // 4. Update Open Graph Title, Description, and URL
  outputHtml = outputHtml.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is,
    `<meta property="og:title" content="${page.ogTitle}"/>`
  );
  outputHtml = outputHtml.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is,
    `<meta property="og:description" content="${page.ogDescription}"/>`
  );
  outputHtml = outputHtml.replace(
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is,
    `<meta property="og:url" content="${page.canonicalUrl}"/>`
  );
  outputHtml = outputHtml.replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is,
    `<meta name="twitter:title" content="${page.ogTitle}"/>`
  );
  outputHtml = outputHtml.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is,
    `<meta name="twitter:description" content="${page.ogDescription}"/>`
  );

  // 5. Update JSON-LD Structured Data
  if (page.jsonLd) {
    const jsonLdString = JSON.stringify(page.jsonLd, null, 2);
    if (outputHtml.includes('application/ld+json')) {
      outputHtml = outputHtml.replace(
        /<script type="application\/ld\+json">.*?<\/script>/is,
        `<script type="application/ld+json">${jsonLdString}</script>`
      );
    } else {
      outputHtml = outputHtml.replace(
        '</head>',
        `<script type="application/ld+json">${jsonLdString}</script>\n</head>`
      );
    }
  }

  // 6. Update Root Shell with full semantic crawlable HTML
  const fullRootContent = `
    <div id="root">
      ${sharedHeader}
      ${page.bodyHtml}
      ${sharedFooter}
    </div>
  `;

  outputHtml = outputHtml.replace(/<div id="root">.*?<\/div>/is, fullRootContent.trim());

  // 7. Update noscript fallback
  const noscriptFallback = `
    <noscript>
      <div style="padding: 1.5rem; text-align: center; color: #f8fafc; font-family: sans-serif; background: #090e1a;">
        <h2>JavaScript is Recommended</h2>
        <p>CareFlow-HMS interactive portal features require JavaScript. However, you can review public documentation and information directly above.</p>
      </div>
    </noscript>
  `;
  outputHtml = outputHtml.replace(/<noscript>.*?<\/noscript>/is, noscriptFallback.trim());

  const wordCount = getWordCount(outputHtml);

  // Write out to all assigned file paths
  page.routes.forEach((route) => {
    let targetPath;
    if (route === '/' || route === '/index.html') {
      targetPath = path.join(buildDir, 'index.html');
    } else if (route.endsWith('.html')) {
      targetPath = path.join(buildDir, route.replace(/^\//, ''));
    } else {
      targetPath = path.join(buildDir, route.replace(/^\//, ''), 'index.html');
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, outputHtml, 'utf8');
    totalGenerated++;
  });

  report.push({
    title: page.title,
    canonical: page.canonicalUrl,
    wordCount: wordCount,
    routes: page.routes.join(', ')
  });
});

console.log(`\n======================================================`);
console.log(`[Prerender] Successfully generated ${totalGenerated} static HTML targets!`);
console.log(`======================================================`);
report.forEach((item) => {
  console.log(`- ${item.canonical}`);
  console.log(`  Title:      ${item.title}`);
  console.log(`  Word Count: ${item.wordCount} words (Crawlable)`);
  console.log(`  Files:      ${item.routes}\n`);
});

