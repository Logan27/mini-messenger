import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import apiClient from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: '123',
              username: 'testuser',
              email: 'test@example.com',
              status: 'active',
              role: 'user',
            },
            tokens: {
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-123',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const credentials = {
        identifier: 'testuser',
        password: 'password123',
      };

      const result = await authService.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result.success).toBe(true);
      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-123');
      expect(localStorage.getItem('user')).toBeTruthy();
    });

    it('should not store tokens if login fails', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Invalid credentials',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const credentials = {
        identifier: 'testuser',
        password: 'wrongpassword',
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Registration successful',
          data: {
            user: {
              id: '123',
              username: 'newuser',
              email: 'new@example.com',
              status: 'pending',
              role: 'user',
            },
            tokens: {
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-123',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const registerData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const result = await authService.register(registerData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result.success).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout and clear stored data', async () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      localStorage.setItem('user', JSON.stringify({ id: '123' }));

      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear data even if API call fails', async () => {
      localStorage.setItem('accessToken', 'token');

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      try {
        await authService.logout();
      } catch (error) {
        // Error is expected, we just want to verify localStorage is cleared
      }

      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          data: {
            user: mockUser,
          },
        },
      });

      const user = await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(user).toEqual(mockUser);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when access token does not exist', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getStoredUser', () => {
    it('should return stored user', () => {
      const mockUser = { id: '123', username: 'testuser' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const user = authService.getStoredUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user is stored', () => {
      const user = authService.getStoredUser();
      expect(user).toBeNull();
    });
  });
});
