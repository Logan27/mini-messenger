import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform } from 'react-native';
import LoginScreen from '../LoginScreen';

// API service is already mocked above

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the API service
const mockLoginUser = jest.fn();

jest.mock('../../../services/api', () => ({
  loginUser: mockLoginUser,
}));
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const { rerender, ...result } = render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );

  return { rerender, ...result };
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form elements', () => {
    renderWithQueryClient(<LoginScreen />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('forgot-password-button')).toBeTruthy();
    expect(getByTestId('register-link')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    renderWithQueryClient(<LoginScreen />);

    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email', async () => {
    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('successfully logs in with valid credentials', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      token: 'mock-token',
    };

    mockLoginUser.mockResolvedValueOnce(mockUser);

    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockSetItem).toHaveBeenCalledWith('userToken', 'mock-token');
    });
  });

  it('shows error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLoginUser.mockRejectedValueOnce(new Error(errorMessage));

    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  it('toggles password visibility', () => {
    renderWithQueryClient(<LoginScreen />);

    const passwordInput = getByTestId('password-input');
    const toggleButton = getByTestId('password-toggle');

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(toggleButton);

    // After toggle, password should be visible
    expect(passwordInput.props.secureTextEntry).toBe(false);

    fireEvent.press(toggleButton);

    // After second toggle, password should be hidden again
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('navigates to forgot password screen', () => {
    const mockNavigate = jest.fn();
    jest.mocked(require('@react-navigation/native').useNavigation).mockReturnValue({
      navigate: mockNavigate,
    });

    renderWithQueryClient(<LoginScreen />);

    const forgotPasswordButton = getByTestId('forgot-password-button');
    fireEvent.press(forgotPasswordButton);

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to register screen', () => {
    const mockNavigate = jest.fn();
    jest.mocked(require('@react-navigation/native').useNavigation).mockReturnValue({
      navigate: mockNavigate,
    });

    renderWithQueryClient(<LoginScreen />);

    const registerLink = getByTestId('register-link');
    fireEvent.press(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('disables login button during loading', async () => {
    // Mock a delayed response
    mockLoginUser.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 1000))
    );

    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    // Button should be disabled during loading
    expect(loginButton.props.disabled).toBe(true);

    await waitFor(() => {
      expect(loginButton.props.disabled).toBe(false);
    }, { timeout: 2000 });
  });

  it('handles network errors gracefully', async () => {
    mockLoginUser.mockRejectedValueOnce(new Error('Network Error'));

    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Network Error')).toBeTruthy();
    });
  });

  it('clears error message when user starts typing', async () => {
    mockLoginUser.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    // Trigger an error
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });

    // Clear error by typing
    fireEvent.changeText(emailInput, 'test@example.com');

    await waitFor(() => {
      expect(queryByText('Invalid credentials')).toBeNull();
    });
  });

  it('handles keyboard dismissal', () => {
    renderWithQueryClient(<LoginScreen />);

    const emailInput = getByTestId('email-input');

    // Focus the input (simulated)
    fireEvent(emailInput, 'focus');

    // Dismiss keyboard (simulated by pressing outside)
    fireEvent.press(getByTestId('screen-container'));

    // In a real scenario, you might check if keyboard is dismissed
    // This is a basic test structure
  });
});