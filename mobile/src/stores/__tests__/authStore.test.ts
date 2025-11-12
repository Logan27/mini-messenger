import { useAuthStore } from '../authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock API
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      biometricAvailable: false,
      biometricEnabled: false,
      isBiometricLoading: false,
      accountStatus: null,
      refreshTokenInProgress: false,
      error: null,
      lastTokenRefresh: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        isEmailVerified: true,
      };
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (authAPI.login as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            user: mockUser,
            tokens: mockTokens,
          },
        },
      });

      const { login } = useAuthStore.getState();
      await login({ identifier: 'test@example.com', password: 'password123' });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockTokens.accessToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', mockTokens.accessToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken);
    });

    it('handles login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authAPI.login as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { error: errorMessage },
        },
      });

      const { login } = useAuthStore.getState();

      await expect(login({ identifier: 'test@example.com', password: 'wrong' })).rejects.toThrow(errorMessage);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('sets loading state during login', async () => {
      (authAPI.login as jest.Mock).mockImplementationOnce(() => {
        const state = useAuthStore.getState();
        expect(state.isLoading).toBe(true);
        return Promise.resolve({
          data: {
            data: {
              user: { id: '1' },
              tokens: { accessToken: 'token', refreshToken: 'refresh' },
            },
          },
        });
      });

      const { login } = useAuthStore.getState();
      await login({ identifier: 'test@example.com', password: 'password123' });
    });
  });

  describe('register', () => {
    it('successfully registers a new user', async () => {
      (authAPI.register as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const { register } = useAuthStore.getState();
      await register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(authAPI.register).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        // confirmPassword should be removed
      });
    });

    it('handles registration failure', async () => {
      const errorMessage = 'Username already exists';
      (authAPI.register as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { error: errorMessage },
        },
      });

      const { register } = useAuthStore.getState();

      await expect(
        register({
          username: 'existinguser',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      ).rejects.toThrow(errorMessage);

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('successfully logs out and clears state', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', username: 'test', email: 'test@example.com', isEmailVerified: true },
        token: 'mock-token',
        isAuthenticated: true,
      });

      (authAPI.logout as jest.Mock).mockResolvedValueOnce({});

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['authToken', 'user', 'refreshToken']);
    });

    it('clears state even if API call fails', async () => {
      useAuthStore.setState({
        user: { id: '1', username: 'test', email: 'test@example.com', isEmailVerified: true },
        token: 'mock-token',
        isAuthenticated: true,
      });

      (authAPI.logout as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('restores auth state from storage', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        isEmailVerified: true,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'authToken') return Promise.resolve('mock-token');
        if (key === 'user') return Promise.resolve(JSON.stringify(mockUser));
        if (key === 'refreshToken') return Promise.resolve('mock-refresh-token');
        return Promise.resolve(null);
      });

      (authAPI.refreshToken as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            tokens: { accessToken: 'new-token' },
          },
        },
      });

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('clears state when no token found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('clears state when token refresh fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'authToken') return Promise.resolve('mock-token');
        if (key === 'user') return Promise.resolve(JSON.stringify({ id: '1' }));
        if (key === 'refreshToken') return Promise.resolve('mock-refresh-token');
        return Promise.resolve(null);
      });

      (authAPI.refreshToken as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Session expired. Please log in again.');
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-refresh-token');
      (authAPI.refreshToken as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            tokens: { accessToken: 'new-access-token' },
          },
        },
      });

      const { refreshToken } = useAuthStore.getState();
      const result = await refreshToken();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.token).toBe('new-access-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-access-token');
    });

    it('returns false when no refresh token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { refreshToken } = useAuthStore.getState();
      const result = await refreshToken();

      expect(result).toBe(false);
    });

    it('prevents concurrent refresh requests', async () => {
      useAuthStore.setState({ refreshTokenInProgress: true });

      const { refreshToken } = useAuthStore.getState();
      const result = await refreshToken();

      expect(result).toBe(false);
      expect(authAPI.refreshToken).not.toHaveBeenCalled();
    });

    it('handles refresh failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-refresh-token');
      (authAPI.refreshToken as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

      const { refreshToken } = useAuthStore.getState();
      const result = await refreshToken();

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.error).toBe('Failed to refresh session');
    });
  });

  describe('setUser', () => {
    it('updates user state', () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        isEmailVerified: true,
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('error handling', () => {
    it('handles network errors during login', async () => {
      (authAPI.login as jest.Mock).mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ECONNREFUSED',
      });

      const { login } = useAuthStore.getState();

      await expect(login({ identifier: 'test@example.com', password: 'password' })).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });
});
