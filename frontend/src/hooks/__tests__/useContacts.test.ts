import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useContacts,
  useAddContact,
  useAcceptContact,
  useRejectContact,
  useRemoveContact,
  useBlockContact,
  useUnblockContact,
  useMuteContact,
  useUnmuteContact,
} from '../useContacts';
import { contactService } from '@/services/contact.service';
import { AllTheProviders, createTestQueryClient } from '@/tests/test-utils';

vi.mock('@/services/contact.service');

describe('useContacts hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  describe('useContacts', () => {
    it('should fetch accepted contacts by default', async () => {
      const mockContacts = [
        { id: '1', user: { id: 'user1', username: 'john' }, status: 'accepted' },
      ];

      vi.mocked(contactService.getContacts).mockResolvedValue(mockContacts);

      const { result } = renderHook(() => useContacts('accepted'), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.getContacts).toHaveBeenCalledWith({
        status: 'accepted',
      });
      expect(result.current.data).toEqual(mockContacts);
    });

    it('should fetch pending contacts', async () => {
      const mockPending = [
        { id: '2', user: { id: 'user2', username: 'jane' }, status: 'pending' },
      ];

      vi.mocked(contactService.getContacts).mockResolvedValue(mockPending);

      const { result } = renderHook(() => useContacts('pending'), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPending);
    });

    it('should handle loading state', () => {
      vi.mocked(contactService.getContacts).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useContacts('accepted'), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch contacts');
      vi.mocked(contactService.getContacts).mockRejectedValue(error);

      const { result } = renderHook(() => useContacts('accepted'), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('useAddContact', () => {
    it('should add contact and invalidate queries', async () => {
      const mockContact = { id: '1', userId: 'user1', status: 'pending' };
      vi.mocked(contactService.addContact).mockResolvedValue(mockContact);

      const { result } = renderHook(() => useAddContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('user1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.addContact).toHaveBeenCalledWith('user1');
      expect(result.current.data).toEqual(mockContact);
    });
  });

  describe('useAcceptContact', () => {
    it('should accept contact and invalidate queries', async () => {
      const mockAccepted = { id: '1', status: 'accepted' };
      vi.mocked(contactService.acceptContact).mockResolvedValue(mockAccepted);

      const { result } = renderHook(() => useAcceptContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.acceptContact).toHaveBeenCalledWith('contact1');
    });
  });

  describe('useRejectContact', () => {
    it('should reject contact', async () => {
      vi.mocked(contactService.rejectContact).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useRejectContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.rejectContact).toHaveBeenCalledWith('contact1');
    });
  });

  describe('useRemoveContact', () => {
    it('should remove contact', async () => {
      vi.mocked(contactService.removeContact).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useRemoveContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.removeContact).toHaveBeenCalledWith('contact1');
    });
  });

  describe('useBlockContact', () => {
    it('should block contact', async () => {
      const mockBlocked = { id: '1', status: 'blocked' };
      vi.mocked(contactService.blockContact).mockResolvedValue(mockBlocked);

      const { result } = renderHook(() => useBlockContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.blockContact).toHaveBeenCalledWith('contact1');
    });
  });

  describe('useUnblockContact', () => {
    it('should unblock contact', async () => {
      const mockUnblocked = { id: '1', status: 'accepted' };
      vi.mocked(contactService.unblockContact).mockResolvedValue(mockUnblocked);

      const { result } = renderHook(() => useUnblockContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.unblockContact).toHaveBeenCalledWith('contact1');
    });
  });

  describe('useMuteContact', () => {
    it('should mute contact and invalidate conversations', async () => {
      const mockMuted = { id: '1', isMuted: true };
      vi.mocked(contactService.muteContact).mockResolvedValue(mockMuted);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useMuteContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.muteContact).toHaveBeenCalledWith('contact1');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contacts'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['conversations'],
      });
    });
  });

  describe('useUnmuteContact', () => {
    it('should unmute contact and invalidate conversations', async () => {
      const mockUnmuted = { id: '1', isMuted: false };
      vi.mocked(contactService.unmuteContact).mockResolvedValue(mockUnmuted);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUnmuteContact(), {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      });

      result.current.mutate('contact1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(contactService.unmuteContact).toHaveBeenCalledWith('contact1');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contacts'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['conversations'],
      });
    });
  });
});
