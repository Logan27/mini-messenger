import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '@/services/auth.service';
import { socketService } from '@/services/socket.service';
import { useNavigate } from 'react-router-dom';
import { preloadCriticalRoutes, preloadAdminRoutes } from '@/utils/routePreload';
import { encryptionService } from '@/services/encryptionService';
import { encryptionAPI } from '@/lib/api-client';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  status: string;
  role: string;
  bio?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
  settings?: {
    showOnlineStatus?: boolean;
    sendReadReceipts?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Wrapper for setUser that also updates localStorage
  const updateUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const storedUser = authService.getStoredUser();
    const token = localStorage.getItem('accessToken');

    if (storedUser && token) {
      setUser(storedUser);
      // Connect WebSocket immediately on page load

      // Small delay to ensure DOM is ready and prevent race conditions
      setTimeout(() => {
        socketService.connect(token);
      }, 100);

      // Request notification permission
      requestNotificationPermission();

      // Check and restore encryption keys on reload with sync verification
      const checkKeys = async () => {
        // Clear all cached public keys on reload to prevent stale key issues
        try {
          Object.keys(localStorage).filter(key => key.startsWith('public_key_')).forEach(key => {
            localStorage.removeItem(key);
          });
          Object.keys(localStorage).filter(key => key.startsWith('public_key_')).forEach(key => {
            localStorage.removeItem(key);
          });
        } catch (e) {
          // Ignore error
        }

        try {
          let keys = encryptionService.loadKeys();
          if (!keys) {
            keys = await encryptionService.generateKeyPair();
            encryptionService.storeKeys(keys.publicKey, keys.secretKey);
            await encryptionAPI.uploadPublicKey(keys.publicKey);
          } else {
            // Verify keys match server
            try {
              const userId = storedUser.id;
              const serverKeyResponse = await encryptionAPI.getPublicKey(userId);
              const serverKey = serverKeyResponse.data?.data?.publicKey;

              if (serverKey && serverKey !== keys.publicKey) {
                await encryptionAPI.uploadPublicKey(keys.publicKey);
              } else if (!serverKey) {
                await encryptionAPI.uploadPublicKey(keys.publicKey);
              }
            } catch (syncError) {
              console.error('Key sync check failed:', syncError);
            }
          }
        } catch (error) {
          console.error('Failed to restore/generate keys:', error);
        }
      };
      checkKeys();
    }

    setIsLoading(false);
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
        } else {
          console.log('❌ Notification permission denied');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await authService.login({ identifier, password });
      updateUser(response.data.user);

      // Connect WebSocket (socket service has guards against duplicate connections)
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketService.connect(token);
      }

      // Request notification permission on login
      requestNotificationPermission();

      // Preload critical routes for better navigation performance
      preloadCriticalRoutes();

      // Clear all cached public keys to prevent stale key issues
      // Keys are cached with prefix 'public_key_'
      Object.keys(localStorage).filter(key => key.startsWith('public_key_')).forEach(key => {
        localStorage.removeItem(key);
      });

      // Setup E2E Encryption Keys with server sync verification
      try {
        let keys = encryptionService.loadKeys();
        if (!keys) {
          // No local keys - generate new ones and upload
          keys = await encryptionService.generateKeyPair();
          encryptionService.storeKeys(keys.publicKey, keys.secretKey);
          await encryptionAPI.uploadPublicKey(keys.publicKey);
        } else {
          // Local keys exist - verify they match the server
          try {
            const userId = response.data.user.id;
            const serverKeyResponse = await encryptionAPI.getPublicKey(userId);
            const serverKey = serverKeyResponse.data?.data?.publicKey;

            if (serverKey && serverKey !== keys.publicKey) {
              // Keys don't match! Re-upload local key to server
              await encryptionAPI.uploadPublicKey(keys.publicKey);
            } else if (!serverKey) {
              // No key on server - upload local key
              await encryptionAPI.uploadPublicKey(keys.publicKey);
            }
          } catch (syncError) {
            // Ignore sync error during login, proceed
          }
        }
      } catch (keyError) {
        console.error('Encryption setup failed:', keyError);
      }

      // Preload admin routes if user is an admin
      if (response.data.user.role === 'admin') {
        preloadAdminRoutes();
      }

      navigate('/');
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      await authService.register(data);
      // After registration, user needs admin approval
      navigate('/login?registered=true');
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      socketService.disconnect();
      encryptionService.clearKeys();
      updateUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      socketService.disconnect();
      encryptionService.clearKeys();
      updateUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
