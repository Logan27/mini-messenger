import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import RegisterScreen from '../RegisterScreen';

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
const mockRegister = jest.fn();

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    register: mockRegister,
    isLoading: false,
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();

    // Reset the auth store mock to default values
    const { useAuthStore } = require('../../../stores/authStore');
    useAuthStore.mockImplementation(() => ({
      register: mockRegister,
      isLoading: false,
    }));
  });

  it('renders all form elements', () => {
    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    expect(getByTestId('username-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('register-button')).toBeTruthy();
    expect(getByTestId('login-link')).toBeTruthy();
  });

  it('shows validation error for short username', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const usernameInput = getByTestId('username-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(usernameInput, 'ab'); // Too short (< 3 chars)
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'Test123!@');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Test123!@');
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(getByText(/Username must be at least 3 characters/i)).toBeTruthy();
    });
  });

  it('shows validation error for username with special characters', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const usernameInput = getByTestId('username-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(usernameInput, 'user@123'); // Contains special char
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'Test123!@');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Test123!@');
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(getByText(/Username must contain only letters and numbers/i)).toBeTruthy();
    });
  });

  it('shows validation error for invalid email', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const emailInput = getByTestId('email-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'testuser');
      fireEvent.changeText(emailInput, 'invalidemail'); // Invalid email
      fireEvent.changeText(getByTestId('password-input'), 'Test123!@');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Test123!@');
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(getByText(/Please enter a valid email address/i)).toBeTruthy();
    });
  });

  it('shows validation error for weak password', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const passwordInput = getByTestId('password-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'testuser');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(passwordInput, 'weak'); // Too weak
      fireEvent.changeText(getByTestId('confirm-password-input'), 'weak');
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(getByText(/Password must be at least 8 characters/i)).toBeTruthy();
    });
  });

  it('shows validation error when passwords do not match', async () => {
    const { getByTestId, getByText } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'testuser');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@');
      fireEvent.changeText(confirmPasswordInput, 'Test456!@'); // Different password
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(getByText(/Passwords don't match/i)).toBeTruthy();
    });
  });

  it('successfully registers with valid data', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const usernameInput = getByTestId('username-input');
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@');
      fireEvent.changeText(confirmPasswordInput, 'Test123!@');
    });

    await act(async () => {
      fireEvent.press(registerButton);
    });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@',
        confirmPassword: 'Test123!@',
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Successful',
        'Your account has been created. Please check your email for verification.',
        expect.any(Array)
      );
    });
  });

  it('shows error message on registration failure', async () => {
    const errorMessage = 'Username already exists';
    mockRegister.mockRejectedValueOnce(new Error(errorMessage));

    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'existinguser');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'Test123!@');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Test123!@');
    });

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Registration Failed', errorMessage);
    });
  });

  it('toggles password visibility', async () => {
    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const passwordInput = getByTestId('password-input');
    const passwordToggle = getByTestId('password-toggle');

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);

    await act(async () => {
      fireEvent.press(passwordToggle);
    });

    // After toggle, password should be visible
    expect(passwordInput.props.secureTextEntry).toBe(false);

    await act(async () => {
      fireEvent.press(passwordToggle);
    });

    // After second toggle, password should be hidden again
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('toggles confirm password visibility', async () => {
    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const confirmPasswordInput = getByTestId('confirm-password-input');
    const confirmPasswordToggle = getByTestId('confirm-password-toggle');

    // Initially password should be hidden
    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

    await act(async () => {
      fireEvent.press(confirmPasswordToggle);
    });

    // After toggle, password should be visible
    expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
  });

  it('navigates to login screen', () => {
    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const loginLink = getByTestId('login-link');
    fireEvent.press(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('disables register button during loading', async () => {
    // Mock the store to show loading state
    const { useAuthStore } = require('../../../stores/authStore');
    useAuthStore.mockImplementation(() => ({
      register: mockRegister,
      isLoading: true,
    }));

    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const registerButton = getByTestId('register-button');

    // Button should be disabled during loading
    expect(registerButton.props.accessibilityState.disabled).toBe(true);
  });

  it('prevents registration with empty fields', async () => {
    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    const registerButton = getByTestId('register-button');

    await act(async () => {
      fireEvent.press(registerButton);
    });

    // Verify that register was NOT called due to validation errors
    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('navigates to login after successful registration', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    const { getByTestId } = renderWithQueryClient(<RegisterScreen navigation={mockNavigation} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'testuser');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'Test123!@');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Test123!@');
      fireEvent.press(getByTestId('register-button'));
    });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });

    // Simulate pressing OK on the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0]; // Get the OK button from alert options
    okButton.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
