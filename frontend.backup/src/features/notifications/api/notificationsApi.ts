import { api } from '@/shared/api'
import websocketService from '@/services/websocketService'
import {
  Notification,
  NotificationSettings,
  PaginatedResponse
} from '@/shared/lib/types'

export const notificationsApi = {
  // Get notifications
  getNotifications: (page = 1, limit = 20, filters?: {
    isRead?: boolean
    type?: Notification['type']
    category?: Notification['category']
  }): Promise<PaginatedResponse<Notification>> => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
    if (filters?.isRead !== undefined) params.append('isRead', filters.isRead.toString())
    if (filters?.type) params.append('type', filters.type)
    if (filters?.category) params.append('category', filters.category)

    return api.get(`/notifications?${params.toString()}`)
  },

  // Mark as read/unread
  markAsRead: (notificationIds: string[]): Promise<void> =>
    api.post('/notifications/mark-read', { notificationIds }),

  markAsUnread: (notificationIds: string[]): Promise<void> =>
    api.post('/notifications/mark-unread', { notificationIds }),

  markAllAsRead: (): Promise<void> =>
    api.post('/notifications/mark-all-read'),

  // Archive notifications
  archive: (notificationIds: string[]): Promise<void> =>
    api.post('/notifications/archive', { notificationIds }),

  unarchive: (notificationIds: string[]): Promise<void> =>
    api.post('/notifications/unarchive', { notificationIds }),

  // Delete notifications
  delete: (notificationIds: string[]): Promise<void> =>
    api.delete('/notifications', { data: { notificationIds } }),

  // Get unread count
  getUnreadCount: (): Promise<{ count: number }> =>
    api.get('/notifications/unread-count'),

  // Notification settings
  getSettings: (): Promise<NotificationSettings> =>
    api.get('/notifications/settings'),

  updateSettings: (settings: Partial<NotificationSettings>): Promise<NotificationSettings> =>
    api.put('/notifications/settings', settings),

  // Test notification (for development)
  sendTestNotification: (type: Notification['type'], title: string, message: string): Promise<void> =>
    api.post('/notifications/test', { type, title, message }),

  // Real-time subscription via WebSocket
  subscribeToNotifications: (callback: (notification: Notification) => void) => {
    const handleNotification = (data: Notification) => callback(data)
    websocketService.on('notification', handleNotification)

    return () => {
      websocketService.off('notification', handleNotification)
    }
  },

  subscribeToUnreadCount: (callback: (count: { count: number }) => void) => {
    // For unread count updates, we can listen to notification events and update count
    const handleNotification = (data: Notification) => {
      if (!data.isRead) {
        callback({ count: (callback as any).currentCount + 1 || 1 })
      }
    }

    // Store current count for the callback
    ;(callback as any).currentCount = 0

    websocketService.on('notification', handleNotification)

    return () => {
      websocketService.off('notification', handleNotification)
    }
  }
}