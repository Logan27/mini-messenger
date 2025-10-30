import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Test data
const testUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user',
  isApproved: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const testMessage = {
  id: '1',
  content: 'Test message',
  senderId: '1',
  recipientId: '2',
  type: 'text',
  createdAt: '2024-01-01T10:00:00Z',
  isRead: false,
};

describe('API Integration Tests', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    server.resetHandlers();
  });

  describe('Authentication API', () => {
    it('should login successfully with valid credentials', async () => {
      server.use(
        http.post('/api/auth/login', async ({ request }) => {
          const { email, password } = await request.json();

          if (email === 'test@example.com' && password === 'password123') {
            return HttpResponse.json({
              user: testUser,
              token: 'valid-jwt-token',
              refreshToken: 'valid-refresh-token',
            });
          }

          return new HttpResponse(
            JSON.stringify({ message: 'Invalid credentials' }),
            { status: 401 }
          );
        })
      );

      const response = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.data).toMatchObject({
        user: testUser,
        token: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token',
      });
    });

    it('should handle login failure with invalid credentials', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Invalid credentials' }),
            { status: 401 }
          );
        })
      );

      await expect(
        apiClient.post('/auth/login', {
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('should register new user successfully', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      server.use(
        http.post('/api/auth/register', async ({ request }) => {
          const userData = await request.json();

          return HttpResponse.json({
            message: 'Registration successful',
            user: {
              id: '2',
              ...userData,
              role: 'user',
              isApproved: false,
              createdAt: new Date().toISOString(),
            },
          });
        })
      );

      const response = await apiClient.post('/auth/register', newUserData);

      expect(response.data).toMatchObject({
        message: 'Registration successful',
        user: {
          id: '2',
          ...newUserData,
          role: 'user',
          isApproved: false,
        },
      });
    });

    it('should logout successfully', async () => {
      server.use(
        http.post('/api/auth/logout', () => {
          return HttpResponse.json({ message: 'Logged out successfully' });
        })
      );

      const response = await apiClient.post('/auth/logout');

      expect(response.data).toMatchObject({
        message: 'Logged out successfully',
      });
    });
  });

  describe('User Management API', () => {
    it('should fetch current user profile', async () => {
      server.use(
        http.get('/api/users/me', ({ cookies }) => {
          const token = cookies.token;

          if (token === 'valid-jwt-token') {
            return HttpResponse.json(testUser);
          }

          return new HttpResponse(
            JSON.stringify({ message: 'Unauthorized' }),
            { status: 401 }
          );
        })
      );

      // Set auth token in cookies for the request
      const response = await apiClient.get('/users/me', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toEqual(testUser);
    });

    it('should search users successfully', async () => {
      const searchResults = [
        { ...testUser, name: 'Test User' },
        { ...testUser, id: '3', name: 'Another Test User' },
      ];

      server.use(
        http.get('/api/users/search', ({ url, cookies }) => {
          const token = cookies.token;
          const query = url.searchParams.get('q');

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          const filteredResults = searchResults.filter(user =>
            user.name.toLowerCase().includes(query?.toLowerCase() || '')
          );

          return HttpResponse.json(filteredResults);
        })
      );

      const response = await apiClient.get('/users/search?q=test', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toContain('Test');
    });

    it('should handle unauthorized requests', async () => {
      server.use(
        http.get('/api/users/me', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Unauthorized' }),
            { status: 401 }
          );
        })
      );

      await expect(
        apiClient.get('/users/me')
      ).rejects.toThrow();
    });
  });

  describe('Messaging API', () => {
    it('should fetch messages successfully', async () => {
      const messages = [testMessage];

      server.use(
        http.get('/api/messages', ({ url, cookies }) => {
          const token = cookies.token;
          const recipientId = url.searchParams.get('recipientId');

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          return HttpResponse.json({
            messages,
            pagination: {
              page: 1,
              limit: 50,
              total: 1,
              pages: 1,
            },
          });
        })
      );

      const response = await apiClient.get('/messages?recipientId=2', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toMatchObject({
        messages,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should send message successfully', async () => {
      const newMessageData = {
        content: 'New test message',
        recipientId: '2',
        type: 'text',
      };

      server.use(
        http.post('/api/messages', async ({ request, cookies }) => {
          const token = cookies.token;

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          const messageData = await request.json();

          return HttpResponse.json({
            id: '2',
            ...messageData,
            senderId: '1',
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        })
      );

      const response = await apiClient.post('/messages', newMessageData, {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toMatchObject({
        ...newMessageData,
        id: '2',
        senderId: '1',
        isRead: false,
      });
    });

    it('should handle message validation errors', async () => {
      server.use(
        http.post('/api/messages', () => {
          return new HttpResponse(
            JSON.stringify({
              message: 'Validation failed',
              errors: ['Content is required', 'Recipient ID is required'],
            }),
            { status: 400 }
          );
        })
      );

      await expect(
        apiClient.post('/messages', {}, {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('File Upload API', () => {
    it('should upload file successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      server.use(
        http.post('/api/files/upload', async ({ cookies }) => {
          const token = cookies.token;

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          return HttpResponse.json({
            id: 'file1',
            filename: 'test.txt',
            url: 'https://example.com/files/test.txt',
            size: 12,
            mimeType: 'text/plain',
            uploadedAt: new Date().toISOString(),
          });
        })
      );

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toMatchObject({
        id: 'file1',
        filename: 'test.txt',
        size: 12,
        mimeType: 'text/plain',
      });
    });

    it('should handle file upload errors', async () => {
      server.use(
        http.post('/api/files/upload', () => {
          return new HttpResponse(
            JSON.stringify({
              message: 'File upload failed',
              errors: ['File too large', 'Invalid file type'],
            }),
            { status: 400 }
          );
        })
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      await expect(
        apiClient.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Cookie: 'token=valid-jwt-token',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Group Management API', () => {
    it('should fetch groups successfully', async () => {
      const groups = [
        {
          id: '1',
          name: 'Test Group',
          description: 'A test group',
          avatar: 'https://example.com/group.jpg',
          createdBy: '1',
          createdAt: '2024-01-01T00:00:00Z',
          members: ['1', '2'],
        },
      ];

      server.use(
        http.get('/api/groups', ({ cookies }) => {
          const token = cookies.token;

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          return HttpResponse.json(groups);
        })
      );

      const response = await apiClient.get('/groups', {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toEqual(groups);
    });

    it('should create group successfully', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new test group',
        members: ['2', '3'],
      };

      server.use(
        http.post('/api/groups', async ({ request, cookies }) => {
          const token = cookies.token;

          if (token !== 'valid-jwt-token') {
            return new HttpResponse(
              JSON.stringify({ message: 'Unauthorized' }),
              { status: 401 }
            );
          }

          const data = await request.json();

          return HttpResponse.json({
            id: '2',
            ...data,
            createdBy: '1',
            createdAt: new Date().toISOString(),
            members: ['1', ...data.members],
          });
        })
      );

      const response = await apiClient.post('/groups', groupData, {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(response.data).toMatchObject({
        id: '2',
        ...groupData,
        createdBy: '1',
        members: ['1', '2', '3'],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get('/api/users/me', () => {
          return HttpResponse.error();
        })
      );

      await expect(
        apiClient.get('/users/me', {
          headers: {
            Cookie: 'token=valid-jwt-token',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle server errors with proper error messages', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return new HttpResponse(
            JSON.stringify({
              message: 'Internal server error',
              code: 'SERVER_ERROR',
            }),
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.message).toBe('Internal server error');
        expect(error.response.data.code).toBe('SERVER_ERROR');
      }
    });

    it('should handle rate limiting', async () => {
      server.use(
        http.post('/api/auth/login', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Too many requests' }),
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': '5',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Date.now() + 60000),
              },
            }
          );
        })
      );

      try {
        await apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.headers['x-ratelimit-limit']).toBe('5');
      }
    });
  });

  describe('Request/Response Headers', () => {
    it('should include proper headers in requests', async () => {
      let requestHeaders: Headers;

      server.use(
        http.post('/api/messages', async ({ request }) => {
          requestHeaders = request.headers;

          return HttpResponse.json({
            id: '2',
            content: 'Test message',
            senderId: '1',
            recipientId: '2',
            type: 'text',
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        })
      );

      await apiClient.post('/messages', {
        content: 'Test message',
        recipientId: '2',
        type: 'text',
      }, {
        headers: {
          Cookie: 'token=valid-jwt-token',
        },
      });

      expect(requestHeaders?.get('Cookie')).toBe('token=valid-jwt-token');
    });

    it('should handle CSRF tokens properly', async () => {
      server.use(
        http.get('/api/csrf-token', () => {
          return HttpResponse.json({ csrfToken: 'test-csrf-token' });
        })
      );

      const response = await apiClient.get('/csrf-token');

      expect(response.data.csrfToken).toBe('test-csrf-token');
    });
  });
});