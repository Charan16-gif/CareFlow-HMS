import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Logo from './Logo';
import { logFrontendErrorToBackend } from '../../services/api';

/**
 * CareFlow HMS Application-Level React Error Boundary.
 * Catches JavaScript rendering errors in child component trees,
 * logs error telemetry to the backend, and presents an accessible,
 * themed Glassmorphism fallback interface with recovery controls.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Send error report to centralized backend logging endpoint
    logFrontendErrorToBackend({
      message: error?.message || String(error),
      stack: errorInfo?.componentStack || error?.stack || '',
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            background: 'var(--bg-main, #0a0e17)',
            color: 'var(--text-primary, #ffffff)',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem 2rem',
              borderRadius: '20px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
              background: 'var(--glass-bg, rgba(15, 23, 42, 0.8))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
              <Logo size="md" animated={false} />
            </div>

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                color: '#f87171',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary, #fff)',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-heading, "Plus Jakarta Sans", sans-serif)',
              }}
            >
              Application Encountered an Issue
            </h1>

            <p
              style={{
                fontSize: '0.925rem',
                color: 'var(--text-muted, #94a3b8)',
                marginBottom: '1.75rem',
                lineHeight: 1.6,
              }}
            >
              An unexpected component error occurred while rendering this view. Your medical
              data and active session are preserved safely. You may retry the action or return to the safe home view.
            </p>

            {isDev && this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '1.75rem',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                  overflowX: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#f87171' }}>
                  Technical Details (Development Mode)
                </summary>
                <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.85rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                className="admin-btn admin-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="admin-btn admin-btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  cursor: 'pointer',
                }}
              >
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="admin-btn admin-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

