import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use localhost for Android if adb reverse is used, otherwise 10.0.2.2
// User confirmed localhost is accessible
const DEV_API_URL = Platform.select({
  android: 'http://localhost:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

// Export API_URL for use in other modules
export const API_URL = DEV_API_URL;

const WS_BASE_URL = Platform.select({
  android: 'ws://localhost:4000',
  ios: 'ws://localhost:4000',
  default: 'ws://localhost:4000',
});

// Get mobile app secret from config
const MOBILE_APP_SECRET = Constants.expoConfig?.extra?.mobileAppSecret || '';

// Create axios instance
const api = axios.create({
  baseURL: DEV_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Mobile-App': 'true',
    'X-Mobile-App-Secret': MOBILE_APP_SECRET, // Secret to verify mobile app identity
  },
  timeout: 10000, // 10 seconds timeout
});

// Logger for API requests
const log = {
  request: (method: string, url: string, data?: any) => {
    console.log(`[API Request] ${method.toUpperCase()} ${url}`, data ? JSON.stringify(data, null, 2) : '');
  },
  response: (method: string, url: string, status: number, data?: any) => {
    console.log(`[API Response] ${status} ${method.toUpperCase()} ${url}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, details?: any, context: string = 'General') => {
    console.error(`[${context}] ${message}`, details ? JSON.stringify(details, null, 2) : '');
  },
  auth: (message: string, details?: any, context: string = 'Auth') => {
    console.log(`[${context}] ${message}`, details ? JSON.stringify(details, null, 2) : '');
  },
  websocket: (message: string, details?: any) => {
    console.log(`[WebSocket] ${message}`, details ? JSON.stringify(details, null, 2) : '');
  }
};

// Utility to extract error message from backend response
export const extractErrorMessage = (error: any, defaultMessage: string = 'Operation failed'): string => {
  // Backend returns { success: false, error: { type, message } }
  return (
    error.response?.data?.error?.message ||
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    defaultMessage
  );
};

// WebSocket Service
class WebSocketService {
  socket: any = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  baseReconnectInterval = 1000; // 1 second base
  maxReconnectInterval = 30000; // 30 seconds max
  reconnectTimer: any = null;
  authErrorDetected = false;

  connect(token: string) {
    if (this.socket?.connected) {
      log.websocket('Already connected, skipping connection attempt');
      return;
    }

    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
      this.authErrorDetected = false;
    });

    this.socket.on('disconnect', (reason: string) => {
      log.websocket('Disconnected from WebSocket', { reason });

      // Don't auto-reconnect if disconnected due to auth error
      if (reason === 'io server disconnect' || this.authErrorDetected) {
        log.websocket('Server-initiated disconnect or auth error - not auto-reconnecting');
        return;
      }

      this.attemptReconnect(token);
    });

    this.socket.on('connect_error', (error: any) => {
      const errorMessage = error?.message?.toLowerCase() || '';
      const isAuthError =
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('token') ||
        errorMessage.includes('rate limit') ||
        error?.type === 'UnauthorizedError';

      log.websocket('Connection error', {
        message: error?.message || 'Unknown error',
        type: error?.type || 'unknown',
        description: error?.description || 'No description available',
        reconnectAttempts: this.reconnectAttempts,
        isAuthError
      });

      if (isAuthError) {
        this.authErrorDetected = true;
        log.websocket('Authentication error detected - stopping reconnection attempts');
        log.websocket('WebSocket will reconnect after authentication is restored');
        // Clear reconnect timer if any
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        return;
      }

      this.attemptReconnect(token);
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.authErrorDetected = false;
  }

  // Call this method after successful auth/token refresh to resume connection
  reconnectAfterAuth(token: string) {
    log.websocket('Reconnecting after auth restoration');
    this.reconnectAttempts = 0;
    this.authErrorDetected = false;
    this.disconnect();
    this.connect(token);
  }

  private attemptReconnect(token: string) {
    // Don't reconnect if auth error was detected
    if (this.authErrorDetected) {
      log.websocket('Skipping reconnect due to auth error');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
      const exponentialDelay = this.baseReconnectInterval * Math.pow(2, this.reconnectAttempts);
      const delay = Math.min(exponentialDelay, this.maxReconnectInterval);

      log.websocket('Scheduling reconnection attempt', {
        attempt: this.reconnectAttempts + 1,
        maxAttempts: this.maxReconnectAttempts,
        delay: `${delay}ms`
      });

      this.reconnectTimer = setTimeout(() => {
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

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure mobile app headers are always present
    config.headers['X-Mobile-App'] = 'true';
    config.headers['X-Mobile-App-Secret'] = MOBILE_APP_SECRET;

    // Log request
    log.request(config.method || 'UNKNOWN', config.url || 'UNKNOWN', config.data);

    return config;
  },
  (error) => {
    log.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Mobile apps don't use CSRF tokens (backend exempts mobile via X-Mobile-App header)

// Request queue to handle multiple requests during token refresh
let isRefreshing = false;
let failedQueue: any[] = [];

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

// Response interceptor for logging and error handling
api.interceptors.response.use(
  async (response) => {
    log.response(
      response.config.method || 'UNKNOWN',
      response.config.url || 'UNKNOWN',
      response.status,
      response.data
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error details
    log.error('API Error', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    }, 'API');

    // Handle Network Error
    if (error.message === 'Network Error') {
      log.error('Network Error - Cannot connect to server', {
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        tip: Platform.OS === 'android'
          ? 'Ensure backend is running on port 4000. If using emulator, run "adb reverse tcp:4000 tcp:4000" to access localhost.'
          : 'Ensure backend is running on port 4000'
      }, 'API');
    }

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthRequest = originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthRequest) {
        return Promise.reject(error);
      }

      // Mark request as retried immediately to prevent duplicate refresh attempts
      originalRequest._retry = true;

      // Check if refresh is already in progress (atomic check-and-set)
      if (isRefreshing) {
        log.auth('Token refresh already in progress, queueing request');
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // Set refreshing flag before any async operations
      isRefreshing = true;

      try {
        const { accessToken } = await refreshAuthToken();

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        log.auth(`Retrying original request: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
        return api(originalRequest);
      } catch (refreshError: any) {
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const refreshAuthToken = async (): Promise<{ accessToken: string; refreshToken: string }> => {
  // Check if refresh is already in progress (atomic check-and-set)
  if (isRefreshing) {
    log.auth('Token refresh already in progress, queueing request');
    return new Promise(function (resolve, reject) {
      failedQueue.push({ resolve, reject });
    }).then(token => {
      // Return structure matching what we expect
      return { accessToken: token as string, refreshToken: '' };
    });
  }

  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    log.auth(`Attempting to refresh token. Token prefix: ${refreshToken.substring(0, 10)}...`);

    const response = await axios.post(`${DEV_API_URL}/api/auth/refresh`, { refreshToken }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Mobile-App': 'true',
        'X-Mobile-App-Secret': MOBILE_APP_SECRET,
      }
    });

    // Extract tokens from response structure (backend returns data.tokens)
    const responseData = response.data?.data || response.data;
    const tokens = responseData?.tokens || responseData;
    const accessToken = tokens?.accessToken;
    const newRefreshToken = tokens?.refreshToken;

    if (!accessToken) {
      throw new Error('No access token in refresh response');
    }

    log.auth(`Token refresh successful. New Access Token prefix: ${accessToken.substring(0, 10)}...`);
    if (newRefreshToken) {
      log.auth(`New Refresh Token prefix: ${newRefreshToken.substring(0, 10)}...`);
    }

    // Save tokens
    await AsyncStorage.setItem('authToken', accessToken);
    if (newRefreshToken) {
      await AsyncStorage.setItem('refreshToken', newRefreshToken);
    }

    // Update default headers
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    // Reconnect WebSocket with new token
    wsService.disconnect();
    wsService.connect(accessToken);

    log.auth('Token refreshed and saved successfully', {
      tokenUpdated: true,
      queuedRequests: failedQueue.length
    });

    processQueue(null, accessToken);

    return { accessToken, refreshToken: newRefreshToken || refreshToken };
  } catch (refreshError: any) {
    processQueue(refreshError, null);

    const errorMsg = extractErrorMessage(refreshError, 'Token refresh failed');

    log.error('Token refresh failed', {
      error: errorMsg,
      status: refreshError.response?.status,
      hasRefreshToken: !!(await AsyncStorage.getItem('refreshToken'))
    }, 'Auth');

    // Logout user if refresh fails
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
    throw refreshError;
  }
};

export const API_BASE_URL = DEV_API_URL;



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
        endpoint: '/auth/login',
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

  logoutAll: () =>
    api.post('/api/auth/logout-all'),

  checkAccountStatus: (email: string) =>
    api.get('/api/auth/account-status', { params: { email } }),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    api.post('/api/auth/reset-password', { token, password, confirmPassword }),

  verifyEmail: (token: string) =>
    api.post('/api/auth/verify-email', { token }),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/auth/change-password', data),

  // 2FA
  enable2FA: () => api.post('/api/auth/2fa/enable'),
  disable2FA: (token: string) => api.post('/api/auth/2fa/disable', { token }),
  verify2FA: (token: string) => api.post('/api/auth/2fa/verify', { token }),
  getBackupCodes: () => api.get('/api/auth/2fa/backup-codes'),
  regenerateBackupCodes: () => api.post('/api/auth/2fa/backup-codes/regenerate'),
};

