import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, portalName = 'CareFlow HMS' }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={true}>
      <div
        className="admin-modal-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
      <div
        className="admin-modal-card admin-modal-card-danger logout-confirm-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', textAlign: 'center' }}
      >
        <div className="admin-modal-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', padding: '1rem 1.25rem 0' }}>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="Cancel sign out"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-modal-body" style={{ padding: '0 2rem 1.5rem', textAlign: 'center' }}>
          {/* Glowing Warning Icon Badge */}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem auto',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '2px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
            }}
          >
            <LogOut size={28} />
          </div>

          <h3
            id="logout-modal-title"
            className="admin-modal-title"
            style={{ fontSize: '1.35rem', marginBottom: '0.6rem' }}
          >
            Sign Out Confirmation
          </h3>

          <p
            style={{
              fontSize: '0.925rem',
              color: 'var(--admin-text-muted)',
              lineHeight: 1.55,
              margin: '0 auto',
            }}
          >
            Are you sure you want to end your current session? You will be signed out of the {portalName}.
          </p>
        </div>

        <div
          className="admin-modal-footer"
          style={{
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.25rem 2rem',
            background: 'var(--admin-surface-secondary)',
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            style={{ minWidth: '110px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={onConfirm}
            style={{
              minWidth: '130px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            autoFocus
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
};

export default LogoutConfirmModal;
