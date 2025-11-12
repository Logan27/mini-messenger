import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ResetPasswordScreen from '../ResetPasswordScreen';
import api from '../../../services/api';

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

// Mock API
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
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

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('With Token from Route Params', () => {
    const route = {
      params: {
        token: 'valid-reset-token',
        email: 'test@example.com',
      },
    };

    it('renders all form elements without token input', () => {
      const { getByTestId, queryByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Enter your new password below')).toBeTruthy();
      expect(queryByTestId('token-input')).toBeNull(); // Token input should be hidden
      expect(getByTestId('password-input')).toBeTruthy();
      expect(getByTestId('confirm-password-input')).toBeTruthy();
      expect(getByTestId('submit-button')).toBeTruthy();
      expect(getByTestId('back-to-login-button')).toBeTruthy();
    });

    it('successfully resets password with valid data', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});

      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'NewPass123!');
        fireEvent.changeText(confirmPasswordInput, 'NewPass123!');
      });

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'valid-reset-token',
          password: 'NewPass123!',
        });
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Your password has been reset successfully. Please log in with your new password.',
          expect.any(Array)
        );
      });
    });

    it('shows validation error for weak password', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'weak'); // Too weak
        fireEvent.changeText(confirmPasswordInput, 'weak');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Password must be at least 8 characters/i)).toBeTruthy();
      });
    });

    it('shows validation error when passwords do not match', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'NewPass123!');
        fireEvent.changeText(confirmPasswordInput, 'DifferentPass123!');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Passwords don't match/i)).toBeTruthy();
      });
    });

    it('shows validation error for missing uppercase letter', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'newpass123!'); // No uppercase
        fireEvent.changeText(confirmPasswordInput, 'newpass123!');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Password must contain at least one uppercase letter/i)).toBeTruthy();
      });
    });

    it('shows validation error for missing special character', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const confirmPasswordInput = getByTestId('confirm-password-input');
      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'NewPass123'); // No special char
        fireEvent.changeText(confirmPasswordInput, 'NewPass123');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Password must contain at least one special character/i)).toBeTruthy();
      });
    });

    it('toggles password visibility', async () => {
      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const passwordInput = getByTestId('password-input');
      const passwordToggle = getByTestId('password-toggle');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);

      await act(async () => {
        fireEvent.press(passwordToggle);
      });

      // After toggle, password should be visible
      expect(passwordInput.props.secureTextEntry).toBe(false);
    });

    it('toggles confirm password visibility', async () => {
      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const confirmPasswordInput = getByTestId('confirm-password-input');
      const confirmPasswordToggle = getByTestId('confirm-password-toggle');

      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

      await act(async () => {
        fireEvent.press(confirmPasswordToggle);
      });

      expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
    });

    it('shows error message on API failure', async () => {
      const errorMessage = 'Invalid or expired reset token';
      (api.post as jest.Mock).mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'NewPass123!');
        fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123!');
        fireEvent.press(getByTestId('submit-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });

    it('navigates to login after successful reset', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});

      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'NewPass123!');
        fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123!');
        fireEvent.press(getByTestId('submit-button'));
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });

      // Simulate pressing OK on the success alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('navigates back to login screen', () => {
      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const backButton = getByTestId('back-to-login-button');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('disables submit button during loading', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (api.post as jest.Mock).mockReturnValueOnce(promise);

      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'NewPass123!');
        fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123!');
      });

      fireEvent.press(getByTestId('submit-button'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);

      // Resolve to clean up
      await act(async () => {
        resolvePromise!();
        await promise;
      });
    });
  });

  describe('Without Token from Route Params', () => {
    const route = { params: {} };

    it('renders token input field when no token in params', () => {
      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      expect(getByTestId('token-input')).toBeTruthy();
      expect(getByTestId('password-input')).toBeTruthy();
      expect(getByTestId('confirm-password-input')).toBeTruthy();
    });

    it('shows validation error for missing token', async () => {
      const { getByTestId, getByText } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      const submitButton = getByTestId('submit-button');

      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'NewPass123!');
        fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123!');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Reset token is required/i)).toBeTruthy();
      });
    });

    it('successfully resets password with manual token entry', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({});

      const { getByTestId } = renderWithQueryClient(
        <ResetPasswordScreen navigation={mockNavigation} route={route} />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('token-input'), 'manual-token-123');
        fireEvent.changeText(getByTestId('password-input'), 'NewPass123!');
        fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123!');
        fireEvent.press(getByTestId('submit-button'));
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'manual-token-123',
          password: 'NewPass123!',
        });
      });
    });
  });
});
