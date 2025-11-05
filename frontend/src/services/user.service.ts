import apiClient from '@/lib/api-client';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  role: string;
  firstName?: string;
  lastName?: string;
  approvalStatus: string;
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  settings?: {
    showOnlineStatus?: boolean;
    sendReadReceipts?: boolean;
  };
  createdAt: Date;
}

export const userService = {
  async searchUsers(query: string, page = 1, limit = 10) {
    const response = await apiClient.get('/users/search', {
      params: { query, page, limit },
    });
    // Backend returns { success: true, data: { users: [...], search: {...}, pagination: {...} } }
    // Extract just the users array
    const result = response.data.data;

    // Handle different response structures
    if (result && result.users && Array.isArray(result.users)) {
      return result.users;
    }

    // Fallback: if data is directly an array
    if (Array.isArray(result)) {
      return result;
    }

    // No results
    return [];
  },

  async getUserById(userId: string) {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data.data;
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    phone?: string;
    avatar?: string;
    profilePicture?: string;
    username?: string;
    email?: string;
    status?: string;
    settings?: {
      showOnlineStatus?: boolean;
      sendReadReceipts?: boolean;
    };
  }) {
    const response = await apiClient.put('/users/me', data);
    return response.data.data;
  },

  async updatePassword(data: {
    currentPassword: string;
    newPassword: string;
  }) {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  async uploadAvatar(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data.data;
  },
};
