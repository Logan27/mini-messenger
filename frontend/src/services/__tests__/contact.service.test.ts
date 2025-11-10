import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contactService } from '../contact.service';
import apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('contactService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContacts', () => {
    it('should fetch contacts without parameters', async () => {
      const mockContacts = [
        { id: '1', user: { id: 'user1', username: 'john' }, status: 'accepted' },
        { id: '2', user: { id: 'user2', username: 'jane' }, status: 'accepted' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockContacts },
      });

      const result = await contactService.getContacts();

      expect(apiClient.get).toHaveBeenCalledWith('/contacts', { params: undefined });
      expect(result).toEqual(mockContacts);
    });

    it('should fetch contacts with status filter', async () => {
      const mockPendingContacts = [
        { id: '3', user: { id: 'user3', username: 'bob' }, status: 'pending' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockPendingContacts },
      });

      const result = await contactService.getContacts({ status: 'pending' });

      expect(apiClient.get).toHaveBeenCalledWith('/contacts', {
        params: { status: 'pending' },
      });
      expect(result).toEqual(mockPendingContacts);
    });

    it('should fetch contacts with pagination', async () => {
      const mockContacts = [];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockContacts },
      });

      await contactService.getContacts({ page: 2, limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/contacts', {
        params: { page: 2, limit: 20 },
      });
    });

    it('should fetch blocked contacts', async () => {
      const mockBlockedContacts = [
        { id: '4', user: { id: 'user4', username: 'blocked' }, status: 'blocked' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockBlockedContacts },
      });

      const result = await contactService.getContacts({ status: 'blocked' });

      expect(result).toEqual(mockBlockedContacts);
    });
  });

  describe('addContact', () => {
    it('should add a new contact', async () => {
      const mockContact = {
        id: 'contact1',
        userId: 'user123',
        status: 'pending',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockContact },
      });

      const result = await contactService.addContact('user123');

      expect(apiClient.post).toHaveBeenCalledWith('/contacts', {
        userId: 'user123',
      });
      expect(result).toEqual(mockContact);
    });

    it('should handle API errors when adding contact', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('User already in contacts')
      );

      await expect(contactService.addContact('user123')).rejects.toThrow(
        'User already in contacts'
      );
    });
  });

  describe('acceptContact', () => {
    it('should accept a contact request', async () => {
      const mockAcceptedContact = {
        id: 'contact1',
        status: 'accepted',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockAcceptedContact },
      });

      const result = await contactService.acceptContact('contact1');

      expect(apiClient.post).toHaveBeenCalledWith('/contacts/contact1/accept');
      expect(result).toEqual(mockAcceptedContact);
    });
  });

  describe('rejectContact', () => {
    it('should reject a contact request', async () => {
      const mockResponse = { success: true, message: 'Contact rejected' };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockResponse,
      });

      const result = await contactService.rejectContact('contact1');

      expect(apiClient.post).toHaveBeenCalledWith('/contacts/contact1/reject');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeContact', () => {
    it('should remove a contact', async () => {
      const mockResponse = { success: true, message: 'Contact removed' };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: mockResponse,
      });

      const result = await contactService.removeContact('contact1');

      expect(apiClient.delete).toHaveBeenCalledWith('/contacts/contact1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('blockContact', () => {
    it('should block a contact', async () => {
      const mockBlockedContact = {
        id: 'contact1',
        status: 'blocked',
        blockedAt: new Date().toISOString(),
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockBlockedContact },
      });

      const result = await contactService.blockContact('contact1');

      expect(apiClient.post).toHaveBeenCalledWith('/contacts/contact1/block');
      expect(result).toEqual(mockBlockedContact);
    });
  });

  describe('unblockContact', () => {
    it('should unblock a contact', async () => {
      const mockUnblockedContact = {
        id: 'contact1',
        status: 'accepted',
      };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { data: mockUnblockedContact },
      });

      const result = await contactService.unblockContact('contact1');

      expect(apiClient.delete).toHaveBeenCalledWith('/contacts/contact1/block');
      expect(result).toEqual(mockUnblockedContact);
    });
  });

  describe('muteContact', () => {
    it('should mute a contact', async () => {
      const mockMutedContact = {
        id: 'contact1',
        isMuted: true,
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockMutedContact },
      });

      const result = await contactService.muteContact('contact1');

      expect(apiClient.post).toHaveBeenCalledWith('/contacts/contact1/mute');
      expect(result).toEqual(mockMutedContact);
    });
  });

  describe('unmuteContact', () => {
    it('should unmute a contact', async () => {
      const mockUnmutedContact = {
        id: 'contact1',
        isMuted: false,
      };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { data: mockUnmutedContact },
      });

      const result = await contactService.unmuteContact('contact1');

      expect(apiClient.delete).toHaveBeenCalledWith('/contacts/contact1/mute');
      expect(result).toEqual(mockUnmutedContact);
    });
  });
});
