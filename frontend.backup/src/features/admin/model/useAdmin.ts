import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '../api/adminApi'
import {
  AdminStats,
  AdminUser,
  PendingUser,
  AdminActivity,
  AdminFilters,
  BulkAction,
  SystemHealth,
  PaginatedResponse
} from '@/shared/lib/types'

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: adminApi.getSystemHealth,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })
}

export const usePendingUsers = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['admin', 'pending-users', page, limit],
    queryFn: () => adminApi.getPendingUsers(page, limit),
    keepPreviousData: true,
  })
}

export const useUsers = (filters: AdminFilters = {}, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['admin', 'users', filters, page, limit],
    queryFn: () => adminApi.getUsers(filters, page, limit),
    keepPreviousData: true,
  })
}

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.getUserById(userId),
    enabled: !!userId,
  })
}

export const useActivityFeed = (limit = 50) => {
  return useQuery({
    queryKey: ['admin', 'activity', limit],
    queryFn: () => adminApi.getActivityFeed(limit),
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

export const useAdminActions = () => {
  const queryClient = useQueryClient()

  const approveUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminApi.approveUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve user')
    },
  })

  const rejectUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.rejectUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User rejected successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject user')
    },
  })

  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, duration, reason }: { userId: string; duration: number; reason: string }) =>
      adminApi.suspendUser(userId, duration, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User suspended successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to suspend user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.deleteUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user')
    },
  })

  const bulkActionMutation = useMutation({
    mutationFn: adminApi.bulkAction,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(`Bulk action completed: ${result.processed} processed, ${result.failed} failed`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bulk action failed')
    },
  })

  return {
    approveUser: approveUserMutation.mutate,
    rejectUser: rejectUserMutation.mutate,
    suspendUser: suspendUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    bulkAction: bulkActionMutation.mutate,
    isLoading: approveUserMutation.isLoading || rejectUserMutation.isLoading ||
               suspendUserMutation.isLoading || deleteUserMutation.isLoading ||
               bulkActionMutation.isLoading,
  }
}

export const useRealTimeAdminUpdates = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribeStats = adminApi.subscribeToStats((stats: AdminStats) => {
      queryClient.setQueryData(['admin', 'stats'], stats)
    })

    const unsubscribeActivity = adminApi.subscribeToActivity((activity: AdminActivity) => {
      queryClient.setQueryData(['admin', 'activity', 50], (oldData: AdminActivity[] = []) => {
        return [activity, ...oldData.slice(0, 49)] // Keep only latest 50
      })
    })

    return () => {
      unsubscribeStats?.()
      unsubscribeActivity?.()
    }
  }, [queryClient])
}