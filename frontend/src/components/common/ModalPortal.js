import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * CareFlow-HMS ModalPortal
 * Mounts modals directly to document.body via React Portal.
 * Guarantees:
 * 1. Modal is centered dead in the middle of the entire viewport.
 * 2. Full-screen backdrop (100vw x 100vh) covers sidebar, header, and all background content.
 * 3. All background elements are completely unaccessed / inactive.
 * 4. Body scroll is automatically locked while open.
 */
const ModalPortal = ({ isOpen = true, children }) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-active-freeze');

      // Make background #root inert and unaccessible
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.setAttribute('aria-hidden', 'true');
        if ('inert' in rootEl) {
          rootEl.inert = true;
        }
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('modal-active-freeze');
        if (rootEl) {
          rootEl.removeAttribute('aria-hidden');
          if ('inert' in rootEl) {
            rootEl.inert = false;
          }
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="careflow-modal-portal-root" role="presentation">
      {children}
    </div>,
    document.body
  );
};

export default ModalPortal;
