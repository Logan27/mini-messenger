import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileService } from '../file.service';
import apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    defaults: {
      baseURL: 'http://localhost:4000/api',
    },
  },
}));

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockFileData = {
        id: 'file1',
        fileName: 'test.txt',
        filePath: '/uploads/test.txt',
        fileSize: 12,
        mimeType: 'text/plain',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockFileData },
      });

      const result = await fileService.uploadFile(mockFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/files/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      expect(result).toEqual(mockFileData);
    });

    it('should track upload progress', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const onProgress = vi.fn();

      vi.mocked(apiClient.post).mockImplementation(
        (url, data, config: any) => {
          // Simulate progress event
          if (config?.onUploadProgress) {
            config.onUploadProgress({
              loaded: 50,
              total: 100,
            });
          }

          return Promise.resolve({
            data: { data: { id: 'file1' } },
          });
        }
      );

      await fileService.uploadFile(mockFile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('should handle upload with 100% progress', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const onProgress = vi.fn();

      vi.mocked(apiClient.post).mockImplementation(
        (url, data, config: any) => {
          if (config?.onUploadProgress) {
            config.onUploadProgress({
              loaded: 100,
              total: 100,
            });
          }

          return Promise.resolve({
            data: { data: { id: 'file1' } },
          });
        }
      );

      await fileService.uploadFile(mockFile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should upload image file', async () => {
      const mockImage = new File(['image data'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          data: {
            id: 'file2',
            fileName: 'photo.jpg',
            mimeType: 'image/jpeg',
          },
        },
      });

      const result = await fileService.uploadFile(mockImage);

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('File too large')
      );

      await expect(fileService.uploadFile(mockFile)).rejects.toThrow(
        'File too large'
      );
    });

    it('should not call onProgress if not provided', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      vi.mocked(apiClient.post).mockImplementation(
        (url, data, config: any) => {
          if (config?.onUploadProgress) {
            config.onUploadProgress({ loaded: 50, total: 100 });
          }
          return Promise.resolve({ data: { data: { id: 'file1' } } });
        }
      );

      // Should not throw even without onProgress callback
      await expect(fileService.uploadFile(mockFile)).resolves.toBeDefined();
    });
  });

  describe('getConversationFiles', () => {
    it('should fetch files for direct conversation', async () => {
      const mockFiles = [
        { id: 'file1', fileName: 'doc1.pdf' },
        { id: 'file2', fileName: 'image1.jpg' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockFiles,
      });

      const result = await fileService.getConversationFiles({
        conversationWith: 'user2',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/files', {
        params: { conversationWith: 'user2' },
      });
      expect(result).toEqual(mockFiles);
    });

    it('should fetch files for group conversation', async () => {
      const mockFiles = [{ id: 'file1', fileName: 'doc.pdf' }];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockFiles,
      });

      await fileService.getConversationFiles({ groupId: 'group1' });

      expect(apiClient.get).toHaveBeenCalledWith('/files', {
        params: { groupId: 'group1' },
      });
    });

    it('should filter files by type', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
      });

      await fileService.getConversationFiles({
        conversationWith: 'user2',
        fileType: 'image',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/files', {
        params: {
          conversationWith: 'user2',
          fileType: 'image',
        },
      });
    });

    it('should fetch files with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
      });

      await fileService.getConversationFiles({
        conversationWith: 'user2',
        page: 2,
        limit: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/files', {
        params: {
          conversationWith: 'user2',
          page: 2,
          limit: 20,
        },
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      const mockResponse = { success: true, message: 'File deleted' };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: mockResponse,
      });

      const result = await fileService.deleteFile('file1');

      expect(apiClient.delete).toHaveBeenCalledWith('/files/file1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle file not found', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(
        new Error('File not found')
      );

      await expect(fileService.deleteFile('nonexistent')).rejects.toThrow(
        'File not found'
      );
    });
  });

  describe('getFileUrl', () => {
    it('should generate correct file URL', () => {
      const filePath = '/uploads/test.jpg';
      const url = fileService.getFileUrl(filePath);

      expect(url).toBe('http://localhost:4000/uploads/test.jpg');
    });

    it('should handle file path without leading slash', () => {
      const filePath = 'uploads/test.jpg';
      const url = fileService.getFileUrl(filePath);

      expect(url).toBe('http://localhost:4000uploads/test.jpg');
    });

    it('should use environment variable if set', () => {
      // Save original value
      const originalEnv = import.meta.env.VITE_API_URL;

      // Mock environment variable
      import.meta.env.VITE_API_URL = 'https://api.example.com/api';

      const filePath = '/uploads/test.jpg';
      const url = fileService.getFileUrl(filePath);

      expect(url).toBe('https://api.example.com/uploads/test.jpg');

      // Restore original value
      import.meta.env.VITE_API_URL = originalEnv;
    });
  });
});
