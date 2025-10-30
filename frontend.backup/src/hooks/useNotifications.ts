import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import websocketService from '../services/websocketService';

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'call' | 'mention' | 'admin' | 'system';
  title: string;
  content: string;
  data: Record<string, any>;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'message' | 'call' | 'mention' | 'admin' | 'system';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: 'message' | 'call' | 'mention' | 'admin' | 'system';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'message' | 'call' | 'mention' | 'admin' | 'system';
}

export interface NotificationPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: NotificationPagination | null;
}

export interface UseNotificationsReturn extends NotificationState {
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (filters?: { type?: string; category?: string; priority?: string }) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: NotificationFilters) => void;
  clearError: () => void;
}

/**
 * Custom hook for managing notifications
 */
export const useNotifications = (initialFilters: NotificationFilters = {}): UseNotificationsReturn => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    pagination: null,
  });

  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 50,
    ...initialFilters,
  });

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (mergeWithExisting = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiClient.get<NotificationListResponse>(
        `/notifications?${queryParams.toString()}`
      );

      setState(prev => ({
        ...prev,
        notifications: mergeWithExisting ? [...prev.notifications, ...response.data.notifications] : response.data.notifications,
        pagination: response.data.pagination,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error?.message || 'Failed to load notifications',
        isLoading: false,
      }));
    }
  }, [filters]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      setState(prev => ({ ...prev, unreadCount: response.data.unreadCount }));
    } catch (error) {
      // Don't show error for unread count, just log it
      console.warn('Failed to fetch unread count:', error);
    }
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      fetchNotifications(false),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error?.message || 'Failed to mark notification as read',
      }));
      throw error;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (markFilters?: { type?: string; category?: string; priority?: string }) => {
    try {
      const response = await apiClient.put('/notifications/mark-all-read', markFilters || {});

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error?.message || 'Failed to mark all notifications as read',
      }));
      throw error;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);

      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(notification => notification.id !== notificationId),
        unreadCount: prev.notifications.find(n => n.id === notificationId && !n.read)
          ? Math.max(0, prev.unreadCount - 1)
          : prev.unreadCount,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error?.message || 'Failed to delete notification',
      }));
      throw error;
    }
  }, []);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (state.pagination?.hasNext) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  }, [state.pagination?.hasNext]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Reload when filters change
  useEffect(() => {
    if (filters.page === 1) {
      fetchNotifications(false);
    } else {
      setFilters(prev => ({ ...prev, page: 1 }));
    }
  }, [filters.read, filters.type, filters.priority, filters.category, fetchNotifications]);

  // WebSocket event listeners
  useEffect(() => {
    const handleNewNotification = (data: { notification: Notification }) => {
      setState(prev => ({
        ...prev,
        notifications: [data.notification, ...prev.notifications],
        unreadCount: prev.unreadCount + 1,
      }));
    };

    const handleNotificationRead = (data: { notificationId: string; userId: string }) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification =>
          notification.id === data.notificationId
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    };

    const handleNotificationDeleted = (data: { notificationId: string; userId: string }) => {
      setState(prev => {
        const deletedNotification = prev.notifications.find(n => n.id === data.notificationId);
        return {
          ...prev,
          notifications: prev.notifications.filter(notification => notification.id !== data.notificationId),
          unreadCount: deletedNotification && !deletedNotification.read
            ? Math.max(0, prev.unreadCount - 1)
            : prev.unreadCount,
        };
      });
    };

    const handleBadgeUpdate = (data: { unreadCount: number }) => {
      setState(prev => ({ ...prev, unreadCount: data.unreadCount }));
    };

    // Subscribe to WebSocket events
    websocketService.on('notification', handleNewNotification);
    websocketService.on('notification_read', handleNotificationRead);
    websocketService.on('notification_deleted', handleNotificationDeleted);
    websocketService.on('notification_badge_update', handleBadgeUpdate);

    // Cleanup
    return () => {
      websocketService.off('notification', handleNewNotification);
      websocketService.off('notification_read', handleNotificationRead);
      websocketService.off('notification_deleted', handleNotificationDeleted);
      websocketService.off('notification_badge_update', handleBadgeUpdate);
    };
  }, []);

  return {
    ...state,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    setFilters,
    clearError,
  };
};

/**
 * Hook for creating notifications (admin/internal use)
 */
export const useCreateNotification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNotification = useCallback(async (notificationData: {
    userId: string;
    type: 'message' | 'call' | 'mention' | 'admin' | 'system';
    title: string;
    content: string;
    category: 'message' | 'call' | 'mention' | 'admin' | 'system';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    data?: Record<string, any>;
    expiresAt?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post<Notification>('/notifications', notificationData);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create notification';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createNotification,
    isLoading,
    error,
    clearError,
  };
};

/**
 * Hook for notification cleanup (admin only)
 */
export const useNotificationCleanup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupExpired = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post<{ deletedCount: number }>('/notifications/cleanup');

      return response.data.deletedCount;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to cleanup notifications';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    cleanupExpired,
    isLoading,
    error,
    clearError,
  };
};