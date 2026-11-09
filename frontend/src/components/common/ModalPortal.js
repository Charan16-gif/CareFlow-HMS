import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * CareFlow-HMS ModalPortal
 * Mounts modals directly to document.body via React Portal.
 * Guarantees:
 * 1. Modal is centered dead in the middle of the entire viewport.
 * 2. Full-screen backdrop (100vw x 100vh) covers sidebar, header, and all background content.
 * 3. All background elements are completely unaccessed / inactive (aria-hidden and inert on #root).
 * 4. Body scroll is automatically locked while open.
 * 5. Full keyboard focus trapping (Tab / Shift+Tab cycling).
 * 6. Focus restoration upon modal unmount to the element that triggered it.
 * 7. Escape key handling when onClose callback is provided.
 */
const ModalPortal = ({ isOpen = true, onClose, children }) => {
  const portalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
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

      // Auto-focus first focusable element inside modal
      const timer = setTimeout(() => {
        if (portalRef.current) {
          const focusable = portalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);

      // Keyboard handler for Esc and Tab cycling
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && typeof onClose === 'function') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Tab' && portalRef.current) {
          const focusableElements = Array.from(
            portalRef.current.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );

          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !portalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !portalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('modal-active-freeze');
        if (rootEl) {
          rootEl.removeAttribute('aria-hidden');
          if ('inert' in rootEl) {
            rootEl.inert = false;
          }
        }
        // Restore focus to previous active element
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div ref={portalRef} className="careflow-modal-portal-root" role="presentation">
      {children}
    </div>,
    document.body
  );
};

export default ModalPortal;
