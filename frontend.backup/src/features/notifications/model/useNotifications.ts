import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notificationsApi } from '../api/notificationsApi'
import {
  Notification,
  NotificationSettings,
  PaginatedResponse
} from '@/shared/lib/types'

export const useNotifications = (page = 1, limit = 20, filters?: {
  isRead?: boolean
  type?: Notification['type']
  category?: Notification['category']
}) => {
  return useQuery({
    queryKey: ['notifications', page, limit, filters],
    queryFn: () => notificationsApi.getNotifications(page, limit, filters),
    keepPreviousData: true,
    staleTime: 30000, // 30 seconds
  })
}

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  })
}

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: notificationsApi.getSettings,
    staleTime: 300000, // 5 minutes
  })
}

export const useNotificationActions = () => {
  const queryClient = useQueryClient()

  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark notifications as read')
    },
  })

  const markAsUnreadMutation = useMutation({
    mutationFn: notificationsApi.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark notifications as unread')
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      toast.success('All notifications marked as read')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark all notifications as read')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: notificationsApi.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications archived')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive notifications')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      toast.success('Notifications deleted')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete notifications')
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: notificationsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'settings'] })
      toast.success('Notification settings updated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update notification settings')
    },
  })

  return {
    markAsRead: markAsReadMutation.mutate,
    markAsUnread: markAsUnreadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    archive: archiveMutation.mutate,
    delete: deleteMutation.mutate,
    updateSettings: updateSettingsMutation.mutate,
    isLoading: markAsReadMutation.isLoading || markAsUnreadMutation.isLoading ||
               markAllAsReadMutation.isLoading || archiveMutation.isLoading ||
               deleteMutation.isLoading || updateSettingsMutation.isLoading,
  }
}

export const useRealTimeNotifications = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribeNotifications = notificationsApi.subscribeToNotifications((notification: Notification) => {
      // Add new notification to the top of the list
      queryClient.setQueryData(['notifications', 1, 20, undefined], (oldData: PaginatedResponse<Notification> | undefined) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          data: [notification, ...oldData.data]
        }
      })

      // Update unread count
      queryClient.setQueryData(['notifications', 'unread-count'], (oldData: { count: number } | undefined) => {
        if (!oldData) return oldData
        return { count: oldData.count + 1 }
      })

      // Show toast notification for high priority notifications
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        toast(notification.title, {
          description: notification.message,
          action: notification.actions?.[0] ? {
            label: notification.actions[0].label,
            onClick: () => console.log('Notification action clicked')
          } : undefined
        })
      }
    })

    const unsubscribeUnreadCount = notificationsApi.subscribeToUnreadCount((data: { count: number }) => {
      queryClient.setQueryData(['notifications', 'unread-count'], data)
    })

    return () => {
      unsubscribeNotifications?.()
      unsubscribeUnreadCount?.()
    }
  }, [queryClient])
}

// Utility hooks for common notification operations
export const useNotificationFilters = () => {
  const [filters, setFilters] = useState<{
    isRead?: boolean
    type?: Notification['type']
    category?: Notification['category']
  }>({})

  const updateFilter = useCallback((key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  return { filters, updateFilter, clearFilters }
}

export const useNotificationPagination = () => {
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1))
  }, [])

  const goToPage = useCallback((pageNumber: number) => {
    setPage(Math.max(1, pageNumber))
  }, [])

  const resetPage = useCallback(() => {
    setPage(1)
  }, [])

  return { page, limit, nextPage, prevPage, goToPage, resetPage }
}