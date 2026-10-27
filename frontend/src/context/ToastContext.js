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
let lastToastKey = '';
let lastToastTime = 0;

export const toast = {
  show: (type, message, title = '', duration = 4500) => {
    if (!message) return;
    const strMsg = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
    const now = Date.now();
    const key = `${type}:${strMsg}`;
    if (key === lastToastKey && (now - lastToastTime) < 1500) {
      return; // Deduplicate rapid identical toasts
    }
    lastToastKey = key;
    lastToastTime = now;

    toastListeners.forEach((listener) =>
      listener({ type, message: strMsg, title, duration, id: now + Math.random() })
    );
  },
  success: (message, title = '', duration = 4500) => {
    toast.show('success', message, title || 'Success', duration);
  },
  error: (message, title = '', duration = 5000) => {
    toast.show('error', message, title || 'Error', duration);
  },
  info: (message, title = '', duration = 4500) => {
    toast.show('info', message, title || 'Info', duration);
  },
  warning: (message, title = '', duration = 4500) => {
    toast.show('warning', message, title || 'Warning', duration);
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastItem) => {
    setToasts((prev) => [...prev, toastItem]);
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
        <ToastItem key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
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

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 280);
  }, [onDismiss]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingRef.current);
  }, [handleDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
          className="careflow-toast-close"
          onClick={handleDismiss}
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
