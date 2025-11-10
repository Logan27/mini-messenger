import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '@/pages/Login';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    isAuthenticated: vi.fn(),
    getStoredUser: vi.fn(),
  },
}));

// Mock socket service
vi.mock('@/services/socket.service', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    isReconnecting: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{component}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Login Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form with all fields', () => {
    renderWithProviders(<Login />);

    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const { authService } = await import('@/services/auth.service');

    vi.mocked(authService.login).mockResolvedValue({
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
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      },
    });

    renderWithProviders(<Login />);

    const identifierInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(identifierInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        identifier: 'testuser',
        password: 'password123',
      });
    });
  });

  it('should display error message on failed login', async () => {
    const user = userEvent.setup();
    const { authService } = await import('@/services/auth.service');

    // Mock error with response structure that AuthContext expects
    const mockError = new Error('Invalid credentials');
    mockError.response = {
      data: {
        message: 'Invalid credentials',
      },
    };
    vi.mocked(authService.login).mockRejectedValue(mockError);

    renderWithProviders(<Login />);

    const identifierInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(identifierInput, 'wronguser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    const { authService } = await import('@/services/auth.service');

    // Make login slow to check disabled state
    vi.mocked(authService.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderWithProviders(<Login />);

    const identifierInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(identifierInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check that inputs are disabled during submission
    expect(identifierInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  it('should have link to registration page', () => {
    renderWithProviders(<Login />);

    const registerLink = screen.getByRole('link', { name: /register here/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should have link to forgot password page', () => {
    renderWithProviders(<Login />);

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });
});
