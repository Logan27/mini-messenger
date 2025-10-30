import { create } from 'zustand';
import { messagingAPI, wsService } from '../services/api';
import { Conversation, Message } from '../types';

interface MessagingState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  markAsRead: (conversationId: string, messageId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (conversationId: string, messageId: string) => void;

  // Real-time features
  typingUsers: Record<string, string[]>;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  // Initial state
  conversations: [],
  activeConversation: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},

  // Actions
  loadConversations: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await messagingAPI.getConversations();
      set({ conversations: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load conversations',
        isLoading: false
      });
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      const response = await messagingAPI.getConversation(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: response.data.messages || [],
        },
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load messages',
      });
    }
  },

  sendMessage: async (conversationId: string, content: string, type: string = 'text') => {
    try {
      const response = await messagingAPI.sendMessage(conversationId, content, type);
      const newMessage = response.data;

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), newMessage],
        },
      }));

      // Update conversation's last message
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: newMessage, updatedAt: new Date().toISOString() }
            : conv
        ),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to send message',
      });
      throw error;
    }
  },

  editMessage: async (conversationId: string, messageId: string, content: string) => {
    try {
      await messagingAPI.editMessage(conversationId, messageId, content);

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            msg.id === messageId
              ? { ...msg, content, editedAt: new Date().toISOString() }
              : msg
          ),
        },
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to edit message',
      });
      throw error;
    }
  },

  deleteMessage: async (conversationId: string, messageId: string) => {
    try {
      await messagingAPI.deleteMessage(conversationId, messageId);

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter(
            (msg) => msg.id !== messageId
          ),
        },
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete message',
      });
      throw error;
    }
  },

  markAsRead: async (conversationId: string, messageId: string) => {
    try {
      await messagingAPI.markAsRead(conversationId, messageId);

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            msg.id === messageId ? { ...msg, isRead: true } : msg
          ),
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - 1) }
            : conv
        ),
      }));
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
    }
  },

  setActiveConversation: (conversation: Conversation | null) => {
    set({ activeConversation: conversation });

    if (conversation) {
      // Mark conversation as read
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
        ),
      }));
    }
  },

  addMessage: (message: Message) => {
    const { conversationId } = message;

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
          : conv
      ),
    }));
  },

  updateMessage: (message: Message) => {
    const { conversationId, id } = message;

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === id ? message : msg
        ),
      },
    }));
  },

  removeMessage: (conversationId: string, messageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).filter(
          (msg) => msg.id !== messageId
        ),
      },
    }));
  },

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: isTyping
          ? [...(state.typingUsers[conversationId] || []).filter(id => id !== userId), userId]
          : (state.typingUsers[conversationId] || []).filter(id => id !== userId),
      },
    }));
  },

  joinConversation: (conversationId: string) => {
    wsService.emit('joinConversation', conversationId);
  },

  leaveConversation: (conversationId: string) => {
    wsService.emit('leaveConversation', conversationId);
  },
}));