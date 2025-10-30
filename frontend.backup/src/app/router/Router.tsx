import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ProfilePage } from '@/pages/ProfilePage';
import Chat from '@/pages/Chat';
import Dashboard from '@/pages/Dashboard';
import { AppLayout } from '@/app/AppLayout';
import Auth from '@/pages/Auth';
import { useAuthStore } from '../stores/authStore';

export function Router() {
  const { user } = useAuthStore();

  const router = createBrowserRouter([
    // Auth routes (no layout)
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/register',
      element: <RegisterPage />,
    },
    {
      path: '/forgot-password',
      element: <ForgotPasswordPage />,
    },
    {
      path: '/reset-password/:token',
      element: <ResetPasswordPage />,
    },
    {
      path: '/auth',
      element: <Auth />,
    },
    // Chat routes (no AppLayout wrapper)
    {
      path: '/',
      element: user ? <Chat /> : <LoginPage />,
    },
    {
      path: '/chats',
      element: user ? <Chat /> : <LoginPage />,
    },
    {
      path: '/chat',
      element: user ? <Chat /> : <LoginPage />,
    },
    {
      path: '/conversations',
      element: user ? <Chat /> : <LoginPage />,
    },
    // Admin routes with AppLayout
    {
      path: '/dashboard',
      element: user ? <AppLayout /> : <LoginPage />,
      children: [
        {
          index: true,
          element: <Dashboard />,
        },
      ],
    },
    {
      path: '/profile',
      element: user ? <AppLayout /> : <LoginPage />,
      children: [
        {
          index: true,
          element: <ProfilePage />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}
