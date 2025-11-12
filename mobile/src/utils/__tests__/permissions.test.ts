import { Alert, Platform } from 'react-native';
import { check, request, RESULTS } from 'react-native-permissions';
import {
  requestCameraPermission,
  requestMicrophonePermission,
  requestCallPermissions,
  hasCameraPermission,
  hasMicrophonePermission,
} from '../permissions';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    LIMITED: 'limited',
  },
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      MICROPHONE: 'ios.permission.MICROPHONE',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
  },
}));

describe('permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('returns true when permission is already granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestCameraPermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(request).not.toHaveBeenCalled();
      });

      it('requests permission when denied and returns true on grant', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestCameraPermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(request).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('returns false when request is denied', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);

        const result = await requestCameraPermission();

        expect(result).toBe(false);
      });

      it('shows alert and returns false when permission is blocked', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.BLOCKED);

        const result = await requestCameraPermission();

        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Camera Permission',
          'Camera permission is blocked. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
      });

      it('handles errors gracefully', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        (check as jest.Mock).mockRejectedValueOnce(new Error('Permission error'));

        const result = await requestCameraPermission();

        expect(result).toBe(false);
        expect(consoleError).toHaveBeenCalledWith(
          'Error requesting camera permission:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('returns true when permission is already granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestCameraPermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('requests permission when denied', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestCameraPermission();

        expect(result).toBe(true);
        expect(request).toHaveBeenCalledWith('android.permission.CAMERA');
      });
    });
  });

  describe('requestMicrophonePermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('returns true when permission is already granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestMicrophonePermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('ios.permission.MICROPHONE');
      });

      it('requests permission when denied and returns true on grant', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestMicrophonePermission();

        expect(result).toBe(true);
        expect(request).toHaveBeenCalledWith('ios.permission.MICROPHONE');
      });

      it('shows alert and returns false when permission is blocked', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.BLOCKED);

        const result = await requestMicrophonePermission();

        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Microphone Permission',
          'Microphone permission is blocked. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
      });

      it('handles errors gracefully', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        (check as jest.Mock).mockRejectedValueOnce(new Error('Permission error'));

        const result = await requestMicrophonePermission();

        expect(result).toBe(false);
        expect(consoleError).toHaveBeenCalledWith(
          'Error requesting microphone permission:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('returns true when permission is already granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestMicrophonePermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('android.permission.RECORD_AUDIO');
      });

      it('requests permission when denied', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
        (request as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await requestMicrophonePermission();

        expect(result).toBe(true);
        expect(request).toHaveBeenCalledWith('android.permission.RECORD_AUDIO');
      });
    });
  });

  describe('requestCallPermissions', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('requests only microphone for audio calls', async () => {
      (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED); // Microphone

      const result = await requestCallPermissions(false);

      expect(result).toBe(true);
      expect(check).toHaveBeenCalledTimes(1);
      expect(check).toHaveBeenCalledWith('ios.permission.MICROPHONE');
    });

    it('requests both microphone and camera for video calls', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED) // Microphone
        .mockResolvedValueOnce(RESULTS.GRANTED); // Camera

      const result = await requestCallPermissions(true);

      expect(result).toBe(true);
      expect(check).toHaveBeenCalledTimes(2);
      expect(check).toHaveBeenCalledWith('ios.permission.MICROPHONE');
      expect(check).toHaveBeenCalledWith('ios.permission.CAMERA');
    });

    it('returns false and shows alert when microphone permission denied', async () => {
      (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);

      const result = await requestCallPermissions(false);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Microphone permission is required to make calls.',
        [{ text: 'OK' }]
      );
    });

    it('returns false and shows alert when camera permission denied for video call', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED) // Microphone granted
        .mockResolvedValueOnce(RESULTS.DENIED); // Camera denied
      (request as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);

      const result = await requestCallPermissions(true);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Camera permission is required to make video calls.',
        [{ text: 'OK' }]
      );
    });

    it('handles errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (check as jest.Mock).mockRejectedValueOnce(new Error('Permission error'));

      const result = await requestCallPermissions(false);

      expect(result).toBe(false);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('hasCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('returns true when permission is granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await hasCameraPermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('returns false when permission is denied', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);

        const result = await hasCameraPermission();

        expect(result).toBe(false);
      });

      it('returns false when permission is blocked', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.BLOCKED);

        const result = await hasCameraPermission();

        expect(result).toBe(false);
      });

      it('handles errors gracefully', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        (check as jest.Mock).mockRejectedValueOnce(new Error('Check error'));

        const result = await hasCameraPermission();

        expect(result).toBe(false);
        expect(consoleError).toHaveBeenCalledWith(
          'Error checking camera permission:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('returns true when permission is granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await hasCameraPermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('android.permission.CAMERA');
      });
    });
  });

  describe('hasMicrophonePermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('returns true when permission is granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await hasMicrophonePermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('ios.permission.MICROPHONE');
      });

      it('returns false when permission is denied', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.DENIED);

        const result = await hasMicrophonePermission();

        expect(result).toBe(false);
      });

      it('handles errors gracefully', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        (check as jest.Mock).mockRejectedValueOnce(new Error('Check error'));

        const result = await hasMicrophonePermission();

        expect(result).toBe(false);
        expect(consoleError).toHaveBeenCalledWith(
          'Error checking microphone permission:',
          expect.any(Error)
        );

        consoleError.mockRestore();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('returns true when permission is granted', async () => {
        (check as jest.Mock).mockResolvedValueOnce(RESULTS.GRANTED);

        const result = await hasMicrophonePermission();

        expect(result).toBe(true);
        expect(check).toHaveBeenCalledWith('android.permission.RECORD_AUDIO');
      });
    });
  });
});
