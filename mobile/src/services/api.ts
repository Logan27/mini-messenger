import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';
const WS_BASE_URL = Constants.expoConfig?.extra?.wsUrl || 'ws://localhost:4000';

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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      // You might want to navigate to login screen here
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
    if (this.socket?.connected) return;

    this.socket = require('socket.io-client')(WS_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      this.attemptReconnect(token);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
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
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(token);
      }, this.reconnectInterval * this.reconnectAttempts);
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
  login: (credentials: { email: string; password: string }) =>
    api.post('/api/v1/auth/login', credentials),

  register: (userData: { email: string; password: string; name: string }) =>
    api.post('/api/v1/auth/register', userData),

  refreshToken: () =>
    api.post('/api/v1/auth/refresh'),

  logout: () =>
    api.post('/api/v1/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    api.post('/api/v1/auth/verify-email', { token }),
};

export const messagingAPI = {
  getConversations: () =>
    api.get('/api/v1/conversations'),

  getConversation: (conversationId: string) =>
    api.get(`/api/v1/conversations/${conversationId}`),

  sendMessage: (conversationId: string, content: string, type: string = 'text') =>
    api.post(`/api/v1/conversations/${conversationId}/messages`, { content, type }),

  editMessage: (conversationId: string, messageId: string, content: string) =>
    api.put(`/api/v1/conversations/${conversationId}/messages/${messageId}`, { content }),

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete(`/api/v1/conversations/${conversationId}/messages/${messageId}`),

  markAsRead: (conversationId: string, messageId: string) =>
    api.post(`/api/v1/conversations/${conversationId}/messages/${messageId}/read`),
};

export const fileAPI = {
  uploadFile: (file: any, conversationId?: string) => {
    const formData = new FormData();
    formData.append('file', file);

    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    return api.post('/api/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFile: (fileId: string) =>
    api.get(`/api/v1/files/${fileId}`),

  deleteFile: (fileId: string) =>
    api.delete(`/api/v1/files/${fileId}`),
};

export const userAPI = {
  getProfile: () =>
    api.get('/api/v1/users/me'),

  updateProfile: (data: any) =>
    api.put('/api/v1/users/me', data),

  searchUsers: (query: string) =>
    api.get(`/api/v1/users/search?q=${encodeURIComponent(query)}`),

  getContacts: () =>
    api.get('/api/v1/contacts'),
};

export default api;