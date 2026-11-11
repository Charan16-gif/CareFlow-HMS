import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { Mail } from 'lucide-react';

const Footer = ({ showNavigation }) => {
  const location = useLocation();

  // Completely remove footer on login and registration pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const isHome = location.pathname === '/';
  const shouldShowNav =
    showNavigation !== undefined ? showNavigation : isHome;

  return (
    <footer
      className={`careflow-footer ${shouldShowNav ? '' : 'minimal'}`}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: shouldShowNav ? '2.5rem' : '0',
        }}
      >
        {/* Top Row: Brand & In-Page Section Links */}
        {shouldShowNav && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '2.5rem 2rem',
              alignItems: 'flex-start',
            }}
          >
            {/* Brand Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: 'span 1' }}>
              <Logo size="md" animated={false} />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                CareFlow is a hospital management system designed to simplify daily healthcare operations
                by connecting patients, doctors, receptionists, laboratory staff, pharmacists and administrators
                through one centralized platform.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <Mail size={15} color="var(--primary-cyan)" />
                <a
                  href="mailto:careflowofficial@gmail.com"
                  style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', textDecoration: 'none' }}
                >
                  careflowofficial@gmail.com
                </a>
              </div>
            </div>

            {/* Quick Section Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Navigation
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Link
                  to="/"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  About CareFlow
                </Link>
                <a
                  href={isHome ? '#services' : '/#services'}
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Hospital Services
                </a>
                <a
                  href={isHome ? '#how-it-works' : '/#how-it-works'}
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Hospital Workflow
                </a>
                <a
                  href={isHome ? '#our-team' : '/#our-team'}
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Supported Roles
                </a>
                <Link
                  to="/contact"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Legal & Compliance Policies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Legal &amp; Policy
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Link
                  to="/privacy"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Terms and Conditions
                </Link>
              </div>
            </div>

            {/* Quick Access Account Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Account Access
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Link
                  to="/login"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Sign In to Portal
                </Link>
                <Link
                  to="/register"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-teal-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Register as Patient
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Row: Copyright & Legal */}
        <div
          style={{
            borderTop: shouldShowNav ? '1px solid var(--glass-border-subtle)' : 'none',
            paddingTop: shouldShowNav ? '1.5rem' : '0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
            &copy; {new Date().getFullYear()} CareFlow-HMS. All rights reserved.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
            <span>Hospital Management System Project</span>
            <span>•</span>
            <Link to="/privacy" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
