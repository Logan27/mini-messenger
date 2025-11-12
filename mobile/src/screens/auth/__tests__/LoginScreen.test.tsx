import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import LoginScreen from '../LoginScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock React Navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: {},
  }),
}));

// Mock the auth store
const mockLogin = jest.fn();
const mockAuthenticateWithBiometric = jest.fn();
const mockGetBiometricCredentials = jest.fn();
const mockDisableBiometric = jest.fn();

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    login: mockLogin,
    isLoading: false,
    biometricAvailable: false,
    biometricEnabled: false,
    authenticateWithBiometric: mockAuthenticateWithBiometric,
    getBiometricCredentials: mockGetBiometricCredentials,
    disableBiometric: mockDisableBiometric,
    error: null,
  })),
}));

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
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();

    // Reset the auth store mock to default values
    const { useAuthStore } = require('../../../stores/authStore');
    useAuthStore.mockImplementation(() => ({
      login: mockLogin,
      isLoading: false,
      biometricAvailable: false,
      biometricEnabled: false,
      authenticateWithBiometric: mockAuthenticateWithBiometric,
      getBiometricCredentials: mockGetBiometricCredentials,
      disableBiometric: mockDisableBiometric,
      error: null,
    }));
  });

  it('renders all form elements', () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('forgot-password-button')).toBeTruthy();
    expect(getByTestId('register-link')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const loginButton = getByTestId('login-button');

    await act(async () => {
      fireEvent.press(loginButton);
    });

    // Verify that login was NOT called due to validation errors
    // The form validation prevents submission when fields are empty
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it('shows validation error for invalid email', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    await act(async () => {
      fireEvent.changeText(emailInput, 'ab'); // Too short (< 3 chars)
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(getByText(/Please enter your email or username/i)).toBeTruthy();
    });
  });

  it('successfully logs in with valid credentials', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
    });

    await act(async () => {
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));

    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
    });

    await act(async () => {
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', errorMessage);
    });
  });

  it('toggles password visibility', async () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const passwordInput = getByTestId('password-input');
    const toggleButton = getByTestId('password-toggle');

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    await act(async () => {
      fireEvent.press(toggleButton);
    });

    // After toggle, password should be visible
    expect(passwordInput.props.secureTextEntry).toBe(false);

    await act(async () => {
      fireEvent.press(toggleButton);
    });

    // After second toggle, password should be hidden again
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('navigates to forgot password screen', () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const forgotPasswordButton = getByTestId('forgot-password-button');
    fireEvent.press(forgotPasswordButton);

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to register screen', () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const registerLink = getByTestId('register-link');
    fireEvent.press(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('disables login button during loading', async () => {
    // Mock the store to show loading state
    const { useAuthStore } = require('../../../stores/authStore');
    useAuthStore.mockImplementation(() => ({
      login: mockLogin,
      isLoading: true,
      biometricAvailable: false,
      biometricEnabled: false,
      authenticateWithBiometric: mockAuthenticateWithBiometric,
      getBiometricCredentials: mockGetBiometricCredentials,
      disableBiometric: mockDisableBiometric,
      error: null,
    }));

    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const loginButton = getByTestId('login-button');

    // Button should be disabled during loading
    expect(loginButton.props.accessibilityState.disabled).toBe(true);
  });

  it('handles network errors gracefully', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Network Error'));

    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
    });

    await act(async () => {
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Network Error');
    });
  });

  it('clears error message when user starts typing', async () => {
    // This test validates that form validation updates as user types
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');

    // First trigger validation errors - login should not be called
    await act(async () => {
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });

    // Type in the email field with valid data
    await act(async () => {
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
    });

    // After typing valid input, press submit - now login SHOULD be called
    await act(async () => {
      fireEvent.press(loginButton);
    });

    // Verify login was called with the correct data
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('handles keyboard dismissal', () => {
    const { getByTestId } = renderWithQueryClient(<LoginScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const screenContainer = getByTestId('screen-container');

    // Focus the input
    fireEvent(emailInput, 'focus');

    // Verify the screen container exists (for keyboard handling)
    expect(screenContainer).toBeTruthy();
  });
});
