import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const Footer = ({ showNavigation }) => {
  const location = useLocation();
  const shouldShowNav =
    showNavigation !== undefined ? showNavigation : location.pathname === '/';

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
        {/* Top Row: Brand & In-Page Section Links (Only on Landing Page) */}
        {shouldShowNav && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '2rem',
            }}
          >
            {/* Brand Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxWidth: '420px' }}>
              <Logo size="md" animated={false} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                CareFlow is a modern hospital management system designed to bring patient records,
                appointments, laboratory tests, medicines, and billing together in one place.
              </p>
            </div>

            {/* Quick Section Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Navigation
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(110px, 1fr))',
                  gap: '0.65rem 1.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <a
                  href="#home"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Home
                </a>
                <a
                  href="#about"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  About
                </a>
                <a
                  href="#services"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Services
                </a>
                <a
                  href="#how-it-works"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  How It Works
                </a>
                <a
                  href="#our-team"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Our Team
                </a>
                <a
                  href="#contact"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Contact
                </a>
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
                  Login
                </Link>
                <Link
                  to="/register"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-teal-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Register
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

          <div style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
            Hospital Management System Project
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
