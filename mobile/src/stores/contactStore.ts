import { create } from 'zustand';
import { Contact, ContactRequest, User } from '../types';
import { contactAPI, userAPI } from '../services/api';

interface ContactState {
  contacts: Contact[];
  contactRequests: ContactRequest[];
  blockedContacts: Contact[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;

  // Actions
  loadContacts: () => Promise<void>;
  loadContactRequests: () => Promise<void>;
  loadBlockedContacts: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  addContact: (userId: string, nickname?: string, notes?: string) => Promise<void>;
  acceptContact: (contactId: string) => Promise<void>;
  rejectContact: (contactId: string) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  blockContact: (contactId: string) => Promise<void>;
  unblockContact: (contactId: string) => Promise<void>;
  favoriteContact: (contactId: string) => Promise<void>;
  unfavoriteContact: (contactId: string) => Promise<void>;
  muteContact: (contactId: string) => Promise<void>;
  unmuteContact: (contactId: string) => Promise<void>;
  updateContact: (contactId: string, data: { nickname?: string; notes?: string }) => Promise<void>;
  setSelectedContact: (contact: Contact | null) => void;
  clearError: () => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  contactRequests: [],
  blockedContacts: [],
  searchResults: [],
  isLoading: false,
  error: null,
  selectedContact: null,

  loadContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await contactAPI.getContacts('accepted');
      set({
        contacts: response.data.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load contacts',
        isLoading: false,
      });
    }
  },

  loadContactRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await contactAPI.getContacts('pending');
      const currentUserId = get().selectedContact?.userId; // We'll get this from authStore in real implementation

      const requests: ContactRequest[] = (response.data.data || []).map((contact: any) => ({
        ...contact,
        isIncoming: contact.contactUserId === currentUserId,
      }));

      set({
        contactRequests: requests,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load contact requests',
        isLoading: false,
      });
    }
  },

  loadBlockedContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await contactAPI.getContacts('blocked');
      set({
        blockedContacts: response.data.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load blocked contacts',
        isLoading: false,
      });
    }
  },

  searchUsers: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await userAPI.searchUsers(query);
      set({
        searchResults: response.data.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to search users',
        isLoading: false,
      });
    }
  },

  addContact: async (userId: string, nickname?: string, notes?: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.addContact(userId, nickname, notes);
      // Reload contacts to get updated list
      await get().loadContactRequests();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add contact',
        isLoading: false,
      });
      throw error;
    }
  },

  acceptContact: async (contactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.acceptContact(contactId);
      // Move from requests to contacts
      await Promise.all([
        get().loadContacts(),
        get().loadContactRequests(),
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to accept contact',
        isLoading: false,
      });
      throw error;
    }
  },

  rejectContact: async (contactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.rejectContact(contactId);
      // Remove from requests
      await get().loadContactRequests();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to reject contact',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteContact: async (contactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.deleteContact(contactId);
      // Remove from contacts
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== contactId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete contact',
        isLoading: false,
      });
      throw error;
    }
  },

  blockContact: async (contactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.blockContact(contactId);
      // Move to blocked list
      await Promise.all([
        get().loadContacts(),
        get().loadBlockedContacts(),
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to block contact',
        isLoading: false,
      });
      throw error;
    }
  },

  unblockContact: async (contactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await contactAPI.unblockContact(contactId);
      // Remove from blocked list
      await get().loadBlockedContacts();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to unblock contact',
        isLoading: false,
      });
      throw error;
    }
  },

  favoriteContact: async (contactId: string) => {
    try {
      await contactAPI.favoriteContact(contactId);
      // Update contact in list
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId ? { ...c, isFavorite: true } : c
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to favorite contact',
      });
      throw error;
    }
  },

  unfavoriteContact: async (contactId: string) => {
    try {
      await contactAPI.unfavoriteContact(contactId);
      // Update contact in list
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId ? { ...c, isFavorite: false } : c
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to unfavorite contact',
      });
      throw error;
    }
  },

  muteContact: async (contactId: string) => {
    try {
      await contactAPI.muteContact(contactId);
      // Update contact in list
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId ? { ...c, isMuted: true } : c
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to mute contact',
      });
      throw error;
    }
  },

  unmuteContact: async (contactId: string) => {
    try {
      await contactAPI.unmuteContact(contactId);
      // Update contact in list
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId ? { ...c, isMuted: false } : c
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to unmute contact',
      });
      throw error;
    }
  },

  updateContact: async (contactId: string, data: { nickname?: string; notes?: string }) => {
    try {
      await contactAPI.updateContact(contactId, data);
      // Update contact in list
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId ? { ...c, ...data } : c
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update contact',
      });
      throw error;
    }
  },

  setSelectedContact: (contact: Contact | null) => {
    set({ selectedContact: contact });
  },

  clearError: () => {
    set({ error: null });
  },
}));
