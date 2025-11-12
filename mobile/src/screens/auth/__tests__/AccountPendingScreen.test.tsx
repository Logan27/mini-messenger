import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AccountPendingScreen from '../AccountPendingScreen';
import api from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';

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
    get: jest.fn(),
  },
}));

// Mock authStore
const mockLogout = jest.fn();
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: jest.fn((selector) =>
    selector({
      logout: mockLogout,
    })
  ),
}));

describe('AccountPendingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLogout.mockClear();
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('Pending State', () => {
    it('renders pending state with user information', async () => {
      const route = {
        params: {
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByText('Account Pending Approval')).toBeTruthy();
        expect(getByText('testuser')).toBeTruthy();
        expect(getByText('test@example.com')).toBeTruthy();
      });
    });

    it('shows status card with progress indicators', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByText('Registration Complete')).toBeTruthy();
        expect(getByText('Email Verified')).toBeTruthy();
        expect(getByText('Awaiting Admin Approval')).toBeTruthy();
      });
    });

    it('displays instructions for next steps', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByText('What happens next?')).toBeTruthy();
      });
    });

    it('has check status button', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('check-status-button')).toBeTruthy();
      });
    });

    it('has contact support and logout buttons', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('contact-support-button')).toBeTruthy();
        expect(getByTestId('logout-button')).toBeTruthy();
      });
    });
  });

  describe('Approved State', () => {
    it('shows approval alert when account is approved', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'approved' },
      });

      render(<AccountPendingScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Account Approved!',
          'Your account has been approved. You can now log in.',
          expect.any(Array)
        );
      });
    });

    it('navigates to login when approval alert is confirmed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'approved' },
      });

      render(<AccountPendingScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate pressing the alert button
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      continueButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Rejected State', () => {
    it('shows rejection message', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: {
          status: 'rejected',
          reason: 'Invalid credentials provided',
        },
      });

      const { findByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      expect(await findByText('Account Not Approved')).toBeTruthy();
      expect(await findByText('Invalid credentials provided')).toBeTruthy();
    });

    it('shows register again button in rejected state', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'rejected' },
      });

      const { findByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      const registerButton = await findByTestId('register-again-button');
      expect(registerButton).toBeTruthy();
    });

    it('navigates to register when register again is pressed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'rejected' },
      });

      const { findByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      const registerButton = await findByTestId('register-again-button');
      fireEvent.press(registerButton);

      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });

    it('has contact support and logout buttons in rejected state', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'rejected' },
      });

      const { findByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      expect(await findByTestId('rejected-contact-support-button')).toBeTruthy();
      expect(await findByTestId('rejected-logout-button')).toBeTruthy();
    });
  });

  describe('Suspended State', () => {
    it('shows suspension message', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'suspended' },
      });

      const { findByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      expect(await findByText('Account Suspended')).toBeTruthy();
    });

    it('has contact support and logout buttons in suspended state', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'suspended' },
      });

      const { findByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      expect(await findByTestId('suspended-contact-support-button')).toBeTruthy();
      expect(await findByTestId('suspended-logout-button')).toBeTruthy();
    });
  });

  describe('Status Checking', () => {
    it('checks account status on mount', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      render(<AccountPendingScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/auth/account-status', {
          params: { email: 'test@example.com' },
        });
      });
    });

    it('manually checks status when button is pressed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('check-status-button')).toBeTruthy();
      });

      // Clear previous calls
      (api.get as jest.Mock).mockClear();

      const checkButton = getByTestId('check-status-button');
      await act(async () => {
        fireEvent.press(checkButton);
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/auth/account-status', {
          params: { email: 'test@example.com' },
        });
      });
    });

    it('shows error alert when email is missing', async () => {
      const route = {
        params: {},
      };

      render(<AccountPendingScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Email address not available'
        );
      });
    });

    it('handles API error gracefully', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockRejectedValueOnce({
        response: { status: 500 },
      });

      render(<AccountPendingScreen navigation={mockNavigation} route={route} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to check account status. Please try again.'
        );
      });
    });

    it('sets status to pending on 401 error', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockRejectedValueOnce({
        response: { status: 401 },
      });

      const { getByText } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByText('Account Pending Approval')).toBeTruthy();
      });
    });
  });

  describe('User Actions', () => {
    it('shows contact support alert when button is pressed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('contact-support-button')).toBeTruthy();
      });

      const supportButton = getByTestId('contact-support-button');
      fireEvent.press(supportButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Contact Support',
        expect.stringContaining('support@messenger.app'),
        expect.any(Array)
      );
    });

    it('shows logout confirmation alert when logout is pressed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('logout-button')).toBeTruthy();
      });

      const logoutButton = getByTestId('logout-button');
      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        expect.stringContaining('Are you sure you want to logout'),
        expect.any(Array)
      );
    });

    it('logs out and navigates to login when logout is confirmed', async () => {
      const route = {
        params: { email: 'test@example.com' },
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { status: 'pending' },
      });

      const { getByTestId } = render(
        <AccountPendingScreen navigation={mockNavigation} route={route} />
      );

      await waitFor(() => {
        expect(getByTestId('logout-button')).toBeTruthy();
      });

      const logoutButton = getByTestId('logout-button');
      fireEvent.press(logoutButton);

      // Simulate confirming logout
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Logout'
      );
      const confirmButton = alertCall![2].find((btn: any) => btn.text === 'Logout');
      confirmButton.onPress();

      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });
});
