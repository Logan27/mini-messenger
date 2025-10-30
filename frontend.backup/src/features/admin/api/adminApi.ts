import { api } from '@/shared/api'
import websocketService from '@/services/websocketService'
import {
  AdminStats,
  AdminUser,
  PendingUser,
  AdminActivity,
  AdminFilters,
  BulkAction,
  PaginatedResponse,
  SystemHealth
} from '@/shared/lib/types'

export const adminApi = {
  // Dashboard and Statistics
  getStats: (): Promise<AdminStats> =>
    api.get('/admin/stats'),

  getSystemHealth: (): Promise<SystemHealth> =>
    api.get('/admin/health'),

  getActivityFeed: (limit = 50): Promise<AdminActivity[]> =>
    api.get(`/admin/activity?limit=${limit}`),

  // User Management
  getPendingUsers: (page = 1, limit = 20): Promise<PaginatedResponse<PendingUser>> =>
    api.get(`/admin/users/pending?page=${page}&limit=${limit}`),

  getUsers: (filters: AdminFilters = {}, page = 1, limit = 20): Promise<PaginatedResponse<AdminUser>> =>
    api.get('/admin/users', { params: { ...filters, page, limit } }),

  getUserById: (userId: string): Promise<AdminUser> =>
    api.get(`/admin/users/${userId}`),

  approveUser: (userId: string, reason?: string): Promise<void> =>
    api.post(`/admin/users/${userId}/approve`, { reason }),

  rejectUser: (userId: string, reason: string): Promise<void> =>
    api.post(`/admin/users/${userId}/reject`, { reason }),

  suspendUser: (userId: string, duration: number, reason: string): Promise<void> =>
    api.post(`/admin/users/${userId}/suspend`, { duration, reason }),

  deleteUser: (userId: string, reason: string): Promise<void> =>
    api.delete(`/admin/users/${userId}`, { data: { reason } }),

  resetUserPassword: (userId: string): Promise<{ temporaryPassword: string }> =>
    api.post(`/admin/users/${userId}/reset-password`),

  // Bulk Actions
  bulkAction: (action: BulkAction): Promise<{ processed: number; failed: number }> =>
    api.post('/admin/users/bulk', action),

  // User Violations
  getUserViolations: (userId: string): Promise<UserViolation[]> =>
    api.get(`/admin/users/${userId}/violations`),

  resolveViolation: (violationId: string, action: string): Promise<void> =>
    api.post(`/admin/violations/${violationId}/resolve`, { action }),

  // Activity and Audit
  getAuditLog: (page = 1, limit = 50, filters?: { userId?: string; action?: string; dateFrom?: string; dateTo?: string }): Promise<PaginatedResponse<AdminActivity>> =>
    api.get('/admin/audit', { params: { page, limit, ...filters } }),

  // System Management
  updateSystemSettings: (settings: Record<string, any>): Promise<void> =>
    api.post('/admin/settings', settings),

  getSystemSettings: (): Promise<Record<string, any>> =>
    api.get('/admin/settings'),

  // Real-time updates via WebSocket
  subscribeToStats: (callback: (stats: AdminStats) => void) => {
    const handleStatsUpdate = (data: AdminStats) => callback(data)
    websocketService.on('admin_stats_update', handleStatsUpdate)

    return () => {
      websocketService.off('admin_stats_update', handleStatsUpdate)
    }
  },

  subscribeToActivity: (callback: (activity: AdminActivity) => void) => {
    const handleActivity = (data: AdminActivity) => callback(data)
    websocketService.on('admin_user_activity', handleActivity)

    return () => {
      websocketService.off('admin_user_activity', handleActivity)
    }
  },

  subscribeToUserRegistrations: (callback: (user: PendingUser) => void) => {
    const handleRegistration = (data: PendingUser) => callback(data)
    websocketService.on('admin_user_registration', handleRegistration)

    return () => {
      websocketService.off('admin_user_registration', handleRegistration)
    }
  },

  subscribeToSystemAlerts: (callback: (alert: { type: string; message: string; data?: any }) => void) => {
    const handleAlert = (data: { type: string; message: string; data?: any }) => callback(data)
    websocketService.on('admin_system_alert', handleAlert)

    return () => {
      websocketService.off('admin_system_alert', handleAlert)
    }
  }
}