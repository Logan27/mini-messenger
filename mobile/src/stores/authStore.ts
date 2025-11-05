import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { authAPI } from '../services/api';
import { User, AuthState, LoginForm, RegisterForm, BiometricAuthResult } from '../types';
import * as SecureStore from 'expo-secure-store';

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'active';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkAccountStatus: (email: string) => Promise<AccountStatus>;
  authenticateWithBiometric: () => Promise<BiometricAuthResult>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  storeBiometricCredentials: (email: string, password: string) => Promise<void>;
  getBiometricCredentials: () => Promise<{ email: string; password: string } | null>;
  clearBiometricCredentials: () => Promise<void>;
  setUser: (user: User) => void;

  // State
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  isBiometricLoading: boolean;
  accountStatus: AccountStatus | null;
  refreshTokenInProgress: boolean;
  error: string | null;
  lastTokenRefresh: Date | null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Actions
      login: async (credentials: LoginForm) => {
        set({ isLoading: true });

        try {
          const response = await authAPI.login(credentials);
          const { user, token } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store token for API calls
          await AsyncStorage.setItem('authToken', token);
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      register: async (userData: RegisterForm) => {
        set({ isLoading: true });

        try {
          await authAPI.register(userData);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Registration failed');
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear local state regardless of API call result
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });

          await AsyncStorage.multiRemove(['authToken', 'user', 'refreshToken']);
          // Don't clear biometric credentials or biometricEnabled
        }
      },

      logoutAll: async () => {
        try {
          // Import api at runtime to avoid circular dependency
          const { default: api } = await import('../services/api');
          await api.post('/api/auth/logout-all');
        } catch (error) {
          console.error('Logout all error:', error);
        } finally {
          // Clear everything including biometric
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            biometricEnabled: false,
            error: null,
          });

          await AsyncStorage.multiRemove(['authToken', 'user', 'refreshToken']);
          await get().clearBiometricCredentials();
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          const token = await AsyncStorage.getItem('authToken');
          const userString = await AsyncStorage.getItem('user');

          if (token && userString) {
            const user = JSON.parse(userString);

            // Try to refresh token if needed
            const refreshSuccess = await get().refreshToken();

            if (refreshSuccess) {
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              throw new Error('Token refresh failed');
            }
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          // Token invalid, clear auth state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired. Please log in again.',
          });

          await AsyncStorage.multiRemove(['authToken', 'user', 'refreshToken']);
        }
      },

      refreshToken: async (): Promise<boolean> => {
        // Prevent concurrent refresh requests
        if (get().refreshTokenInProgress) {
          return false;
        }

        set({ refreshTokenInProgress: true });

        try {
          const response = await authAPI.refreshToken();
          const { token: newToken } = response.data;

          set({
            token: newToken,
            refreshTokenInProgress: false,
            lastTokenRefresh: new Date(),
            error: null,
          });

          await AsyncStorage.setItem('authToken', newToken);
          return true;
        } catch (error: any) {
          console.error('Token refresh error:', error);
          set({
            refreshTokenInProgress: false,
            error: 'Failed to refresh session',
          });
          return false;
        }
      },

      checkAccountStatus: async (email: string): Promise<AccountStatus> => {
        try {
          const { default: api } = await import('../services/api');
          const response = await api.get('/api/auth/account-status', {
            params: { email },
          });

          const status: AccountStatus = response.data.status;
          set({ accountStatus: status });
          return status;
        } catch (error: any) {
          console.error('Check account status error:', error);

          // If 401/403, likely pending
          if (error.response?.status === 401 || error.response?.status === 403) {
            set({ accountStatus: 'pending' });
            return 'pending';
          }

          throw error;
        }
      },

      authenticateWithBiometric: async (): Promise<BiometricAuthResult> => {
        try {
          const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
          const hasBiometric = biometricTypes.length > 0;

          if (!hasBiometric) {
            return { success: false, error: 'Biometric authentication not available' };
          }

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access Messenger',
            fallbackLabel: 'Use password',
          });

          if (result.success) {
            return { success: true, biometricType: biometricTypes[0] as any };
          } else {
            return { success: false, error: result.error || 'Authentication failed' };
          }
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      enableBiometric: async (): Promise<boolean> => {
        set({ isBiometricLoading: true });

        try {
          const result = await get().authenticateWithBiometric();

          if (result.success) {
            set({ biometricEnabled: true, isBiometricLoading: false });
            return true;
          } else {
            set({ isBiometricLoading: false });
            return false;
          }
        } catch (error) {
          set({ isBiometricLoading: false });
          return false;
        }
      },

      disableBiometric: () => {
        set({ biometricEnabled: false });
      },

      storeBiometricCredentials: async (email: string, password: string) => {
        try {
          await SecureStore.setItemAsync('biometric_email', email);
          await SecureStore.setItemAsync('biometric_password', password);
        } catch (error) {
          console.error('Store biometric credentials error:', error);
          throw error;
        }
      },

      getBiometricCredentials: async () => {
        try {
          const email = await SecureStore.getItemAsync('biometric_email');
          const password = await SecureStore.getItemAsync('biometric_password');

          if (email && password) {
            return { email, password };
          }

          return null;
        } catch (error) {
          console.error('Get biometric credentials error:', error);
          return null;
        }
      },

      clearBiometricCredentials: async () => {
        try {
          await SecureStore.deleteItemAsync('biometric_email');
          await SecureStore.deleteItemAsync('biometric_password');
        } catch (error) {
          console.error('Clear biometric credentials error:', error);
        }
      },

      setUser: (user: User) => {
        set({ user });
        AsyncStorage.setItem('user', JSON.stringify(user));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        accountStatus: state.accountStatus,
        // Don't persist sensitive data like tokens, user, or credentials
      }),
    }
  )
);

// Initialize biometric availability check
LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
  useAuthStore.setState({ biometricAvailable: types.length > 0 });
});