import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Global counter of concurrently active modals.
 * Guarantees that body/html freeze is maintained as long as at least one modal is mounted.
 */
let activeModalCount = 0;
let originalHtmlOverflow = '';
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

/**
 * CareFlow-HMS ModalPortal
 * Mounts modals directly to document.body via React Portal.
 * Guarantees:
 * 1. Modal is centered dead in the middle of the entire viewport.
 * 2. Full-screen backdrop (100vw x 100vh) covers sidebar, header, and all background content.
 * 3. All background elements are completely unaccessed / inactive (aria-hidden and inert on #root).
 * 4. Background (html, body, #root, layout containers) is strictly frozen and CANNOT scroll.
 * 5. Full keyboard focus trapping (Tab / Shift+Tab cycling).
 * 6. Focus restoration upon modal unmount to the element that triggered it.
 * 7. Escape key handling when onClose callback is provided.
 * 8. Wheel and touchmove event trapping so scrolling only works inside the modal dialog.
 */
const ModalPortal = ({ isOpen = true, onClose, children }) => {
  const portalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;
    activeModalCount += 1;

    // Lock background on first opened modal
    if (activeModalCount === 1) {
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalBodyOverflow = document.body.style.overflow;
      originalBodyPaddingRight = document.body.style.paddingRight;

      // Compensate for disappearing scrollbar so layout doesn't shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('modal-active-freeze');
      document.body.classList.add('modal-active-freeze');

      // Make background #root inert and unaccessible
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.setAttribute('aria-hidden', 'true');
        if ('inert' in rootEl) {
          rootEl.inert = true;
        }
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

    // Keyboard handler for Esc, Tab cycling, and scroll key locking
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        e.preventDefault();
        onClose();
        return;
      }

      // Prevent keys like PageUp/PageDown/Space/Arrows from scrolling the backside
      const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
      if (scrollKeys.includes(e.key)) {
        const targetTag = document.activeElement?.tagName;
        const isEditable = document.activeElement?.isContentEditable;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || isEditable;
        const isInsideModal = portalRef.current && portalRef.current.contains(document.activeElement);

        if (!isInsideModal) {
          e.preventDefault();
        } else if (!isInput) {
          // If inside modal but not in an input, check if activeElement or its container is scrollable
          const scrollable = document.activeElement?.closest(
            '.admin-modal-body, .dash-modal-body, .receipt-modal-body, .doc-viewer-modal-body, .admin-modal-container, .dash-modal-content, [data-modal-scrollable="true"]'
          );
          if (!scrollable) {
            e.preventDefault();
          }
        }
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

    // Wheel event handler: allows scrolling strictly inside scrollable modal areas,
    // and completely prevents wheel from bubbling to the background page.
    const handleWheel = (e) => {
      if (!portalRef.current) return;
      const scrollable = e.target.closest(
        '.admin-modal-body, .dash-modal-body, .receipt-modal-body, .doc-viewer-modal-body, .admin-modal-container, .dash-modal-content, [data-modal-scrollable="true"]'
      );
      if (!scrollable) {
        // Cursor is over backdrop or non-scrollable area: prevent page scroll
        e.preventDefault();
        return;
      }

      // Check boundary inside scrollable modal container
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const isUp = e.deltaY < 0;
      const isDown = e.deltaY > 0;
      if ((isUp && scrollTop <= 0) || (isDown && scrollTop + clientHeight >= scrollHeight - 1)) {
        e.preventDefault();
      }
    };

    // Touch event handler: prevents touch-dragging the background
    const handleTouchMove = (e) => {
      if (!portalRef.current) return;
      const scrollable = e.target.closest(
        '.admin-modal-body, .dash-modal-body, .receipt-modal-body, .doc-viewer-modal-body, .admin-modal-container, .dash-modal-content, [data-modal-scrollable="true"]'
      );
      if (!scrollable) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);

      activeModalCount = Math.max(0, activeModalCount - 1);

      // Unfreeze background only when all modals are closed
      if (activeModalCount === 0) {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
        document.documentElement.classList.remove('modal-active-freeze');
        document.body.classList.remove('modal-active-freeze');

        const rootEl = document.getElementById('root');
        if (rootEl) {
          rootEl.removeAttribute('aria-hidden');
          if ('inert' in rootEl) {
            rootEl.inert = false;
          }
        }
      }

      // Restore focus to previous active element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
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
