import apiClient from '@/lib/api-client';

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

    // Debug: Log messages with reactions
    const messages = response.data.data;
    const messagesWithReactions = messages.filter((msg: any) =>
      msg.reactions && Object.keys(msg.reactions).length > 0
    );
    if (messagesWithReactions.length > 0) {
      console.log('📦 API returned messages with reactions:', messagesWithReactions);
    } else {
      console.log('📦 API returned NO messages with reactions');
    }

    return messages;
  },

  async sendMessage(data: {
    recipientId?: string;
    groupId?: string;
    content: string;
    messageType?: string;
    replyToId?: string;
    metadata?: Record<string, any>;
  }) {
    console.log('🌐 messageService.sendMessage called with:', data);
    console.log('🌐 About to POST to:', '/messages');
    const response = await apiClient.post('/messages', data);
    console.log('🌐 POST response received:', response.data);
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
