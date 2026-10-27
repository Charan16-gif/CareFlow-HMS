import React from 'react';
import PropTypes from 'prop-types';

/**
 * Vital-sign themed medical loading indicator
 */
const LoadingSpinner = ({ size = 'md', message = 'Loading system data...' }) => {
  const sizePixels = {
    sm: 24,
    md: 40,
    lg: 56,
  }[size] || 40;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <div
        className="pulse-vital"
        style={{
          width: sizePixels,
          height: sizePixels,
          borderRadius: '50%',
          border: '3px solid rgba(6, 182, 212, 0.2)',
          borderTopColor: 'var(--primary-cyan)',
          borderRightColor: 'var(--primary-teal)',
          animation: 'spin 1s linear infinite',
        }}
      />
      {message && (
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.02em',
          }}
        >
          {message}
        </span>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  message: PropTypes.string,
};

export default LoadingSpinner;