export const messagingAPI = {
  getConversations: () =>
    api.get('/api/messages/conversations'),

  getMessages: (params: { conversationWith?: string; groupId?: string; page?: number; limit?: number }) =>
    api.get('/api/messages', { params }),

  sendMessage: (receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileData?: any, replyTo?: string, encryption?: any) => {
    const payload: any = {
      recipientId: receiverId,
      content,
      messageType: type,
      replyToId: replyTo,
      ...encryption
    };

    // If fileData is provided (from file upload response), include file metadata
    if (fileData) {
      payload.metadata = {
        fileId: fileData.id,
        fileUrl: fileData.fileUrl || fileData.url,
        fileName: fileData.fileName || fileData.originalName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType
      };
    }

    return api.post('/api/messages', payload);
  },

  markMessagesAsRead: (messageIds: string[]) =>
    Promise.all(messageIds.map(id => api.post(`/api/messages/${id}/read`))),

  // Backward compatibility: single message mark as read
  markAsRead: (messageId: string) =>
    api.post(`/api/messages/${messageId}/read`),

  deleteMessage: (messageId: string, deleteForEveryone?: boolean) =>
    api.delete(`/api/messages/${messageId}`, { params: { deleteForEveryone } }),

  editMessage: (messageId: string, content: string) =>
    api.put(`/api/messages/${messageId}`, { content }),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/api/messages/${messageId}/reactions`, { emoji }),

  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/api/messages/${messageId}/reactions`, { data: { emoji } }),
};

