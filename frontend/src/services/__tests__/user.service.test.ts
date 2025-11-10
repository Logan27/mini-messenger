import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users with query', async () => {
      const mockUsers = [
        { id: 'user1', username: 'john', email: 'john@example.com' },
        { id: 'user2', username: 'johnny', email: 'johnny@example.com' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          data: {
            users: mockUsers,
            pagination: { page: 1, total: 2 },
          },
        },
      });

      const result = await userService.searchUsers('john');

      expect(apiClient.get).toHaveBeenCalledWith('/users/search', {
        params: { query: 'john', page: 1, limit: 10 },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should search with custom pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: { users: [] } },
      });

      await userService.searchUsers('test', 2, 20);

      expect(apiClient.get).toHaveBeenCalledWith('/users/search', {
        params: { query: 'test', page: 2, limit: 20 },
      });
    });

    it('should handle direct array response', async () => {
      const mockUsers = [{ id: 'user1', username: 'john' }];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockUsers },
      });

      const result = await userService.searchUsers('john');

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no results', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: { users: [] } },
      });

      const result = await userService.searchUsers('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle malformed response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: null },
      });

      const result = await userService.searchUsers('test');

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID', async () => {
      const mockUser = {
        id: 'user1',
        username: 'john',
        email: 'john@example.com',
        bio: 'Software developer',
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockUser },
      });

      const result = await userService.getUserById('user1');

      expect(apiClient.get).toHaveBeenCalledWith('/users/user1');
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('User not found'));

      await expect(userService.getUserById('nonexistent')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUpdatedUser = {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Updated bio',
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockUpdatedUser },
      });

      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Updated bio',
      };

      const result = await userService.updateProfile(updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update only specified fields', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { bio: 'New bio' } },
      });

      await userService.updateProfile({ bio: 'New bio' });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', {
        bio: 'New bio',
      });
    });

    it('should update username', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { username: 'newusername' } },
      });

      await userService.updateProfile({ username: 'newusername' });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', {
        username: 'newusername',
      });
    });

    it('should update email', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { email: 'newemail@example.com' } },
      });

      await userService.updateProfile({ email: 'newemail@example.com' });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', {
        email: 'newemail@example.com',
      });
    });

    it('should update phone number', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { phone: '+1234567890' } },
      });

      await userService.updateProfile({ phone: '+1234567890' });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', {
        phone: '+1234567890',
      });
    });

    it('should update user settings', async () => {
      const settings = {
        showOnlineStatus: false,
        sendReadReceipts: true,
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { settings } },
      });

      await userService.updateProfile({ settings });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', { settings });
    });

    it('should update status', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { status: 'away' } },
      });

      await userService.updateProfile({ status: 'away' });

      expect(apiClient.put).toHaveBeenCalledWith('/users/me', {
        status: 'away',
      });
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Password updated',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockResponse,
      });

      const passwordData = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      };

      const result = await userService.updatePassword(passwordData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/change-password',
        passwordData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle incorrect current password', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      await expect(
        userService.updatePassword({
          currentPassword: 'wrong',
          newPassword: 'new123',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should handle weak new password', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Password does not meet requirements')
      );

      await expect(
        userService.updatePassword({
          currentPassword: 'old123',
          newPassword: '123',
        })
      ).rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = new File(['avatar data'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      const mockAvatarData = {
        avatarUrl: '/uploads/avatars/avatar123.jpg',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockAvatarData },
      });

      const result = await userService.uploadAvatar(mockFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/users/me/avatar',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      expect(result).toEqual(mockAvatarData);
    });

    it('should track upload progress', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const onProgress = vi.fn();

      vi.mocked(apiClient.post).mockImplementation(
        (url, data, config: unknown) => {
          if (config?.onUploadProgress) {
            config.onUploadProgress({ loaded: 75, total: 100 });
          }
          return Promise.resolve({
            data: { data: { avatarUrl: '/path/to/avatar.jpg' } },
          });
        }
      );

      await userService.uploadAvatar(mockFile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(75);
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('File too large')
      );

      await expect(userService.uploadAvatar(mockFile)).rejects.toThrow(
        'File too large'
      );
    });

    it('should upload avatar without progress callback', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: { avatarUrl: '/path/to/avatar.jpg' } },
      });

      await expect(
        userService.uploadAvatar(mockFile)
      ).resolves.toBeDefined();
    });
  });
});
