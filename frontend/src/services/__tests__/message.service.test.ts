import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messageService } from '../message.service';
import apiClient from '@/lib/api-client';
import { offlineQueueService } from '../offlineQueue.service';
import { toast } from 'sonner';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../offlineQueue.service', () => ({
  offlineQueueService: {
    addToQueue: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe('messageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine as true by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a direct conversation', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'Hello', senderId: 'user1' },
        { id: 'msg2', content: 'Hi there', senderId: 'user2' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockMessages },
      });

      const result = await messageService.getMessages({
        recipientId: 'user2',
        page: 1,
        limit: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/messages', {
        params: {
          conversationWith: 'user2',
          page: 1,
          limit: 50,
        },
      });
      expect(result).toEqual(mockMessages);
    });

    it('should fetch messages for a group conversation', async () => {
      const mockGroupMessages = [
        { id: 'msg1', content: 'Group message', groupId: 'group1' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockGroupMessages },
      });

      const result = await messageService.getMessages({
        groupId: 'group1',
        page: 1,
        limit: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/messages', {
        params: {
          groupId: 'group1',
          page: 1,
          limit: 50,
        },
      });
      expect(result).toEqual(mockGroupMessages);
    });

    it('should fetch messages with before parameter for pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [] },
      });

      await messageService.getMessages({
        recipientId: 'user2',
        before: '2024-01-01T00:00:00Z',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/messages', {
        params: {
          conversationWith: 'user2',
          before: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should not include recipientId in API params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [] },
      });

      await messageService.getMessages({ recipientId: 'user2' });

      const callParams = vi.mocked(apiClient.get).mock.calls[0][1];
      expect(callParams?.params).not.toHaveProperty('recipientId');
      expect(callParams?.params).toHaveProperty('conversationWith');
    });
  });

  describe('sendMessage', () => {
    it('should send a message when online', async () => {
      const mockMessage = {
        id: 'msg1',
        content: 'Hello',
        recipientId: 'user2',
        status: 'sent',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockMessage },
      });

      const result = await messageService.sendMessage({
        recipientId: 'user2',
        content: 'Hello',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        recipientId: 'user2',
        content: 'Hello',
      });
      expect(result).toEqual(mockMessage);
    });

    it('should queue message when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const messageData = {
        recipientId: 'user2',
        content: 'Offline message',
      };

      const result = await messageService.sendMessage(messageData);

      expect(offlineQueueService.addToQueue).toHaveBeenCalledWith({
        type: 'message',
        endpoint: '/messages',
        method: 'POST',
        data: messageData,
        maxRetries: 3,
      });

      expect(toast.info).toHaveBeenCalledWith(
        'Message queued. Will send when online.'
      );

      expect(result).toHaveProperty('id');
      expect(result.id).toContain('temp-');
      expect(result.content).toBe('Offline message');
    });

    it('should send group message', async () => {
      const mockGroupMessage = {
        id: 'msg1',
        content: 'Group hello',
        groupId: 'group1',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockGroupMessage },
      });

      await messageService.sendMessage({
        groupId: 'group1',
        content: 'Group hello',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        groupId: 'group1',
        content: 'Group hello',
      });
    });

    it('should send message with reply', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: {} },
      });

      await messageService.sendMessage({
        recipientId: 'user2',
        content: 'Reply message',
        replyToId: 'msg123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        recipientId: 'user2',
        content: 'Reply message',
        replyToId: 'msg123',
      });
    });

    it('should send message with metadata', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: {} },
      });

      await messageService.sendMessage({
        recipientId: 'user2',
        content: 'Message with metadata',
        metadata: { forwarded: true, originalSender: 'user3' },
      });

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        recipientId: 'user2',
        content: 'Message with metadata',
        metadata: { forwarded: true, originalSender: 'user3' },
      });
    });
  });

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const mockEditedMessage = {
        id: 'msg1',
        content: 'Edited content',
        isEdited: true,
        editedAt: new Date(),
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockEditedMessage },
      });

      const result = await messageService.editMessage('msg1', 'Edited content');

      expect(apiClient.put).toHaveBeenCalledWith('/messages/msg1', {
        content: 'Edited content',
      });
      expect(result).toEqual(mockEditedMessage);
    });

    it('should handle edit errors', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(
        new Error('Cannot edit message after 15 minutes')
      );

      await expect(
        messageService.editMessage('msg1', 'New content')
      ).rejects.toThrow('Cannot edit message after 15 minutes');
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message by default', async () => {
      const mockResponse = { success: true, message: 'Message deleted' };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: mockResponse,
      });

      const result = await messageService.deleteMessage('msg1');

      expect(apiClient.delete).toHaveBeenCalledWith('/messages/msg1', {
        params: { deleteType: undefined },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should soft delete when explicitly specified', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { success: true },
      });

      await messageService.deleteMessage('msg1', 'soft');

      expect(apiClient.delete).toHaveBeenCalledWith('/messages/msg1', {
        params: { deleteType: 'soft' },
      });
    });

    it('should hard delete when specified', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { success: true },
      });

      await messageService.deleteMessage('msg1', 'hard');

      expect(apiClient.delete).toHaveBeenCalledWith('/messages/msg1', {
        params: { deleteType: 'hard' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark single message as read', async () => {
      const mockResponse = { success: true, markedCount: 1 };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockResponse,
      });

      const result = await messageService.markAsRead(['msg1']);

      expect(apiClient.post).toHaveBeenCalledWith('/messages/read', {
        messageIds: ['msg1'],
      });
      expect(result).toEqual(mockResponse);
    });

    it('should mark multiple messages as read', async () => {
      const mockResponse = { success: true, markedCount: 3 };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockResponse,
      });

      const result = await messageService.markAsRead(['msg1', 'msg2', 'msg3']);

      expect(apiClient.post).toHaveBeenCalledWith('/messages/read', {
        messageIds: ['msg1', 'msg2', 'msg3'],
      });
      expect(result.markedCount).toBe(3);
    });

    it('should handle empty message array', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, markedCount: 0 },
      });

      await messageService.markAsRead([]);

      expect(apiClient.post).toHaveBeenCalledWith('/messages/read', {
        messageIds: [],
      });
    });
  });
});
