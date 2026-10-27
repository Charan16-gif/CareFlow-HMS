import React from 'react';
import PropTypes from 'prop-types';

/**
 * CareFlow-HMS Reusable Vital-Sign / ECG Logo Component
 * Shared brand mark used across Navbar, Dashboard, Login, Loading, and Headers.
 */
const Logo = ({
  size = 'md',
  showText = true,
  animated = false,
  className = '',
  light = false,
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-sm', badge: 'text-xs' },
    md: { icon: 38, text: 'text-lg', badge: 'text-xs' },
    lg: { icon: 52, text: 'text-2xl', badge: 'text-sm' },
    xl: { icon: 68, text: 'text-3xl', badge: 'text-base' },
  };

  const config = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`careflow-logo-container ${animated ? 'pulse-vital' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '0.5rem' : '0.75rem',
        userSelect: 'none',
      }}
    >
      {/* Vital-Sign ECG SVG Icon */}
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="cfLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="cfLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Backing */}
        <rect x="12" y="12" width="136" height="136" rx="36" fill="rgba(6, 182, 212, 0.15)" />

        {/* Glass Container */}
        <rect
          x="16"
          y="16"
          width="128"
          height="128"
          rx="32"
          fill="#0f172a"
          fillOpacity="0.88"
          stroke="url(#cfLogoGrad)"
          strokeWidth="3"
        />

        {/* Subtle Clinical Cross */}
        <path d="M72 40h16v16h16v16h-16v16H72V72H56V56h16V40z" fill="#06b6d4" fillOpacity="0.1" />

        {/* Outer Glow Pulse */}
        <path
          d="M28 84h26l8-18 10 34 12-42 10 30 7-12 5 8h26"
          stroke="#38bdf8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cfLogoGlow)"
          opacity="0.5"
        />

        {/* Crisp ECG Rhythm Trace */}
        <path
          d="M28 84h26l8-18 10 34 12-42 10 30 7-12 5 8h26"
          stroke="url(#cfLogoGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Vital Heartbeat Dot */}
        <circle cx="132" cy="84" r="5" fill="#22d3ee" filter="url(#cfLogoGlow)" />
        <circle cx="132" cy="84" r="2.5" fill="#ffffff" />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              className="careflow-brand-title-text"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: light ? '#ffffff' : 'var(--heading-color)',
                fontSize: size === 'sm' ? '1.1rem' : size === 'lg' ? '1.75rem' : size === 'xl' ? '2.1rem' : '1.35rem',
                letterSpacing: '-0.03em',
                textShadow: light ? '0 2px 10px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              Care<span className="careflow-brand-title-highlight" style={{ color: light ? '#38bdf8' : 'var(--primary-cyan)' }}>Flow</span>
            </span>
            <span
              className="careflow-brand-badge"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '0.12rem 0.4rem',
                borderRadius: '6px',
                background: light ? 'rgba(56, 189, 248, 0.25)' : 'rgba(6, 182, 212, 0.16)',
                color: light ? '#bae6fd' : 'var(--primary-cyan-light)',
                border: light ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(6, 182, 212, 0.35)',
                textTransform: 'uppercase',
              }}
            >
              HMS
            </span>
          </div>
          {size !== 'sm' && (
            <span
              className="careflow-brand-subtitle"
              style={{
                fontSize: '0.72rem',
                color: light ? '#f1f5f9' : 'var(--text-muted)',
                letterSpacing: '0.03em',
                fontWeight: light ? 600 : 500,
                marginTop: '2px',
                textShadow: light ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              Hospital Management System
            </span>
          )}
        </div>
      )}
    </div>
  );
};

Logo.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  showText: PropTypes.bool,
  animated: PropTypes.bool,
  className: PropTypes.string,
  light: PropTypes.bool,
};

export default Logo;
