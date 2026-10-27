import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import GlassCard from '../components/common/GlassCard';
import { Home, AlertCircle } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem 1rem',
      }}
    >
      <GlassCard
        style={{
          maxWidth: '480px',
          textAlign: 'center',
          padding: '2.5rem',
        }}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" animated={false} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', marginBottom: '0.5rem' }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600 }}>404 — Page Not Found</span>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The requested clinical section or route does not exist in the CareFlow-HMS system.
        </p>

        <Link to="/" className="glass-btn glass-btn-primary">
          <Home size={16} />
          Return to Overview
        </Link>
      </GlassCard>
    </div>
  );
};

export default NotFoundPage;
