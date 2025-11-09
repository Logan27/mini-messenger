import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../utils/logger';

// API Configuration from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if token refresh is in progress to avoid concurrent refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from storage
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call the refresh endpoint
        const response = await authAPI.refreshToken(refreshToken);
        const data = response.data.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = data.tokens || data;

        // Update stored tokens
        await AsyncStorage.setItem('authToken', accessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update the authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth state and reject all queued requests
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear tokens from storage
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');

        // Log refresh failure for debugging
        log.error('Token refresh failed', {
          error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
          originalUrl: originalRequest?.url
        });

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// WebSocket service
export class WebSocketService {
  private socket: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  connect(token: string) {
    log.websocket('Attempting to connect', {
      wsUrl: WS_BASE_URL,
      hasToken: !!token,
      alreadyConnected: this.socket?.connected
    });
    
    if (this.socket?.connected) {
      log.websocket('Already connected, skipping connection attempt');
      return;
    }

    this.socket = require('socket.io-client')(WS_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      log.websocket('Connected successfully', {
        socketId: this.socket.id,
        reconnectAttempts: this.reconnectAttempts
      });
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      log.websocket('Disconnected from WebSocket');
      this.attemptReconnect(token);
    });

    this.socket.on('connect_error', (error: any) => {
      log.websocket('Connection error', {
        message: error.message,
        type: error.type,
        description: error.description,
        reconnectAttempts: this.reconnectAttempts
      });
      this.attemptReconnect(token);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectInterval * this.reconnectAttempts;
      log.websocket('Attempting reconnection', {
        attempt: this.reconnectAttempts + 1,
        maxAttempts: this.maxReconnectAttempts,
        delay
      });
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(token);
      }, delay);
    } else {
      log.websocket('Max reconnection attempts reached', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
    }
  }

  on(event: string, callback: Function) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: Function) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const wsService = new WebSocketService();

// API endpoints
export const authAPI = {
  login: async (credentials: { identifier: string; password: string }) => {
    log.auth('Attempting login', {
      identifier: credentials.identifier,
      endpoint: '/api/auth/login',
      baseURL: API_BASE_URL,
      hasNetwork: navigator.onLine
    }, 'API');
    
    try {
      const response = await api.post('/api/auth/login', credentials);
      log.auth('Login response received', {
        status: response.status,
        data: response.data,
        hasToken: !!response.data?.data?.tokens?.accessToken
      }, 'API');
      return response;
    } catch (error: any) {
      log.error('Login failed', {
        error: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        baseURL: API_BASE_URL,
        endpoint: '/api/auth/login',
        isNetworkError: !error?.response,
        isTimeout: error?.code === 'ECONNABORTED'
      }, 'API');
      throw error;
    }
  },

  register: (userData: { username: string; email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/api/auth/register', userData),

  refreshToken: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }),

  logout: () =>
    api.post('/api/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    api.post('/api/auth/reset-password', { token, password, confirmPassword }),

  verifyEmail: (token: string) =>
    api.post('/api/auth/verify-email', { token }),
};

export const messagingAPI = {
  getConversations: () =>
    api.get('/api/messages/conversations'),

  getConversation: (conversationId: string) =>
    api.get(`/api/messages/conversations/${conversationId}`),

  sendMessage: (recipientId: string, content: string, type: string = 'text', replyTo?: string, file?: any) =>
    api.post('/api/messages', { recipientId, content, type, replyTo, file }),

  editMessage: (messageId: string, content: string) =>
    api.put(`/api/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string, deleteForEveryone: boolean = false) =>
    api.delete(`/api/messages/${messageId}`, {
      params: { deleteForEveryone }
    }),

  markAsRead: (messageId: string) =>
    api.post(`/api/messages/${messageId}/read`),
};

export const fileAPI = {
  uploadFile: (file: any, messageId?: string) => {
    const formData = new FormData();
    formData.append('file', file);

    if (messageId) {
      formData.append('messageId', messageId);
    }

    return api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFile: (fileId: string) =>
    api.get(`/api/files/${fileId}`),

  deleteFile: (fileId: string) =>
    api.delete(`/api/files/${fileId}`),
};

export const userAPI = {
  getProfile: () =>
    api.get('/api/auth/me'),

  updateProfile: (data: any) =>
    api.put('/api/users/profile', data),

  searchUsers: (query: string) =>
    api.get(`/api/users/search?query=${encodeURIComponent(query)}`),
};

export const groupAPI = {
  // Group CRUD
  getUserGroups: (page = 1, limit = 20, search?: string, groupType?: 'private' | 'public') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (groupType) params.append('groupType', groupType);
    return api.get(`/api/groups?${params.toString()}`);
  },

  getGroup: (groupId: string) =>
    api.get(`/api/groups/${groupId}`),

  createGroup: (data: {
    name: string;
    description?: string;
    groupType?: 'private' | 'public';
    avatar?: string;
    initialMembers?: string[];
  }) =>
    api.post('/api/groups', data),

  updateGroup: (groupId: string, data: {
    name?: string;
    description?: string;
    avatar?: string;
  }) =>
    api.put(`/api/groups/${groupId}`, data),

  deleteGroup: (groupId: string) =>
    api.delete(`/api/groups/${groupId}`),

  leaveGroup: (groupId: string) =>
    api.post(`/api/groups/${groupId}/leave`),

  muteGroup: (groupId: string) =>
    api.post(`/api/groups/${groupId}/mute`),

  unmuteGroup: (groupId: string) =>
    api.delete(`/api/groups/${groupId}/mute`),

  // Group Members
  getGroupMembers: (groupId: string) =>
    api.get(`/api/groups/${groupId}/members`),

  addGroupMembers: (groupId: string, userIds: string[]) =>
    api.post(`/api/groups/${groupId}/members`, { userIds }),

  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/members/${userId}`),

  updateMemberRole: (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') =>
    api.put(`/api/groups/${groupId}/members/${userId}/role`, { role }),

  // Group Settings
  getGroupSettings: (groupId: string) =>
    api.get(`/api/groups/${groupId}/settings`),

  updateGroupSettings: (groupId: string, settings: {
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanAddMembers?: boolean;
    onlyAdminsCanEditInfo?: boolean;
    enableReadReceipts?: boolean;
    enableTypingIndicators?: boolean;
  }) =>
    api.put(`/api/groups/${groupId}/settings`, settings),
};

export const contactAPI = {
  getContacts: (status?: 'pending' | 'accepted' | 'blocked', page = 1, limit = 50) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    return api.get(`/api/contacts?${params.toString()}`);
  },

  addContact: (userId: string, nickname?: string, notes?: string) =>
    api.post('/api/contacts', { userId, nickname, notes }),

  acceptContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/accept`),

  rejectContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/reject`),

  deleteContact: (contactId: string) =>
    api.delete(`/api/contacts/${contactId}`),

  blockContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/block`),

  unblockContact: (contactId: string) =>
    api.delete(`/api/contacts/${contactId}/block`),

  favoriteContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/favorite`),

  unfavoriteContact: (contactId: string) =>
    api.delete(`/api/contacts/${contactId}/favorite`),

  updateContact: (contactId: string, data: { nickname?: string; notes?: string }) =>
    api.patch(`/api/contacts/${contactId}`, data),

  muteContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/mute`),

  unmuteContact: (contactId: string) =>
    api.delete(`/api/contacts/${contactId}/mute`),
};

export default api;