import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { authAPI } from '../services/api';
import { User, AuthState, LoginForm, RegisterForm, BiometricAuthResult } from '../types';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  authenticateWithBiometric: () => Promise<BiometricAuthResult>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;

  // State
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  isBiometricLoading: boolean;
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
            biometricEnabled: false,
          });

          await AsyncStorage.multiRemove(['authToken', 'user']);
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          const token = await AsyncStorage.getItem('authToken');
          const userString = await AsyncStorage.getItem('user');

          if (token && userString) {
            const user = JSON.parse(userString);

            // Verify token is still valid
            const response = await authAPI.refreshToken();

            set({
              user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
            });

            // Update stored token
            await AsyncStorage.setItem('authToken', response.data.token);
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
          });

          await AsyncStorage.multiRemove(['authToken', 'user']);
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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        // Don't persist sensitive data like tokens
      }),
    }
  )
);

// Initialize biometric availability check
LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
  useAuthStore.setState({ biometricAvailable: types.length > 0 });
});