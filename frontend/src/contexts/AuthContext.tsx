import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '@/services/auth.service';
import { socketService } from '@/services/socket.service';
import { useNavigate } from 'react-router-dom';

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
    console.log('🟢 AuthContext: Updating user:', newUser);
    setUser(newUser);
    if (newUser) {
      console.log('🟢 AuthContext: Saving to localStorage');
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      console.log('🟢 AuthContext: Removing from localStorage');
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const storedUser = authService.getStoredUser();
    const token = localStorage.getItem('accessToken');

    console.log('🟡 AuthContext: Loading from localStorage:', storedUser);

    if (storedUser && token) {
      setUser(storedUser);
      // Connect WebSocket (socket service has guards against duplicate connections)
      console.log('🟡 AuthContext: Connecting WebSocket...');
      socketService.connect(token);
      // Request notification permission
      requestNotificationPermission();
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
        console.log('🟡 AuthContext: Connecting WebSocket after login...');
        socketService.connect(token);
      }

      // Request notification permission on login
      requestNotificationPermission();

      navigate('/');
    } catch (error: any) {
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
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      socketService.disconnect();
      updateUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      socketService.disconnect();
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
