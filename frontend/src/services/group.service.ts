import apiClient from '@/lib/api-client';

export interface Group {
  id: string;
  name: string;
  description?: string;
  groupType: 'private' | 'public';
  avatar?: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  members?: any[];
}

export const groupService = {
  async createGroup(data: {
    name: string;
    description?: string;
    groupType?: 'private' | 'public';
    avatar?: string;
    initialMembers: string[];
  }) {
    const response = await apiClient.post('/groups', data);
    return response.data.data;
  },

  async getGroups(params?: {
    page?: number;
    limit?: number;
    search?: string;
    groupType?: 'private' | 'public';
  }) {
    const response = await apiClient.get('/groups', { params });
    return response.data.data;
  },

  async getGroup(groupId: string) {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data.data;
  },

  async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    groupType?: 'private' | 'public';
    avatar?: string;
  }) {
    const response = await apiClient.put(`/groups/${groupId}`, data);
    return response.data.data;
  },

  async deleteGroup(groupId: string) {
    const response = await apiClient.delete(`/groups/${groupId}`);
    return response.data;
  },

  async addMember(groupId: string, userId: string, role?: 'admin' | 'moderator' | 'member') {
    const response = await apiClient.post(`/groups/${groupId}/members`, { userId, role });
    return response.data.data;
  },

  async removeMember(groupId: string, userId: string) {
    const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  async updateMemberRole(groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') {
    const response = await apiClient.put(`/groups/${groupId}/members/${userId}/role`, { role });
    return response.data.data;
  },

  async leaveGroup(groupId: string) {
    const response = await apiClient.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  async muteGroup(groupId: string) {
    const response = await apiClient.post(`/groups/${groupId}/mute`);
    return response.data.data;
  },

  async unmuteGroup(groupId: string) {
    const response = await apiClient.delete(`/groups/${groupId}/mute`);
    return response.data.data;
  },
};
