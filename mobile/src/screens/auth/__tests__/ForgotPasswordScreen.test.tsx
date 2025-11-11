import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import { authAPI } from '../../../services/api';

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

// Mock API
jest.mock('../../../services/api', () => ({
  authAPI: {
    forgotPassword: jest.fn(),
  },
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

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('Initial Form View', () => {
    it('renders all form elements', () => {
      const { getByTestId, getByText } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      expect(getByText('Forgot Password?')).toBeTruthy();
      expect(getByTestId('email-input')).toBeTruthy();
      expect(getByTestId('submit-button')).toBeTruthy();
      expect(getByTestId('back-to-login-button')).toBeTruthy();
    });

    it('shows validation error for invalid email', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'invalidemail'); // Invalid email
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Please enter a valid email address/i)).toBeTruthy();
      });
    });

    it('successfully sends reset email with valid data', async () => {
      (authAPI.forgotPassword as jest.Mock).mockResolvedValueOnce({});

      const { getByTestId, getByText } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
      });

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(authAPI.forgotPassword).toHaveBeenCalledWith('test@example.com');
        // Should show success view
        expect(getByText('Check Your Email')).toBeTruthy();
      });
    });

    it('shows error message on API failure', async () => {
      const errorMessage = 'User not found';
      (authAPI.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'nonexistent@example.com');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });

    it('disables submit button during loading', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (authAPI.forgotPassword as jest.Mock).mockReturnValueOnce(promise);

      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
      });

      // Press the button to start loading
      fireEvent.press(submitButton);

      // Wait a bit for state to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Button should be disabled during loading
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);

      // Resolve the promise to complete the test
      await act(async () => {
        resolvePromise!();
        await promise;
      });
    });

    it('navigates back to login screen', () => {
      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const backButton = getByTestId('back-to-login-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('prevents submission with empty email', async () => {
      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Should not call API with empty email
      await waitFor(() => {
        expect(authAPI.forgotPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe('Success View', () => {
    beforeEach(async () => {
      (authAPI.forgotPassword as jest.Mock).mockResolvedValue({});
    });

    it('displays success message after sending email', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('Check Your Email')).toBeTruthy();
        expect(getByText('test@example.com')).toBeTruthy();
      });
    });

    it('allows resending email', async () => {
      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      // Send initial email
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByTestId('resend-email-button')).toBeTruthy();
      });

      // Clear mock call history
      (authAPI.forgotPassword as jest.Mock).mockClear();

      // Resend email
      const resendButton = getByTestId('resend-email-button');
      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(authAPI.forgotPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('navigates to login from success screen', async () => {
      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      // Send email first
      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByTestId('success-back-to-login-button')).toBeTruthy();
      });

      const backButton = getByTestId('success-back-to-login-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      (authAPI.forgotPassword as jest.Mock).mockRejectedValueOnce({
        message: 'Network Error',
      });

      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      const emailInput = getByTestId('email-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to send reset email. Please try again.'
        );
      });
    });

    it('shows error for server errors', async () => {
      (authAPI.forgotPassword as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { message: 'Server error occurred' },
        },
      });

      const { getByTestId } = renderWithQueryClient(<ForgotPasswordScreen navigation={mockNavigation} />);

      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
        fireEvent.press(getByTestId('submit-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Server error occurred');
      });
    });
  });
});
