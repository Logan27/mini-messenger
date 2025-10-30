import { api } from '@/shared/api'
import type { Group, User, PaginatedResponse } from '@/shared/lib/types'

export interface CreateGroupData {
  name: string
  description?: string
  groupType?: 'private' | 'public'
  avatar?: string
  initialMembers: string[]
}

export interface GroupResponse {
  id: string
  name: string
  description?: string
  groupType: 'private' | 'public'
  avatar?: string
  creatorId: string
  isActive: boolean
  maxMembers: number
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
  members: GroupMember[]
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: 'admin' | 'moderator' | 'member'
  joinedAt: string
  leftAt?: string
  isActive: boolean
  invitedBy?: string
  permissions: {
    canSendMessages: boolean
    canInviteMembers: boolean
    canRemoveMembers: boolean
    canEditGroup: boolean
    canDeleteMessages: boolean
  }
  lastSeenAt?: string
  user: User
}

export const groupsApi = {
  // Groups
  getGroups: async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    groupType?: 'private' | 'public'
  ): Promise<PaginatedResponse<GroupResponse>> => {
    const response = await api.get<PaginatedResponse<GroupResponse>>('/api/groups', {
      params: { page, limit, search, groupType }
    })
    return response.data
  },

  getGroup: async (groupId: string): Promise<GroupResponse> => {
    const response = await api.get<GroupResponse>(`/api/groups/${groupId}`)
    return response.data
  },

  createGroup: async (groupData: CreateGroupData): Promise<GroupResponse> => {
    const response = await api.post<GroupResponse>('/api/groups', groupData)
    return response.data
  },

  updateGroup: async (
    groupId: string,
    updates: Partial<CreateGroupData>
  ): Promise<GroupResponse> => {
    const response = await api.put<GroupResponse>(`/api/groups/${groupId}`, updates)
    return response.data
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/api/groups/${groupId}`)
  },

  // Group Members
  addMember: async (
    groupId: string,
    userId: string,
    role: 'admin' | 'moderator' | 'member' = 'member'
  ): Promise<GroupResponse> => {
    const response = await api.post<GroupResponse>(`/api/groups/${groupId}/members`, {
      userId,
      role
    })
    return response.data
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`/api/groups/${groupId}/members/${userId}`)
  },

  updateMemberRole: async (
    groupId: string,
    userId: string,
    role: 'admin' | 'moderator' | 'member'
  ): Promise<GroupResponse> => {
    const response = await api.put<GroupResponse>(
      `/api/groups/${groupId}/members/${userId}/role`,
      { role }
    )
    return response.data
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    await api.post(`/api/groups/${groupId}/leave`)
  }
}