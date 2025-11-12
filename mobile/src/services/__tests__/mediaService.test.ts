import { MediaService, mediaService } from '../mediaService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-image-picker');
jest.mock('expo-file-system');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockFileAPI = {
  uploadFile: jest.fn(),
};

jest.mock('../api', () => ({
  __esModule: true,
  get fileAPI() {
    return mockFileAPI;
  },
}));

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = MediaService.getInstance();
      const instance2 = MediaService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(mediaService);
    });
  });

  describe('requestPermissions', () => {
    it('returns true when all permissions are granted', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await mediaService.requestPermissions();

      expect(result).toBe(true);
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });

    it('shows alert and returns false when camera permission is denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await mediaService.requestPermissions();

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permissions Required',
        'Camera and photo library permissions are required to use this feature.',
        [{ text: 'OK' }]
      );
    });

    it('shows alert and returns false when media library permission is denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await mediaService.requestPermissions();

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('returns false when permission request throws error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await mediaService.requestPermissions();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error requesting permissions:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('takePhoto', () => {
    it('takes photo and returns MediaResult when successful', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAsset = {
        uri: 'file://photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 1024000,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await mediaService.takePhoto();

      expect(result).toEqual({
        uri: 'file://photo.jpg',
        type: 'image',
        fileName: 'photo.jpg',
        fileSize: 1024000,
      });
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    });

    it('generates fileName when not provided', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAsset = {
        uri: 'file://photo.jpg',
        fileSize: 1024000,
      };

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await mediaService.takePhoto();

      expect(result?.fileName).toMatch(/photo_\d+\.jpg/);
      expect(result?.fileSize).toBe(1024000);
    });

    it('returns null when user cancels', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await mediaService.takePhoto();

      expect(result).toBeNull();
    });

    it('returns null when permissions are denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await mediaService.takePhoto();

      expect(result).toBeNull();
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('shows alert and returns null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(new Error('Camera error'));

      const result = await mediaService.takePhoto();

      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to take photo');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error taking photo:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('selectFromGallery', () => {
    it('selects image from gallery and returns MediaResult', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAsset = {
        uri: 'file://image.jpg',
        fileName: 'image.jpg',
        fileSize: 2048000,
        type: 'image',
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await mediaService.selectFromGallery();

      expect(result).toEqual({
        uri: 'file://image.jpg',
        type: 'image',
        fileName: 'image.jpg',
        fileSize: 2048000,
      });
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    });

    it('selects video from gallery', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAsset = {
        uri: 'file://video.mp4',
        fileName: 'video.mp4',
        fileSize: 5120000,
        type: 'video',
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await mediaService.selectFromGallery();

      expect(result).toEqual({
        uri: 'file://video.mp4',
        type: 'video',
        fileName: 'video.mp4',
        fileSize: 5120000,
      });
    });

    it('generates fileName for video when not provided', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const mockAsset = {
        uri: 'file://video.mp4',
        fileSize: 5120000,
        type: 'video',
      };

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await mediaService.selectFromGallery();

      expect(result?.fileName).toMatch(/media_\d+\.mp4/);
      expect(result?.type).toBe('video');
    });

    it('returns null when user cancels', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await mediaService.selectFromGallery();

      expect(result).toBeNull();
    });

    it('shows alert and returns null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error('Gallery error'));

      const result = await mediaService.selectFromGallery();

      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to select media');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error selecting from gallery:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('compressImage', () => {
    it('returns the original URI', async () => {
      const result = await mediaService.compressImage('file://image.jpg', 1200);

      expect(result).toBe('file://image.jpg');
    });

    it('returns original URI even with different maxWidth', async () => {
      const result = await mediaService.compressImage('file://image.jpg', 800);

      expect(result).toBe('file://image.jpg');
    });
  });

  describe('uploadMedia', () => {
    it('uploads media without conversationId', async () => {
      const mockResponse = {
        data: {
          id: 'file-123',
          url: 'https://example.com/file.jpg',
        },
      };

      mockFileAPI.uploadFile.mockResolvedValue(mockResponse);

      const media = {
        uri: 'file://photo.jpg',
        type: 'image' as const,
        fileName: 'photo.jpg',
        fileSize: 1024000,
      };

      const result = await mediaService.uploadMedia(media);

      expect(result).toEqual(mockResponse.data);
      expect(mockFileAPI.uploadFile).toHaveBeenCalled();

      const formData = mockFileAPI.uploadFile.mock.calls[0][0];
      expect(formData).toBeInstanceOf(FormData);
    });

    it('uploads media with conversationId', async () => {
      const mockResponse = {
        data: {
          id: 'file-456',
          url: 'https://example.com/video.mp4',
        },
      };

      mockFileAPI.uploadFile.mockResolvedValue(mockResponse);

      const media = {
        uri: 'file://video.mp4',
        type: 'video' as const,
        fileName: 'video.mp4',
        fileSize: 5120000,
      };

      const result = await mediaService.uploadMedia(media, 'conv-789');

      expect(result).toEqual(mockResponse.data);
      expect(mockFileAPI.uploadFile).toHaveBeenCalled();
    });

    it('throws error when upload fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFileAPI.uploadFile.mockRejectedValue({
        response: {
          data: {
            message: 'Upload failed',
          },
        },
      });

      const media = {
        uri: 'file://photo.jpg',
        type: 'image' as const,
        fileName: 'photo.jpg',
        fileSize: 1024000,
      };

      await expect(mediaService.uploadMedia(media)).rejects.toThrow('Upload failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('throws generic error message when no specific error message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFileAPI.uploadFile.mockRejectedValue(new Error('Network error'));

      const media = {
        uri: 'file://photo.jpg',
        type: 'image' as const,
        fileName: 'photo.jpg',
        fileSize: 1024000,
      };

      await expect(mediaService.uploadMedia(media)).rejects.toThrow('Failed to upload media');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFileInfo', () => {
    it('returns file info when successful', async () => {
      const mockFileInfo = {
        uri: 'file://photo.jpg',
        size: 1024000,
        exists: true,
        isDirectory: false,
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await mediaService.getFileInfo('file://photo.jpg');

      expect(result).toEqual(mockFileInfo);
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith('file://photo.jpg');
    });

    it('returns null when getInfoAsync fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await mediaService.getFileInfo('file://nonexistent.jpg');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting file info:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(mediaService.formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes', () => {
      expect(mediaService.formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(mediaService.formatFileSize(1024)).toBe('1 KB');
      expect(mediaService.formatFileSize(2048)).toBe('2 KB');
    });

    it('formats megabytes', () => {
      expect(mediaService.formatFileSize(1048576)).toBe('1 MB');
      expect(mediaService.formatFileSize(5242880)).toBe('5 MB');
    });

    it('formats gigabytes', () => {
      expect(mediaService.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('formats decimal values correctly', () => {
      expect(mediaService.formatFileSize(1536)).toBe('1.5 KB');
      expect(mediaService.formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('validateFileSize', () => {
    it('returns true for files within default limit (10MB)', () => {
      const size = 5 * 1024 * 1024; // 5MB
      expect(mediaService.validateFileSize(size)).toBe(true);
    });

    it('returns false for files exceeding default limit', () => {
      const size = 15 * 1024 * 1024; // 15MB
      expect(mediaService.validateFileSize(size)).toBe(false);
    });

    it('returns true for files at exact default limit', () => {
      const size = 10 * 1024 * 1024; // 10MB
      expect(mediaService.validateFileSize(size)).toBe(true);
    });

    it('returns true for files within custom limit', () => {
      const size = 3 * 1024 * 1024; // 3MB
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      expect(mediaService.validateFileSize(size, maxSize)).toBe(true);
    });

    it('returns false for files exceeding custom limit', () => {
      const size = 8 * 1024 * 1024; // 8MB
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      expect(mediaService.validateFileSize(size, maxSize)).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('returns true for allowed image types', () => {
      expect(mediaService.validateFileType('image/jpeg')).toBe(true);
      expect(mediaService.validateFileType('image/png')).toBe(true);
    });

    it('returns true for allowed video types', () => {
      expect(mediaService.validateFileType('video/mp4')).toBe(true);
    });

    it('returns false for disallowed types', () => {
      expect(mediaService.validateFileType('application/pdf')).toBe(false);
      expect(mediaService.validateFileType('text/plain')).toBe(false);
    });

    it('validates against custom allowed types', () => {
      const customTypes = ['image/gif', 'image/webp'];
      expect(mediaService.validateFileType('image/gif', customTypes)).toBe(true);
      expect(mediaService.validateFileType('image/jpeg', customTypes)).toBe(false);
    });
  });
});
