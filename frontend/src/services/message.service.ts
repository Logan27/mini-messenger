import apiClient from '@/lib/api-client';
import { offlineQueueService } from './offlineQueue.service';
import { toast } from 'sonner';

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content?: string;
  encryptedContent?: string;
  messageType: 'text' | 'image' | 'file' | 'video' | 'audio';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isRead: boolean;
  isDelivered: boolean;
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  replyToId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export const messageService = {
  async getMessages(params: {
    recipientId?: string;
    groupId?: string;
    page?: number;
    limit?: number;
    before?: string;
  }) {
    // Backend expects 'conversationWith' instead of 'recipientId' for GET /messages
    const apiParams = {
      ...params,
      conversationWith: params.recipientId,
    };
    delete apiParams.recipientId;

    const response = await apiClient.get('/messages', { params: apiParams });

    return response.data.data;
  },

  async sendMessage(data: {
    recipientId?: string;
    groupId?: string;
    content: string;
    messageType?: string;
    replyToId?: string;
    metadata?: Record<string, unknown>;
    isEncrypted?: boolean;
    encryptedContent?: string;
    encryptionMetadata?: Record<string, unknown>;
  }) {

    // Check if user is offline
    if (!navigator.onLine) {

      // Add to offline queue
      await offlineQueueService.addToQueue({
        type: 'message',
        endpoint: '/messages',
        method: 'POST',
        data,
        maxRetries: 3,
      });

      toast.info('Message queued. Will send when online.');

      // Return a temporary message object for optimistic UI update
      return {
        id: `temp-${Date.now()}`,
        ...data,
        status: 'sent',
        isRead: false,
        isDelivered: false,
        isEdited: false,
        messageType: data.messageType || 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const response = await apiClient.post('/messages', data);
    return response.data.data;
  },

  async editMessage(messageId: string, content: string) {
    const response = await apiClient.put(`/messages/${messageId}`, { content });
    return response.data.data;
  },

  async deleteMessage(messageId: string, deleteType?: 'soft' | 'hard') {
    const response = await apiClient.delete(`/messages/${messageId}`, {
      params: { deleteType },
    });
    return response.data;
  },

  async markAsRead(messageIds: string[]) {
    const response = await apiClient.post('/messages/read', { messageIds });
    return response.data;
  },
};
