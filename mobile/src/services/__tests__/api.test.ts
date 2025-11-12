import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies before importing the module
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../utils/logger');

// Mock axios - define the instance inside the mock factory
jest.mock('axios', () => {
  const mockAxiosInstance: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((fulfilled, rejected) => {
          mockAxiosInstance._requestInterceptor = { fulfilled, rejected };
          return 0;
        }),
      },
      response: {
        use: jest.fn((fulfilled, rejected) => {
          mockAxiosInstance._responseInterceptor = { fulfilled, rejected };
          return 0;
        }),
      },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
    _requestInterceptor: null as any,
    _responseInterceptor: null as any,
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
  };
});

// Get reference to the mock instance after it's created
let mockAxiosInstance: any;
const axios = require('axios');
mockAxiosInstance = axios.default.create();

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
  id: 'mock-socket-id',
};

jest.mock('socket.io-client', () => jest.fn(() => mockSocket));

// Now import the API module
import {
  authAPI,
  messagingAPI,
  fileAPI,
  userAPI,
  groupAPI,
  contactAPI,
  wsService,
} from '../api';

describe('API Service', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset axios instance methods
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockAxiosInstance.delete.mockReset();

    // Reset socket mock
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Request Interceptor', () => {
    it('adds auth token to request headers when token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');

      const config: any = { headers: {} };
      const interceptor = mockAxiosInstance._requestInterceptor.fulfilled;
      const result = await interceptor(config);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('authToken');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not add auth header when token does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const config: any = { headers: {} };
      const interceptor = mockAxiosInstance._requestInterceptor.fulfilled;
      const result = await interceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('passes through successful responses', async () => {
      const response = { data: 'test', status: 200 };
      const interceptor = mockAxiosInstance._responseInterceptor.fulfilled;

      const result = await interceptor(response);

      expect(result).toBe(response);
    });

    it('passes through non-401 errors', async () => {
      const error = {
        response: { status: 500 },
        config: {},
      };

      const interceptor = mockAxiosInstance._responseInterceptor.rejected;

      await expect(interceptor(error)).rejects.toBe(error);
    });
  });

  describe('WebSocketService', () => {
    it('connects to WebSocket with token', () => {
      const token = 'test-token';
      wsService.connect(token);

      const socketIO = require('socket.io-client');
      expect(socketIO).toHaveBeenCalledWith(
        expect.any(String),
        {
          auth: { token },
          transports: ['websocket'],
        }
      );
    });

    it('does not reconnect if already connected', () => {
      mockSocket.connected = true;
      const socketIO = require('socket.io-client');
      socketIO.mockClear();

      wsService.connect('token');

      expect(socketIO).not.toHaveBeenCalled();
    });

    it('sets up event listeners on connect', () => {
      mockSocket.connected = false;
      wsService.connect('test-token');

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('disconnects properly', () => {
      mockSocket.connected = false;
      wsService.connect('test-token');
      wsService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('allows registering custom event listeners', () => {
      mockSocket.connected = false;
      wsService.connect('test-token');
      const callback = jest.fn();

      wsService.on('custom_event', callback);

      expect(mockSocket.on).toHaveBeenCalledWith('custom_event', callback);
    });

    it('allows removing event listeners', () => {
      mockSocket.connected = false;
      wsService.connect('test-token');
      const callback = jest.fn();

      wsService.off('custom_event', callback);

      expect(mockSocket.off).toHaveBeenCalledWith('custom_event', callback);
    });

    it('emits events with data', () => {
      mockSocket.connected = false;
      wsService.connect('test-token');
      const data = { message: 'test' };

      wsService.emit('send_message', data);

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', data);
    });
  });

  describe('Auth API', () => {
    it('login sends POST request with credentials', async () => {
      const credentials = { identifier: 'user@test.com', password: 'password123' };
      const mockResponse = { data: { tokens: { accessToken: 'token' } }, status: 200 };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authAPI.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(result).toEqual(mockResponse);
    });

    it('register sends POST request with user data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
      };
      const mockResponse = { data: { user: userData }, status: 201 };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authAPI.register(userData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/register', userData);
      expect(result).toEqual(mockResponse);
    });

    it('refreshToken sends POST request with refresh token', async () => {
      const refreshToken = 'refresh-token-123';
      const mockResponse = { data: { tokens: { accessToken: 'new-token' } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authAPI.refreshToken(refreshToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken });
      expect(result).toEqual(mockResponse);
    });

    it('logout sends POST request', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await authAPI.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/logout');
    });

    it('forgotPassword sends POST request with email', async () => {
      const email = 'test@test.com';
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await authAPI.forgotPassword(email);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email });
    });

    it('resetPassword sends POST request with token and passwords', async () => {
      const token = 'reset-token';
      const password = 'newpass123';
      const confirmPassword = 'newpass123';
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await authAPI.resetPassword(token, password, confirmPassword);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });
    });

    it('verifyEmail sends POST request with token', async () => {
      const token = 'verify-token';
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await authAPI.verifyEmail(token);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/verify-email', { token });
    });
  });

  describe('Messaging API', () => {
    it('getConversations sends GET request', async () => {
      const mockResponse = { data: { conversations: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await messagingAPI.getConversations();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/messages/conversations');
    });

    it('getMessages sends GET request with params', async () => {
      const params = { conversationWith: 'user123', page: 1, limit: 20 };
      mockAxiosInstance.get.mockResolvedValue({ data: { messages: [] } });

      await messagingAPI.getMessages(params);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/messages', { params });
    });

    it('sendMessage sends POST request', async () => {
      const recipientId = 'user123';
      const content = 'Hello!';
      mockAxiosInstance.post.mockResolvedValue({ data: { message: {} } });

      await messagingAPI.sendMessage(recipientId, content);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/messages', {
        recipientId,
        content,
        type: 'text',
        replyTo: undefined,
        file: undefined,
      });
    });

    it('editMessage sends PUT request', async () => {
      const messageId = 'msg123';
      const content = 'Updated message';
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await messagingAPI.editMessage(messageId, content);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(`/api/messages/${messageId}`, { content });
    });

    it('deleteMessage sends DELETE request', async () => {
      const messageId = 'msg123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await messagingAPI.deleteMessage(messageId, true);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/messages/${messageId}`, {
        params: { deleteForEveryone: true },
      });
    });

    it('markAsRead sends POST request', async () => {
      const messageId = 'msg123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await messagingAPI.markAsRead(messageId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/messages/${messageId}/read`);
    });
  });

  describe('File API', () => {
    it('uploadFile sends POST request with FormData', async () => {
      const file = { uri: 'file://test.jpg', name: 'test.jpg', type: 'image/jpeg' };
      mockAxiosInstance.post.mockResolvedValue({ data: { fileId: 'file123' } });

      await fileAPI.uploadFile(file);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/files/upload',
        expect.any(Object), // FormData
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    });

    it('getFile sends GET request', async () => {
      const fileId = 'file123';
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await fileAPI.getFile(fileId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/files/${fileId}`);
    });

    it('deleteFile sends DELETE request', async () => {
      const fileId = 'file123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await fileAPI.deleteFile(fileId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/files/${fileId}`);
    });
  });

  describe('User API', () => {
    it('getProfile sends GET request', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { user: {} } });

      await userAPI.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/me');
    });

    it('updateProfile sends PUT request', async () => {
      const data = { firstName: 'John', lastName: 'Doe' };
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await userAPI.updateProfile(data);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users/me', data);
    });

    it('searchUsers sends GET request with query', async () => {
      const query = 'john';
      mockAxiosInstance.get.mockResolvedValue({ data: { users: [] } });

      await userAPI.searchUsers(query);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/search?query=john');
    });

    it('searchUsers encodes special characters in query', async () => {
      const query = 'john doe@test';
      mockAxiosInstance.get.mockResolvedValue({ data: { users: [] } });

      await userAPI.searchUsers(query);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/users/search?query=${encodeURIComponent(query)}`
      );
    });
  });

  describe('Group API', () => {
    it('getUserGroups sends GET request with params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { groups: [] } });

      await groupAPI.getUserGroups(1, 20, 'test', 'private');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/groups?')
      );
      const callArgs = mockAxiosInstance.get.mock.calls[0][0];
      expect(callArgs).toContain('page=1');
      expect(callArgs).toContain('limit=20');
      expect(callArgs).toContain('search=test');
      expect(callArgs).toContain('groupType=private');
    });

    it('getGroup sends GET request', async () => {
      const groupId = 'group123';
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await groupAPI.getGroup(groupId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/groups/${groupId}`);
    });

    it('createGroup sends POST request', async () => {
      const data = { name: 'Test Group', description: 'Test' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await groupAPI.createGroup(data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/groups', data);
    });

    it('updateGroup sends PUT request', async () => {
      const groupId = 'group123';
      const data = { name: 'Updated Group' };
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await groupAPI.updateGroup(groupId, data);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(`/api/groups/${groupId}`, data);
    });

    it('deleteGroup sends DELETE request', async () => {
      const groupId = 'group123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await groupAPI.deleteGroup(groupId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/groups/${groupId}`);
    });

    it('getGroupMembers sends GET request', async () => {
      const groupId = 'group123';
      mockAxiosInstance.get.mockResolvedValue({ data: { members: [] } });

      await groupAPI.getGroupMembers(groupId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/groups/${groupId}/members`);
    });

    it('addGroupMembers sends POST request', async () => {
      const groupId = 'group123';
      const userIds = ['user1', 'user2'];
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await groupAPI.addGroupMembers(groupId, userIds);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/groups/${groupId}/members`, {
        userIds,
      });
    });

    it('removeGroupMember sends DELETE request', async () => {
      const groupId = 'group123';
      const userId = 'user456';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await groupAPI.removeGroupMember(groupId, userId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/groups/${groupId}/members/${userId}`
      );
    });

    it('updateMemberRole sends PUT request', async () => {
      const groupId = 'group123';
      const userId = 'user456';
      const role = 'admin';
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await groupAPI.updateMemberRole(groupId, userId, role);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/groups/${groupId}/members/${userId}/role`,
        { role }
      );
    });
  });

  describe('Contact API', () => {
    it('getContacts sends GET request with params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { contacts: [] } });

      await contactAPI.getContacts('accepted', 1, 50);

      const callArgs = mockAxiosInstance.get.mock.calls[0][0];
      expect(callArgs).toContain('/api/contacts?');
      expect(callArgs).toContain('status=accepted');
      expect(callArgs).toContain('page=1');
      expect(callArgs).toContain('limit=50');
    });

    it('addContact sends POST request', async () => {
      const userId = 'user123';
      const nickname = 'John';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await contactAPI.addContact(userId, nickname);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/contacts', {
        userId,
        nickname,
        notes: undefined,
      });
    });

    it('acceptContact sends POST request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await contactAPI.acceptContact(contactId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/contacts/${contactId}/accept`);
    });

    it('deleteContact sends DELETE request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await contactAPI.deleteContact(contactId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/contacts/${contactId}`);
    });

    it('blockContact sends POST request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await contactAPI.blockContact(contactId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/contacts/${contactId}/block`);
    });

    it('unblockContact sends DELETE request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await contactAPI.unblockContact(contactId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/contacts/${contactId}/block`);
    });

    it('favoriteContact sends POST request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await contactAPI.favoriteContact(contactId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/contacts/${contactId}/favorite`);
    });

    it('updateContact sends PATCH request', async () => {
      const contactId = 'contact123';
      const data = { nickname: 'Johnny' };
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await contactAPI.updateContact(contactId, data);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/api/contacts/${contactId}`, data);
    });

    it('muteContact sends POST request', async () => {
      const contactId = 'contact123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await contactAPI.muteContact(contactId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/api/contacts/${contactId}/mute`);
    });
  });
});