export const fileAPI = {
  uploadFile: async (formData: FormData) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      log.request('POST', '/api/files/upload', {
        formDataKeys: Array.from((formData as any)._parts || []).map((p: any) => p[0]),
        hasToken: !!token
      });

      // Use fetch instead of axios for file uploads to avoid FormData transformation issues
      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Mobile-App': 'true',
          'X-Mobile-App-Secret': MOBILE_APP_SECRET,
          'Accept': 'application/json',
          // Don't set Content-Type - let fetch handle it for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: data,
          },
          message: data.error?.message || `HTTP ${response.status}`,
          code: `HTTP_${response.status}`,
        };
      }

      log.response('POST', '/api/files/upload', response.status, data);
      return { data };
    } catch (error: any) {
      log.error('File upload failed', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      }, 'FileUpload');
      throw error;
    }
  },

  getFile: (fileId: string) =>
    api.get(`/api/files/${fileId}`),

  deleteFile: (fileId: string) =>
    api.delete(`/api/files/${fileId}`),
};

export const userAPI = {
  getProfile: () =>
    api.get('/api/users/me'),

  updateProfile: (data: any) =>
    api.put('/api/users/me', data),

  searchUsers: (query: string) =>
    api.get(`/api/users/search?query=${encodeURIComponent(query)}`),

  updateAvatar: (formData: FormData) =>
    api.put('/api/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export const notificationAPI = {
  getSettings: () =>
    api.get('/api/notification-settings'),

  updateSettings: (settings: any) =>
    api.put('/api/notification-settings', settings),

  resetSettings: () =>
    api.post('/api/notification-settings/reset'),
};

export const groupAPI = {
  createGroup: (data: { name: string; description?: string; members: string[] }) =>
    api.post('/api/groups', data),

  getUserGroups: (page?: number, limit?: number, search?: string, groupType?: string) => {
    const queryParams: string[] = [];
    if (page !== undefined) queryParams.push(`page=${page}`);
    if (limit !== undefined) queryParams.push(`limit=${limit}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (groupType) queryParams.push(`groupType=${groupType}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return api.get(`/api/groups${queryString}`);
  },

  getGroups: () =>
    api.get('/api/groups'),

  getGroup: (groupId: string) =>
    api.get(`/api/groups/${groupId}`),

  getGroupDetails: (groupId: string) =>
    api.get(`/api/groups/${groupId}`),

  updateGroup: (groupId: string, data: { name?: string; description?: string; avatar?: string }) =>
    api.put(`/api/groups/${groupId}`, data),

  deleteGroup: (groupId: string) =>
    api.delete(`/api/groups/${groupId}`),

  getGroupMembers: (groupId: string) =>
    api.get(`/api/groups/${groupId}/members`),

  addGroupMembers: (groupId: string, userIds: string[]) =>
    api.post(`/api/groups/${groupId}/members`, { userIds }),

  addMembers: (groupId: string, userIds: string[]) =>
    api.post(`/api/groups/${groupId}/members`, { userIds }),

  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/members/${userId}`),

  removeMember: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/members/${userId}`),

  updateMemberRole: (groupId: string, userId: string, role: string) =>
    api.put(`/api/groups/${groupId}/members/${userId}/role`, { role }),

  leaveGroup: (groupId: string) =>
    api.post(`/api/groups/${groupId}/leave`),

  muteGroup: (groupId: string) =>
    api.post(`/api/groups/${groupId}/mute`),

  unmuteGroup: (groupId: string) =>
    api.delete(`/api/groups/${groupId}/mute`),

  getGroupSettings: (groupId: string) =>
    api.get(`/api/groups/${groupId}/settings`),

  updateGroupSettings: (groupId: string, settings: any) =>
    api.put(`/api/groups/${groupId}/settings`, settings),
};

export const contactAPI = {
  getContacts: (status?: string, page?: number, limit?: number) => {
    const queryParams: string[] = [];
    if (status) queryParams.push(`status=${status}`);
    if (page !== undefined) queryParams.push(`page=${page}`);
    if (limit !== undefined) queryParams.push(`limit=${limit}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return api.get(`/api/contacts${queryString}`);
  },

  addContact: (userId: string, nickname?: string, notes?: string) =>
    api.post('/api/contacts', { userId, nickname, notes }),

  acceptContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/accept`),

  rejectContact: (contactId: string) =>
    api.post(`/api/contacts/${contactId}/reject`),

  deleteContact: (contactId: string) =>
    api.delete(`/api/contacts/${contactId}`),

  removeContact: (contactId: string) =>
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

export const encryptionAPI = {
  getPublicKey: (userId: string) =>
    api.get(`/api/encryption/public-key/${userId}`),

  getPublicKeys: (userIds: string[]) =>
    api.post('/api/encryption/public-keys', { userIds }),

  updatePublicKey: (publicKey: string) =>
    api.put('/api/encryption/public-key', { publicKey }),
};

export default api;