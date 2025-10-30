import { api } from '@/shared/api'
import type {
  Conversation,
  Message,
  PaginatedResponse
} from '@/shared/lib/types'

export const messagingApi = {
  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<Conversation[]>('/api/conversations')
    return response.data || []
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get<Conversation>(`/api/conversations/${conversationId}`)
    return response.data
  },

  createConversation: async (participantIds: string[]): Promise<Conversation> => {
    const response = await api.post<Conversation>('/api/conversations', {
      participantIds
    })
    return response.data
  },

  // Messages
  getMessages: async (
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; hasMore: boolean }> => {
    const response = await api.get<{ messages: Message[]; hasMore: boolean }>(
      `/api/conversations/${conversationId}/messages`,
      { params: { page, limit } }
    )
    return response.data || { messages: [], hasMore: false }
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    type: Message['type'] = 'text'
  ): Promise<Message> => {
    const response = await api.post<Message>(`/api/conversations/${conversationId}/messages`, {
      content,
      type
    })
    return response.data
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const response = await api.put<Message>(`/api/messages/${messageId}`, { content })
    return response.data
  },

  deleteMessage: async (messageId: string, deleteForEveryone: boolean = false): Promise<void> => {
    if (deleteForEveryone) {
      await api.delete(`/api/messages/${messageId}`)
    } else {
      await api.patch(`/api/messages/${messageId}/delete`)
    }
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await api.post(`/api/messages/${messageId}/read`)
  },

  // Typing indicators
  sendTypingIndicator: async (conversationId: string, isTyping: boolean): Promise<void> => {
    await api.post(`/api/conversations/${conversationId}/typing`, { isTyping })
  },

  // Search
  searchConversations: async (query: string): Promise<Conversation[]> => {
    const response = await api.get<Conversation[]>('/api/conversations/search', {
      params: { q: query }
    })
    return response.data || []
  },

  searchMessages: async (
    conversationId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Message>> => {
    const response = await api.get<PaginatedResponse<Message>>(
      `/api/conversations/${conversationId}/messages/search`,
      { params: { q: query, page, limit } }
    )
    return response.data
  }
}