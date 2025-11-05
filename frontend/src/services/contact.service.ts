import apiClient from '@/lib/api-client';

export interface Contact {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  userId?: string; // The user who sent the request
  contactUserId?: string; // The user who received the request
  nickname?: string;
  notes?: string;
  isFavorite: boolean;
  isMuted?: boolean;
  lastContactAt?: Date;
  blockedAt?: Date;
  user: {
    id: string;
    username: string;
    profilePicture?: string;
    onlineStatus: string;
  };
  createdAt: Date;
}

export const contactService = {
  async getContacts(params?: {
    status?: 'pending' | 'accepted' | 'blocked';
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/contacts', { params });
    return response.data.data;
  },

  async addContact(contactUserId: string) {
    // Backend expects 'userId', not 'contactUserId'
    const response = await apiClient.post('/contacts', { userId: contactUserId });
    return response.data.data;
  },

  async acceptContact(contactId: string) {
    const response = await apiClient.post(`/contacts/${contactId}/accept`);
    return response.data.data;
  },

  async rejectContact(contactId: string) {
    const response = await apiClient.post(`/contacts/${contactId}/reject`);
    return response.data;
  },

  async removeContact(contactId: string) {
    const response = await apiClient.delete(`/contacts/${contactId}`);
    return response.data;
  },

  async blockContact(contactId: string) {
    const response = await apiClient.post(`/contacts/${contactId}/block`);
    return response.data.data;
  },

  async unblockContact(contactId: string) {
    const response = await apiClient.delete(`/contacts/${contactId}/block`);
    return response.data.data;
  },

  async muteContact(contactId: string) {
    const response = await apiClient.post(`/contacts/${contactId}/mute`);
    return response.data.data;
  },

  async unmuteContact(contactId: string) {
    const response = await apiClient.delete(`/contacts/${contactId}/mute`);
    return response.data.data;
  },
};
