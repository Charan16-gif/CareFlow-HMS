import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable GlassCard Container with backdrop blur and customizable elevation
 */
const GlassCard = ({
  children,
  className = '',
  hoverEffect = true,
  glowColor = 'cyan', // 'cyan', 'teal', 'none'
  style = {},
  onClick,
}) => {
  const glowStyles = {
    cyan: 'var(--glow-cyan)',
    teal: 'var(--glow-teal)',
    none: 'none',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card ${className}`}
      style={{
        boxShadow: glowStyles[glowColor] || undefined,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

GlassCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hoverEffect: PropTypes.bool,
  glowColor: PropTypes.oneOf(['cyan', 'teal', 'none']),
  style: PropTypes.object,
  onClick: PropTypes.func,
};

export default GlassCard;
