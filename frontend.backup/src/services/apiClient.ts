import axios from 'axios';
import { useAuthStore } from '../app/stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('apiClient baseURL:', apiClient.defaults.baseURL);
console.log('Debug: apiClient initialized');

apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('apiClient request:', config.method?.toUpperCase(), config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
// This is a placeholder for the actual token refresh logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Here you would typically call a refresh token endpoint
      // and then retry the original request.
      // For now, we'll just log out the user.
      const { logout } = useAuthStore.getState();
      logout();

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login' &&
          window.location.pathname !== '/register' &&
          window.location.pathname !== '/auth') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
