import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable StatusBadge with semantic states (success, info, warning, danger, neutral)
 */
const StatusBadge = ({
  status = 'info', // 'success', 'info', 'warning', 'danger', 'neutral'
  label,
  showDot = true,
  className = '',
}) => {
  const badgeClasses = {
    success: 'glass-badge-success',
    info: 'glass-badge-info',
    warning: 'glass-badge-warning',
    danger: 'glass-badge-danger',
    neutral: 'glass-badge',
  };

  const dotColors = {
    success: '#10b981',
    info: '#06b6d4',
    warning: '#f59e0b',
    danger: '#ef4444',
    neutral: '#94a3b8',
  };

  return (
    <span className={`glass-badge ${badgeClasses[status] || 'glass-badge-info'} ${className}`}>
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColors[status] || '#06b6d4',
            display: 'inline-block',
            boxShadow: `0 0 6px ${dotColors[status] || '#06b6d4'}`,
          }}
        />
      )}
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['success', 'info', 'warning', 'danger', 'neutral']),
  label: PropTypes.string.isRequired,
  showDot: PropTypes.bool,
  className: PropTypes.string,
};

export default StatusBadge;
