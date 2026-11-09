import apiClient from './api';

const notificationService = {
  /**
   * Fetch notification history for the authenticated user
   */
  async fetchNotifications({ unreadOnly = false } = {}) {
    try {
      const params = {};
      if (unreadOnly) {
        params.unread_only = true;
      }
      const response = await apiClient.get('/notifications/', { params });
      // API returns either { results: [...], count, unread_count } or an array
      const data = response.data;
      if (Array.isArray(data)) {
        return { results: data, unreadCount: data.filter((n) => !n.is_read).length };
      }
      return {
        results: data.results || [],
        unreadCount: typeof data.unread_count === 'number' ? data.unread_count : 0,
        count: data.count || 0,
      };
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
      return { results: [], unreadCount: 0, count: 0 };
    }
  },

  /**
   * Lightweight poll endpoint for unread count
   */
  async fetchUnreadCount() {
    try {
      const response = await apiClient.get('/notifications/unread-count/');
      return response.data?.unread_count ?? 0;
    } catch (error) {
      // Graceful fallback during temporary network or auth changes
      return 0;
    }
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.post(`/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
      throw error;
    }
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await apiClient.post('/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Clear / dismiss all notifications from the user's active view
   */
  async clearAll() {
    try {
      const response = await apiClient.post('/notifications/clear/');
      return response.data;
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw error;
    }
  },

  /**
   * Dismiss a single notification
   */
  async dismissNotification(notificationId) {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to dismiss notification ${notificationId}:`, error);
      throw error;
    }
  },
};

export default notificationService;

