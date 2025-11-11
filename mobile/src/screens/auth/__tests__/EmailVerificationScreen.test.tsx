import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EmailVerificationScreen from '../EmailVerificationScreen';
import api from '../../../services/api';

// Mock Alert
jest.spyOn(Alert, 'alert');
jest.spyOn(Alert, 'prompt');

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

// Mock timers for resend countdown
jest.useFakeTimers();

describe('EmailVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();
    (Alert.prompt as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Pending State', () => {
    it('renders pending state with email', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByText, getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Verify Your Email')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByTestId('manual-verify-button')).toBeTruthy();
      expect(getByTestId('resend-button')).toBeTruthy();
      expect(getByTestId('back-to-login-button')).toBeTruthy();
    });

    it('shows resend timer initially', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByText } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText(/Resend in 60s/i)).toBeTruthy();
    });

    it('disables resend button initially', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      const resendButton = getByTestId('resend-button');
      expect(resendButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('navigates back to login', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      fireEvent.press(getByTestId('back-to-login-button'));
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Auto-Verification', () => {
    it('auto-verifies when token and autoVerify are provided', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'valid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce({});

      render(<EmailVerificationScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
          token: 'valid-token',
        });
      });
    });

    it('shows success state after auto-verification', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'valid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce({});

      const { findByText, findByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      await findByText('Email Verified!');
      expect(await findByText('Your email has been successfully verified.')).toBeTruthy();
      expect(await findByTestId('success-continue-button')).toBeTruthy();
    });

    it('shows success alert after verification', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'valid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce({});

      render(<EmailVerificationScreen navigation={mockNavigation} route={route} />);

      // Wait for verification to complete
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });

      // Fast-forward past the 1.5s delay for the alert
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Email Verified',
          'Your email has been successfully verified. You can now log in.',
          expect.any(Array)
        );
      });
    });

    it('shows error state when auto-verification fails', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'invalid-token',
          autoVerify: true,
        },
      };

      const errorMessage = 'Invalid or expired verification token';
      (api.post as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      const { findByText, findByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      await findByText('Verification Failed');
      expect(await findByText(errorMessage)).toBeTruthy();
      expect(await findByTestId('try-again-button')).toBeTruthy();
    });
  });

  describe('Manual Verification', () => {
    it('prompts for verification code when manual verify is pressed', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      fireEvent.press(getByTestId('manual-verify-button'));

      expect(Alert.prompt).toHaveBeenCalledWith(
        'Enter Verification Code',
        'Please enter the verification code from your email',
        expect.any(Array),
        'plain-text'
      );
    });

    it('verifies email when code is entered via prompt', async () => {
      const route = { params: { email: 'test@example.com' } };

      (api.post as jest.Mock).mockResolvedValueOnce({});
      (Alert.prompt as jest.Mock).mockImplementation((title, message, buttons) => {
        // Simulate user entering code and pressing Verify
        const verifyButton = buttons.find((b: any) => b.text === 'Verify');
        if (verifyButton && verifyButton.onPress) {
          verifyButton.onPress('verification-code-123');
        }
      });

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      fireEvent.press(getByTestId('manual-verify-button'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
          token: 'verification-code-123',
        });
      });
    });
  });

  describe('Resend Verification', () => {
    it('has resend button in pending state', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(getByTestId('resend-button')).toBeTruthy();
    });

    it('shows manual verify button', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(getByTestId('manual-verify-button')).toBeTruthy();
    });

    it('displays verification instructions', () => {
      const route = { params: { email: 'test@example.com' } };

      const { getAllByText } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(getAllByText(/Check your inbox/i).length).toBeGreaterThan(0);
      expect(getAllByText(/Click the verification link/i).length).toBeGreaterThan(0);
    });
  });

  describe('Success State', () => {
    it('navigates to login from success state', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'valid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce({});

      const { findByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      const continueButton = await findByTestId('success-continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Error State', () => {
    it('allows retry from error state', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'invalid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock)
        .mockRejectedValueOnce({ response: { data: { message: 'Error' } } })
        .mockResolvedValueOnce({});

      (Alert.prompt as jest.Mock).mockImplementation((title, message, buttons) => {
        const verifyButton = buttons.find((b: any) => b.text === 'Verify');
        if (verifyButton && verifyButton.onPress) {
          verifyButton.onPress('new-code');
        }
      });

      const { findByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      const tryAgainButton = await findByTestId('try-again-button');
      fireEvent.press(tryAgainButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
          token: 'new-code',
        });
      });
    });

    it('shows try again button in error state', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          token: 'invalid-token',
          autoVerify: true,
        },
      };

      (api.post as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Error' } },
      });

      const { findByTestId } = render(
        <EmailVerificationScreen navigation={mockNavigation} route={route} />
      );

      expect(await findByTestId('try-again-button')).toBeTruthy();
    });
  });
});
