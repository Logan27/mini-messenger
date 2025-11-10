import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useMarkAsRead,
} from '../useMessages';
import { messageService } from '@/services/message.service';
import { socketService } from '@/services/socket.service';
import { AllTheProviders, createTestQueryClient } from '@/tests/test-utils';

vi.mock('@/services/message.service');
vi.mock('@/services/socket.service');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user123' } }),
}));

describe('useMessages hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(socketService.on).mockReturnValue(vi.fn());
  });

  describe('useMessages', () => {
    it('should fetch messages for recipient', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'Hello', senderId: 'user1' },
      ];

      vi.mocked(messageService.getMessages).mockResolvedValue(mockMessages);

      const { result } = renderHook(
        () => useMessages({ recipientId: 'user2', limit: 50 }),
        {
          wrapper: ({ children }) => (
            <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
          ),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(messageService.getMessages).toHaveBeenCalledWith({
        recipientId: 'user2',
        groupId: undefined,
        limit: 50,
        before: undefined,
      });
    });

    it('should not fetch when no recipientId or groupId', () => {
      const { result } = renderHook(() => useMessages({ limit: 50 }), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(messageService.getMessages).not.toHaveBeenCalled();
    });

    it('should listen to socket events', () => {
      renderHook(() => useMessages({ recipientId: 'user2' }), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      expect(socketService.on).toHaveBeenCalledWith('message.new', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('message_delivered', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('message_read', expect.any(Function));
    });
  });

  describe('useSendMessage', () => {
    it('should send message with optimistic update', async () => {
      const mockMessage = { id: 'msg1', content: 'Test', createdAt: new Date() };
      vi.mocked(messageService.sendMessage).mockResolvedValue(mockMessage);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate({
        recipientId: 'user2',
        content: 'Test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(messageService.sendMessage).toHaveBeenCalledWith({
        recipientId: 'user2',
        content: 'Test',
      });
    });
  });

  describe('useEditMessage', () => {
    it('should edit message', async () => {
      const mockEdited = { id: 'msg1', content: 'Edited', isEdited: true };
      vi.mocked(messageService.editMessage).mockResolvedValue(mockEdited);

      const { result } = renderHook(() => useEditMessage(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate({ messageId: 'msg1', content: 'Edited' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useDeleteMessage', () => {
    it('should delete message', async () => {
      vi.mocked(messageService.deleteMessage).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useDeleteMessage(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate({ messageId: 'msg1', deleteType: 'soft' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useMarkAsRead', () => {
    it('should mark messages as read', async () => {
      vi.mocked(messageService.markAsRead).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate(['msg1', 'msg2']);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(messageService.markAsRead).toHaveBeenCalledWith(['msg1', 'msg2']);
    });
  });
});
