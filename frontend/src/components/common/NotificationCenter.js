import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Pill,
  FlaskConical,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  Shield,
  User,
  Clock,
  Inbox,
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import '../../styles/notificationCenter.css';

/**
 * Returns a human-friendly relative time string or formatted date.
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Maps notification_type to corresponding theme-aware icon & styling.
 */
const getNotificationTypeConfig = (type) => {
  switch (type) {
    case 'APPOINTMENT':
      return {
        icon: <Calendar size={18} />,
        colorClass: 'ntf-icon-appointment',
        badgeLabel: 'Appointment',
      };
    case 'PRESCRIPTION':
      return {
        icon: <Pill size={18} />,
        colorClass: 'ntf-icon-prescription',
        badgeLabel: 'Prescription',
      };
    case 'LAB_TEST':
      return {
        icon: <FlaskConical size={18} />,
        colorClass: 'ntf-icon-lab',
        badgeLabel: 'Lab Test',
      };
    case 'MEDICAL_QUERY':
      return {
        icon: <MessageSquare size={18} />,
        colorClass: 'ntf-icon-query',
        badgeLabel: 'Medical Query',
      };
    case 'PAYMENT':
      return {
        icon: <CreditCard size={18} />,
        colorClass: 'ntf-icon-payment',
        badgeLabel: 'Payment',
      };
    case 'MEDICINE_STOCK':
      return {
        icon: <AlertTriangle size={18} />,
        colorClass: 'ntf-icon-stock',
        badgeLabel: 'Stock Alert',
      };
    case 'ACCOUNT':
      return {
        icon: <User size={18} />,
        colorClass: 'ntf-icon-account',
        badgeLabel: 'Account',
      };
    case 'SYSTEM':
    default:
      return {
        icon: <Shield size={18} />,
        colorClass: 'ntf-icon-system',
        badgeLabel: 'System',
      };
  }
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const containerRef = useRef(null);
  const bellButtonRef = useRef(null);
  const panelRef = useRef(null);

  // Load unread count only
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.fetchUnreadCount();
      if (typeof count === 'number') {
        setUnreadCount(count);
      }
    } catch {
      // Quiet fail on network hiccup
    }
  }, []);

  // Load full notification history
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.fetchNotifications({
        unreadOnly: activeTab === 'unread',
      });
      setNotifications(data?.results || []);
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Initial load and periodic polling (every 25 seconds)
  useEffect(() => {
    refreshUnreadCount();

    const intervalId = setInterval(() => {
      refreshUnreadCount();
      // If panel is currently open, also refresh notifications list
      if (isOpen) {
        loadNotifications();
      }
    }, 25000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUnreadCount, loadNotifications, isOpen]);

  // When panel opens or activeTab changes, fetch notifications list
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, activeTab, loadNotifications]);

  // ========================================================
  // STRICT OPEN / CLOSE BEHAVIOR:
  // 1. Closes when clicking X button
  // 2. Closes when clicking anywhere outside
  // 3. Closes when clicking bell button again
  // 4. Closes when pressing Escape key
  // 5. Clicking inside the panel does NOT close it
  // ========================================================
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentMouseDown = (event) => {
      // If clicking inside container (bell or panel), do not treat as outside click
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Bell toggle handler
  const handleTogglePanel = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // Close panel handler for X button
  const handleClosePanel = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  // Mark single notification as read without closing panel
  const handleMarkAsRead = async (e, ntfId) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(ntfId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === ntfId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    if (actionInProgress || unreadCount === 0) return;
    setActionInProgress(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async (e) => {
    e.stopPropagation();
    if (actionInProgress || notifications.length === 0) return;
    setActionInProgress(true);
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  // Clicking an individual notification: marks as read, closes panel, and navigates
  const handleNotificationClick = async (ntf) => {
    if (!ntf.is_read) {
      try {
        await notificationService.markAsRead(ntf.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Silently continue navigation
      }
    }

    setIsOpen(false);

    if (ntf.action_url) {
      try {
        navigate(ntf.action_url);
      } catch (navErr) {
        console.warn('Navigation failed for notification:', navErr);
      }
    }
  };

  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="careflow-notification-wrapper" ref={containerRef}>
      {/* 1. Header Bell Icon Button */}
      <button
        ref={bellButtonRef}
        type="button"
        className={`admin-header-btn careflow-notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={handleTogglePanel}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      >
        <div className="careflow-bell-icon-wrapper">
          <Bell size={18} className={unreadCount > 0 ? 'bell-has-unread' : ''} />
          {unreadCount > 0 && (
            <span
              className="careflow-notification-badge"
              data-testid="notification-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* 2. Notification Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="careflow-notification-panel"
          role="dialog"
          aria-label="Notification Center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Panel Header */}
          <div className="careflow-notification-panel-header">
            <div className="careflow-ntf-header-title-row">
              <div className="careflow-ntf-title-group">
                <span className="careflow-ntf-title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="careflow-ntf-pill-badge">{unreadCount} new</span>
                )}
              </div>
              <button
                type="button"
                className="careflow-ntf-close-btn"
                onClick={handleClosePanel}
                aria-label="Close notification panel"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Header Toolbar: Filter Tabs & Actions */}
            <div className="careflow-ntf-toolbar">
              <div className="careflow-ntf-tabs">
                <button
                  type="button"
                  className={`careflow-ntf-tab ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  className={`careflow-ntf-tab ${activeTab === 'unread' ? 'active' : ''}`}
                  onClick={() => setActiveTab('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="careflow-ntf-bulk-actions">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="careflow-ntf-action-link"
                    onClick={handleMarkAllAsRead}
                    disabled={actionInProgress}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="careflow-ntf-action-link delete"
                    onClick={handleClearAll}
                    disabled={actionInProgress}
                    title="Clear all notifications"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel Content List */}
          <div className="careflow-notification-list">
            {isLoading ? (
              <div className="careflow-ntf-loading">
                <div className="careflow-ntf-spinner" />
                <span>Loading notifications...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="careflow-ntf-empty">
                <div className="careflow-ntf-empty-icon">
                  <Inbox size={32} />
                </div>
                <h4 className="careflow-ntf-empty-title">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h4>
                <p className="careflow-ntf-empty-desc">
                  {activeTab === 'unread'
                    ? 'All current notifications have been read.'
                    : "You're all caught up! When updates or alerts arrive, they will appear here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((ntf) => {
                const config = getNotificationTypeConfig(ntf.notification_type);
                const isUnread = !ntf.is_read;

                return (
                  <div
                    key={ntf.id}
                    className={`careflow-ntf-item ${isUnread ? 'unread' : 'read'}`}
                    onClick={() => handleNotificationClick(ntf)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(ntf);
                      }
                    }}
                  >
                    {/* Type Icon Chip */}
                    <div className={`careflow-ntf-item-icon ${config.colorClass}`}>
                      {config.icon}
                    </div>

                    {/* Content Details */}
                    <div className="careflow-ntf-item-body">
                      <div className="careflow-ntf-item-top">
                        <span className="careflow-ntf-item-title">{ntf.title}</span>
                        {isUnread && <span className="careflow-ntf-unread-dot" />}
                      </div>

                      <p className="careflow-ntf-item-msg">{ntf.message}</p>

                      <div className="careflow-ntf-item-meta">
                        <span className="careflow-ntf-item-time">
                          <Clock size={11} />
                          {formatRelativeTime(ntf.created_at)}
                        </span>
                        <span className="careflow-ntf-type-badge">{config.badgeLabel}</span>
                      </div>
                    </div>

                    {/* Item Individual Mark As Read Action */}
                    {isUnread && (
                      <button
                        type="button"
                        className="careflow-ntf-item-check-btn"
                        onClick={(e) => handleMarkAsRead(e, ntf.id)}
                        aria-label="Mark notification as read"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
