import { useContactStore } from '../contactStore';
import { contactAPI, userAPI } from '../../services/api';

// Mock APIs
jest.mock('../../services/api', () => ({
  contactAPI: {
    getContacts: jest.fn(),
    addContact: jest.fn(),
    acceptContact: jest.fn(),
    rejectContact: jest.fn(),
    deleteContact: jest.fn(),
    blockContact: jest.fn(),
    unblockContact: jest.fn(),
    favoriteContact: jest.fn(),
    unfavoriteContact: jest.fn(),
    muteContact: jest.fn(),
    unmuteContact: jest.fn(),
    updateContact: jest.fn(),
  },
  userAPI: {
    searchUsers: jest.fn(),
  },
}));

describe('contactStore', () => {
  beforeEach(() => {
    // Reset store state
    useContactStore.setState({
      contacts: [],
      contactRequests: [],
      blockedContacts: [],
      searchResults: [],
      isLoading: false,
      error: null,
      selectedContact: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useContactStore.getState();

      expect(state.contacts).toEqual([]);
      expect(state.contactRequests).toEqual([]);
      expect(state.blockedContacts).toEqual([]);
      expect(state.searchResults).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedContact).toBeNull();
    });
  });

  describe('loadContacts', () => {
    it('loads contacts successfully', async () => {
      const mockContacts = [
        { id: 'contact-1', userId: 'user-1', username: 'alice', status: 'accepted' },
        { id: 'contact-2', userId: 'user-2', username: 'bob', status: 'accepted' },
      ];

      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: mockContacts },
      });

      await useContactStore.getState().loadContacts();

      const state = useContactStore.getState();
      expect(state.contacts).toEqual(mockContacts);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(contactAPI.getContacts).toHaveBeenCalledWith('accepted');
    });

    it('handles load contacts error', async () => {
      (contactAPI.getContacts as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Network error' } },
      });

      await useContactStore.getState().loadContacts();

      const state = useContactStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.contacts).toEqual([]);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (contactAPI.getContacts as jest.Mock).mockReturnValueOnce(promise);

      const loadPromise = useContactStore.getState().loadContacts();

      expect(useContactStore.getState().isLoading).toBe(true);

      resolvePromise!({ data: { data: [] } });
      await loadPromise;

      expect(useContactStore.getState().isLoading).toBe(false);
    });
  });

  describe('loadContactRequests', () => {
    it('loads contact requests successfully', async () => {
      const mockRequests = [
        { id: 'request-1', userId: 'user-1', contactUserId: 'user-2', status: 'pending' },
        { id: 'request-2', userId: 'user-3', contactUserId: 'user-2', status: 'pending' },
      ];

      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: mockRequests },
      });

      await useContactStore.getState().loadContactRequests();

      const state = useContactStore.getState();
      expect(state.contactRequests).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(contactAPI.getContacts).toHaveBeenCalledWith('pending');
    });

    it('handles load contact requests error', async () => {
      (contactAPI.getContacts as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Failed to load requests' } },
      });

      await useContactStore.getState().loadContactRequests();

      const state = useContactStore.getState();
      expect(state.error).toBe('Failed to load requests');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadBlockedContacts', () => {
    it('loads blocked contacts successfully', async () => {
      const mockBlocked = [
        { id: 'blocked-1', userId: 'user-5', username: 'spammer', status: 'blocked' },
      ];

      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: mockBlocked },
      });

      await useContactStore.getState().loadBlockedContacts();

      const state = useContactStore.getState();
      expect(state.blockedContacts).toEqual(mockBlocked);
      expect(state.isLoading).toBe(false);
      expect(contactAPI.getContacts).toHaveBeenCalledWith('blocked');
    });

    it('handles load blocked contacts error', async () => {
      (contactAPI.getContacts as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Failed to load blocked' } },
      });

      await useContactStore.getState().loadBlockedContacts();

      const state = useContactStore.getState();
      expect(state.error).toBe('Failed to load blocked');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('searches users successfully', async () => {
      const mockResults = [
        { id: 'user-1', username: 'alice', email: 'alice@example.com' },
        { id: 'user-2', username: 'alicia', email: 'alicia@example.com' },
      ];

      (userAPI.searchUsers as jest.Mock).mockResolvedValueOnce({
        data: { data: mockResults },
      });

      await useContactStore.getState().searchUsers('ali');

      const state = useContactStore.getState();
      expect(state.searchResults).toEqual(mockResults);
      expect(state.isLoading).toBe(false);
      expect(userAPI.searchUsers).toHaveBeenCalledWith('ali');
    });

    it('clears results for empty query', async () => {
      useContactStore.setState({
        searchResults: [{ id: 'user-1', username: 'alice', email: 'alice@example.com' }],
      });

      await useContactStore.getState().searchUsers('  ');

      const state = useContactStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(userAPI.searchUsers).not.toHaveBeenCalled();
    });

    it('handles search error', async () => {
      (userAPI.searchUsers as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Search failed' } },
      });

      await useContactStore.getState().searchUsers('test');

      const state = useContactStore.getState();
      expect(state.error).toBe('Search failed');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addContact', () => {
    it('adds contact successfully', async () => {
      (contactAPI.addContact as jest.Mock).mockResolvedValueOnce({});
      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await useContactStore.getState().addContact('user-1', 'Alice', 'Friend from work');

      expect(contactAPI.addContact).toHaveBeenCalledWith('user-1', 'Alice', 'Friend from work');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('pending');
    });

    it('throws error on add contact failure', async () => {
      const mockError = {
        response: { data: { message: 'User not found' } },
      };
      (contactAPI.addContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().addContact('invalid-user');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('User not found');
    });
  });

  describe('acceptContact', () => {
    it('accepts contact request successfully', async () => {
      (contactAPI.acceptContact as jest.Mock).mockResolvedValueOnce({});
      (contactAPI.getContacts as jest.Mock)
        .mockResolvedValueOnce({ data: { data: [] } }) // loadContacts
        .mockResolvedValueOnce({ data: { data: [] } }); // loadContactRequests

      await useContactStore.getState().acceptContact('request-1');

      expect(contactAPI.acceptContact).toHaveBeenCalledWith('request-1');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('accepted');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('pending');
    });

    it('throws error on accept failure', async () => {
      const mockError = {
        response: { data: { message: 'Accept failed' } },
      };
      (contactAPI.acceptContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().acceptContact('request-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Accept failed');
    });
  });

  describe('rejectContact', () => {
    it('rejects contact request successfully', async () => {
      (contactAPI.rejectContact as jest.Mock).mockResolvedValueOnce({});
      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await useContactStore.getState().rejectContact('request-1');

      expect(contactAPI.rejectContact).toHaveBeenCalledWith('request-1');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('pending');
    });

    it('throws error on reject failure', async () => {
      const mockError = {
        response: { data: { message: 'Reject failed' } },
      };
      (contactAPI.rejectContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().rejectContact('request-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Reject failed');
    });
  });

  describe('deleteContact', () => {
    it('deletes contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', status: 'accepted' },
          { id: 'contact-2', userId: 'user-2', username: 'bob', status: 'accepted' },
        ],
      });

      (contactAPI.deleteContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().deleteContact('contact-1');

      const state = useContactStore.getState();
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].id).toBe('contact-2');
      expect(contactAPI.deleteContact).toHaveBeenCalledWith('contact-1');
    });

    it('throws error on delete failure', async () => {
      const mockError = {
        response: { data: { message: 'Delete failed' } },
      };
      (contactAPI.deleteContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().deleteContact('contact-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Delete failed');
    });
  });

  describe('blockContact', () => {
    it('blocks contact successfully', async () => {
      (contactAPI.blockContact as jest.Mock).mockResolvedValueOnce({});
      (contactAPI.getContacts as jest.Mock)
        .mockResolvedValueOnce({ data: { data: [] } }) // loadContacts
        .mockResolvedValueOnce({ data: { data: [] } }); // loadBlockedContacts

      await useContactStore.getState().blockContact('contact-1');

      expect(contactAPI.blockContact).toHaveBeenCalledWith('contact-1');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('accepted');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('blocked');
    });

    it('throws error on block failure', async () => {
      const mockError = {
        response: { data: { message: 'Block failed' } },
      };
      (contactAPI.blockContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().blockContact('contact-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Block failed');
    });
  });

  describe('unblockContact', () => {
    it('unblocks contact successfully', async () => {
      (contactAPI.unblockContact as jest.Mock).mockResolvedValueOnce({});
      (contactAPI.getContacts as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await useContactStore.getState().unblockContact('contact-1');

      expect(contactAPI.unblockContact).toHaveBeenCalledWith('contact-1');
      expect(contactAPI.getContacts).toHaveBeenCalledWith('blocked');
    });

    it('throws error on unblock failure', async () => {
      const mockError = {
        response: { data: { message: 'Unblock failed' } },
      };
      (contactAPI.unblockContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().unblockContact('contact-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Unblock failed');
    });
  });

  describe('favoriteContact', () => {
    it('favorites contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', isFavorite: false, status: 'accepted' },
        ],
      });

      (contactAPI.favoriteContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().favoriteContact('contact-1');

      const state = useContactStore.getState();
      expect(state.contacts[0].isFavorite).toBe(true);
      expect(contactAPI.favoriteContact).toHaveBeenCalledWith('contact-1');
    });

    it('throws error on favorite failure', async () => {
      const mockError = {
        response: { data: { message: 'Favorite failed' } },
      };
      (contactAPI.favoriteContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().favoriteContact('contact-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Favorite failed');
    });
  });

  describe('unfavoriteContact', () => {
    it('unfavorites contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', isFavorite: true, status: 'accepted' },
        ],
      });

      (contactAPI.unfavoriteContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().unfavoriteContact('contact-1');

      const state = useContactStore.getState();
      expect(state.contacts[0].isFavorite).toBe(false);
      expect(contactAPI.unfavoriteContact).toHaveBeenCalledWith('contact-1');
    });
  });

  describe('muteContact', () => {
    it('mutes contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', isMuted: false, status: 'accepted' },
        ],
      });

      (contactAPI.muteContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().muteContact('contact-1');

      const state = useContactStore.getState();
      expect(state.contacts[0].isMuted).toBe(true);
      expect(contactAPI.muteContact).toHaveBeenCalledWith('contact-1');
    });
  });

  describe('unmuteContact', () => {
    it('unmutes contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', isMuted: true, status: 'accepted' },
        ],
      });

      (contactAPI.unmuteContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().unmuteContact('contact-1');

      const state = useContactStore.getState();
      expect(state.contacts[0].isMuted).toBe(false);
      expect(contactAPI.unmuteContact).toHaveBeenCalledWith('contact-1');
    });
  });

  describe('updateContact', () => {
    it('updates contact successfully', async () => {
      useContactStore.setState({
        contacts: [
          { id: 'contact-1', userId: 'user-1', username: 'alice', nickname: '', notes: '', status: 'accepted' },
        ],
      });

      (contactAPI.updateContact as jest.Mock).mockResolvedValueOnce({});

      await useContactStore.getState().updateContact('contact-1', {
        nickname: 'Ally',
        notes: 'Best friend',
      });

      const state = useContactStore.getState();
      expect(state.contacts[0].nickname).toBe('Ally');
      expect(state.contacts[0].notes).toBe('Best friend');
      expect(contactAPI.updateContact).toHaveBeenCalledWith('contact-1', {
        nickname: 'Ally',
        notes: 'Best friend',
      });
    });

    it('throws error on update failure', async () => {
      const mockError = {
        response: { data: { message: 'Update failed' } },
      };
      (contactAPI.updateContact as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useContactStore.getState().updateContact('contact-1', { nickname: 'New' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useContactStore.getState().error).toBe('Update failed');
    });
  });

  describe('setSelectedContact', () => {
    it('sets selected contact', () => {
      const contact = {
        id: 'contact-1',
        userId: 'user-1',
        username: 'alice',
        status: 'accepted' as const,
      };

      useContactStore.getState().setSelectedContact(contact);

      const state = useContactStore.getState();
      expect(state.selectedContact).toEqual(contact);
    });

    it('clears selected contact', () => {
      useContactStore.setState({
        selectedContact: {
          id: 'contact-1',
          userId: 'user-1',
          username: 'alice',
          status: 'accepted',
        },
      });

      useContactStore.getState().setSelectedContact(null);

      const state = useContactStore.getState();
      expect(state.selectedContact).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useContactStore.setState({ error: 'Some error' });

      useContactStore.getState().clearError();

      const state = useContactStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
