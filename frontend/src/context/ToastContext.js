import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

const ToastContext = createContext(null);

// Global event bus so toast can be triggered from anywhere (even non-component files)
const toastListeners = new Set();
const recentToastHistory = new Map(); // key -> timestamp for deduplication

export const toast = {
  show: (type, message, title = '', duration = 4000) => {
    if (!message) return;
    const strMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
    const now = Date.now();
    const key = `${type}:${strMsg}`;

    // Deduplicate rapid identical toasts within a 3.5-second debounce window
    const lastTime = recentToastHistory.get(key) || 0;
    if (now - lastTime < 3500) {
      return;
    }
    recentToastHistory.set(key, now);

    // Prune stale history entries older than 10 seconds
    for (const [k, time] of recentToastHistory.entries()) {
      if (now - time > 10000) {
        recentToastHistory.delete(k);
      }
    }

    const uniqueId = `${now}-${Math.random().toString(36).substring(2, 9)}`;

    toastListeners.forEach((listener) =>
      listener({ type, message: strMsg, title, duration, id: uniqueId })
    );
  },
  success: (message, title = '', duration = 4000) => {
    toast.show('success', message, title || 'Success', duration);
  },
  error: (message, title = '', duration = 5000) => {
    toast.show('error', message, title || 'Error', duration);
  },
  info: (message, title = '', duration = 4000) => {
    toast.show('info', message, title || 'Info', duration);
  },
  warning: (message, title = '', duration = 4000) => {
    toast.show('warning', message, title || 'Warning', duration);
  },
  clearHistory: () => {
    recentToastHistory.clear();
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastItem) => {
    setToasts((prev) => {
      // 1. If an exact duplicate message + type is currently visible, do not stack another copy
      const alreadyVisible = prev.some(
        (t) => t.type === toastItem.type && t.message === toastItem.message
      );
      if (alreadyVisible) {
        return prev;
      }
      // 2. Limit maximum visible toasts to 4 so they never overwhelm the screen
      const next = prev.length >= 4 ? prev.slice(prev.length - 3) : prev;
      return [...next, toastItem];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    toastListeners.add(addToast);
    return () => {
      toastListeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, showToast: toast.show, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast,
      showToast: toast.show,
      removeToast: () => {},
    };
  }
  return context;
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return createPortal(
    <div
      className="careflow-toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
};

const ToastItem = ({ item, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(item.duration);
  const isDismissedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const triggerDismiss = useCallback(() => {
    if (isDismissedRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsExiting(true);
    setTimeout(() => {
      if (!isDismissedRef.current) {
        isDismissedRef.current = true;
        onDismissRef.current(item.id);
      }
    }, 220);
  }, [item.id]);

  const handleCloseClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    triggerDismiss();
  };

  const startTimer = useCallback(() => {
    if (isDismissedRef.current) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      triggerDismiss();
    }, remainingRef.current);
  }, [triggerDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  useEffect(() => {
    if (!isPaused && !isDismissedRef.current) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, startTimer]);

  const getIcon = () => {
    switch (item.type) {
      case 'success':
        return <CheckCircle2 size={16} className="careflow-toast-icon success" />;
      case 'error':
        return <AlertCircle size={16} className="careflow-toast-icon error" />;
      case 'warning':
        return <AlertTriangle size={16} className="careflow-toast-icon warning" />;
      case 'info':
      default:
        return <Info size={16} className="careflow-toast-icon info" />;
    }
  };

  return (
    <div
      className={`careflow-toast-card careflow-toast-${item.type} ${isExiting ? 'exiting' : 'entering'}`}
      onMouseEnter={() => {
        setIsPaused(true);
        clearTimer();
      }}
      onMouseLeave={() => {
        setIsPaused(false);
      }}
    >
      <div className="careflow-toast-content">
        <div className="careflow-toast-icon-wrap">{getIcon()}</div>
        <div className="careflow-toast-text">
          {item.title && <h5 className="careflow-toast-title">{item.title}</h5>}
          <p className="careflow-toast-msg">{item.message}</p>
        </div>
        <button
          type="button"
          className="careflow-toast-close"
          onClick={handleCloseClick}
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>
      <div
        className="careflow-toast-progress"
        style={{
          animationDuration: `${item.duration}ms`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      />
    </div>
  );
};
