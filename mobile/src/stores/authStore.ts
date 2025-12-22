import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import api, { authAPI, refreshAuthToken, wsService, encryptionAPI } from '../services/api';
import { encryptionService } from '../services/encryptionService';
import { User, LoginCredentials, RegisterForm, AccountStatus, BiometricAuthResult } from '../types';
import { isTokenExpired } from '../utils/auth';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  isBiometricLoading: boolean;
  accountStatus: AccountStatus | null;
  refreshTokenInProgress: boolean;
  lastTokenRefresh: Date | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkAccountStatus: (email: string) => Promise<AccountStatus>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  authenticateWithBiometric: () => Promise<BiometricAuthResult>;
  storeBiometricCredentials: (email: string, password: string) => Promise<void>;
  getBiometricCredentials: () => Promise<{ email: string; password: string } | null>;
  clearBiometricCredentials: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      biometricAvailable: false,
      biometricEnabled: false,
      isBiometricLoading: false,
      accountStatus: null,
      refreshTokenInProgress: false,
      lastTokenRefresh: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.login(credentials);
          const data = response.data.data || response.data;
          const { user, tokens } = data;
          const { accessToken, refreshToken } = tokens;

          // Save to AsyncStorage first to ensure it's available for request interceptor
          await AsyncStorage.setItem('authToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);
          await AsyncStorage.setItem('user', JSON.stringify(user));

          // Update API default headers immediately
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Connect WebSocket
          wsService.connect(accessToken);

          // Setup Encryption Keys
          try {
            const existingKeys = await encryptionService.loadKeys();
            if (!existingKeys) {
              const keys = await encryptionService.generateKeyPair();
              await encryptionAPI.updatePublicKey(keys.publicKey);
            } else {
              // Ensure server has our public key (optional, but good for sync)
              // For now, we assume if we have keys, the server likely has them or we don't want to rotate blindly
              // But we could fetch server key and check?
            }
          } catch (cryptoError) {
            console.error('Encryption setup failed:', cryptoError);
            // Non-fatal, but E2E won't work
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      register: async (userData: RegisterForm) => {
        set({ isLoading: true });

        try {
          // Remove confirmPassword before sending to API
          const { confirmPassword, ...registrationData } = userData;
          await authAPI.register(registrationData);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
          throw new Error(errorMessage);
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
          await authAPI.logoutAll();
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
          await encryptionService.clearKeys();
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          const token = await AsyncStorage.getItem('authToken');
          const userString = await AsyncStorage.getItem('user');

          if (token && userString) {
            const user = JSON.parse(userString);

            // Check if token is expired or about to expire
            if (isTokenExpired(token)) {
              console.log('Token expired or expiring soon, refreshing...');
              // Token expired, attempt refresh
              try {
                await get().refreshToken();
                // If refresh successful, state is updated by refreshToken
                return;
              } catch (refreshError) {
                console.log('Initial token refresh failed:', refreshError);
                // Refresh failed, clear auth
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
                await AsyncStorage.multiRemove(['authToken', 'user', 'refreshToken']);
                return;
              }
            }

            // Update API default headers immediately
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Set authenticated state immediately if we have a valid token
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Connect WebSocket with existing token
            wsService.connect(token);
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
        // Prevent concurrent refresh requests initiated from store
        if (get().refreshTokenInProgress) {
          return false;
        }

        set({ refreshTokenInProgress: true });

        try {
          // Use the shared refresh logic from api.ts
          // This handles locking with the interceptor and updates AsyncStorage
          const { accessToken } = await refreshAuthToken();

          set({
            token: accessToken,
            isAuthenticated: true,
            refreshTokenInProgress: false,
            lastTokenRefresh: new Date(),
            error: null,
          });

          return true;
        } catch (error) {
          console.error('Token refresh error:', error);

          // If refresh fails, clear auth state
          // refreshAuthToken already clears AsyncStorage
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            refreshTokenInProgress: false,
            error: 'Session expired',
          });

          return false;
        }
      },

      checkAccountStatus: async (email: string): Promise<AccountStatus> => {
        try {
          const response = await authAPI.checkAccountStatus(email);
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