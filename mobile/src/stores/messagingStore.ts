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
  loadOlderMessages: (conversationId: string, page: number) => Promise<{ messages: Message[]; hasMore: boolean }>;
  sendMessage: (conversationId: string, content: string, replyTo?: string, file?: any) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string, deleteForEveryone?: boolean) => Promise<void>;
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

  // Reactions
  addReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
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
      const conversationsData = response.data?.data || response.data || [];

      // Transform backend conversation format to match frontend expectations
      const transformedConversations = Array.isArray(conversationsData)
        ? conversationsData.map((conv: any) => {
            if (conv.type === 'direct' && conv.user) {
              // Transform direct conversation format
              const user = {
                ...conv.user,
                // Map profilePicture to avatar for consistency
                avatar: conv.user.profilePicture || conv.user.avatar,
                // Ensure isOnline is set
                isOnline: conv.user.onlineStatus === 'online',
                // Compute name if not present
                name: conv.user.name ||
                      (conv.user.firstName && conv.user.lastName
                        ? `${conv.user.firstName} ${conv.user.lastName}`
                        : conv.user.firstName || conv.user.username || 'Unknown'),
              };

              return {
                id: conv.user.id, // Use user ID as conversation ID for direct messages
                type: 'direct' as const,
                participants: [user],
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount || 0,
                createdAt: conv.lastMessageAt || new Date().toISOString(),
                updatedAt: conv.lastMessageAt || new Date().toISOString(),
                createdBy: conv.user.id, // Add required createdBy field
              };
            } else if (conv.type === 'group' && conv.group) {
              // Transform group conversation format
              return {
                id: conv.group.id,
                type: 'group' as const,
                name: conv.group.name,
                description: conv.group.description,
                avatar: conv.group.avatar,
                participants: [], // Will be loaded separately if needed
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount || 0,
                createdAt: conv.lastMessageAt || new Date().toISOString(),
                updatedAt: conv.lastMessageAt || new Date().toISOString(),
                createdBy: conv.group.createdBy || conv.group.id, // Add required createdBy field
              };
            }
            // Fallback: ensure all required fields exist
            return {
              ...conv,
              type: conv.type || 'direct',
              participants: conv.participants || [],
              unreadCount: conv.unreadCount || 0,
              createdBy: conv.createdBy || conv.id,
            };
          })
        : [];

      set({
        conversations: transformedConversations,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load conversations',
        isLoading: false,
        conversations: [], // Ensure conversations is always an array even on error
      });
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      console.log('[MessagingStore] Loading messages', {
        conversationId
      });

      // Find the conversation to determine if it's a direct message or group
      const { conversations } = get();
      const conversation = conversations.find(c => c.id === conversationId);

      console.log('[MessagingStore] Conversation found', {
        conversationType: conversation?.type,
        conversationId
      });

      let response;
      let params;
      if (conversation?.type === 'group') {
        // Load group messages - only first page (newest 50 messages)
        params = { groupId: conversationId, page: 1, limit: 50 };
        console.log('[MessagingStore] Calling getMessages with params:', params);
        response = await messagingAPI.getMessages(params);
      } else {
        // Load direct messages - only first page (newest 50 messages)
        params = { conversationWith: conversationId, page: 1, limit: 50 };
        console.log('[MessagingStore] Calling getMessages with params:', params);
        response = await messagingAPI.getMessages(params);
      }

      console.log('[MessagingStore] Messages loaded', {
        responseData: response.data,
        messageCount: (response.data?.data || response.data || []).length
      });

      const messages = response.data?.data || response.data || [];
      // Backend returns messages in DESC order (newest first), reverse for chat UI (oldest first)
      const messagesArray = Array.isArray(messages) ? messages.reverse() : [];

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messagesArray,
        },
      }));

      console.log('[MessagingStore] Messages set in state', {
        conversationId,
        messageCount: (Array.isArray(messages) ? messages : []).length
      });
    } catch (error: any) {
      console.error('[MessagingStore] Failed to load messages', {
        error: error.message,
        response: error.response?.data,
        conversationId
      });

      set({
        error: error.response?.data?.message || 'Failed to load messages',
      });
    }
  },

  loadOlderMessages: async (conversationId: string, page: number) => {
    try {
      console.log('[MessagingStore] Loading older messages', {
        conversationId,
        page
      });

      const { conversations } = get();
      const conversation = conversations.find(c => c.id === conversationId);

      let response;
      let params: any = { page, limit: 50 };

      if (conversation?.type === 'group') {
        params.groupId = conversationId;
      } else {
        params.conversationWith = conversationId;
      }

      response = await messagingAPI.getMessages(params);

      const messagesData = response.data?.data || response.data || [];
      const pagination = response.data?.pagination;

      // Backend returns DESC, reverse for chronological order
      const newMessages = Array.isArray(messagesData) ? messagesData.reverse() : [];

      // Prepend older messages to existing messages, avoiding duplicates
      set((state) => {
        const existingMessages = state.messages[conversationId] || [];
        const existingIds = new Set(existingMessages.map(m => m.id));

        // Filter out any duplicates from new messages
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        return {
          messages: {
            ...state.messages,
            [conversationId]: [...uniqueNewMessages, ...existingMessages],
          },
        };
      });

      console.log('[MessagingStore] Older messages loaded', {
        conversationId,
        newMessagesCount: newMessages.length,
        hasMore: pagination?.hasNextPage || false
      });

      return {
        messages: newMessages,
        hasMore: pagination?.hasNextPage || false
      };
    } catch (error: any) {
      console.error('[MessagingStore] Failed to load older messages', {
        error: error.message,
        response: error.response?.data,
        conversationId,
        page
      });

      return { messages: [], hasMore: false };
    }
  },

  sendMessage: async (conversationId: string, content: string, replyTo?: string, file?: any) => {
    try {
      console.log('[MessagingStore] Sending message', {
        conversationId,
        contentLength: content?.length,
        hasReplyTo: !!replyTo,
        hasFile: !!file
      });

      const response = await messagingAPI.sendMessage(conversationId, content, 'text', replyTo, file);

      console.log('[MessagingStore] Message sent successfully', {
        status: response.status,
        data: response.data
      });

      // Extract message from response (API returns {success, data: message, message: string})
      const newMessage = response.data.data || response.data;

      set((state) => {
        const existingMessages = state.messages[conversationId] || [];
        // Check if message already exists to avoid duplicates (e.g., from WebSocket echo)
        const messageExists = existingMessages.some(m => m.id === newMessage.id);

        return {
          messages: {
            ...state.messages,
            [conversationId]: messageExists
              ? existingMessages
              : [...existingMessages, newMessage],
          },
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, lastMessage: newMessage, updatedAt: new Date().toISOString() }
              : conv
          ),
        };
      });
    } catch (error: any) {
      console.error('[MessagingStore] Failed to send message', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        conversationId
      });

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

  deleteMessage: async (conversationId: string, messageId: string, deleteForEveryone: boolean = false) => {
    try {
      await messagingAPI.deleteMessage(conversationId, messageId, deleteForEveryone);

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
      await messagingAPI.markAsRead(messageId);

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

    set((state) => {
      const existingMessages = state.messages[conversationId] || [];
      // Check if message already exists to avoid duplicates
      const messageExists = existingMessages.some(m => m.id === message.id);

      return {
        messages: {
          ...state.messages,
          [conversationId]: messageExists
            ? existingMessages
            : [...existingMessages, message],
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
            : conv
        ),
      };
    });
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

  addReaction: async (conversationId: string, messageId: string, emoji: string) => {
    try {
      const { user } = require('./authStore').useAuthStore.getState();

      // Optimistic update
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || [];
              const existingReaction = reactions.find(r => r.emoji === emoji);

              if (existingReaction) {
                // Add user to existing reaction
                if (!existingReaction.users.includes(user.id)) {
                  return {
                    ...msg,
                    reactions: reactions.map(r =>
                      r.emoji === emoji
                        ? { ...r, users: [...r.users, user.id] }
                        : r
                    ),
                  };
                }
              } else {
                // Create new reaction
                return {
                  ...msg,
                  reactions: [...reactions, { emoji, users: [user.id] }],
                };
              }
            }
            return msg;
          }),
        },
      }));

      // TODO: API call to persist reaction
      // await messagingAPI.addReaction(conversationId, messageId, emoji);
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
    }
  },

  removeReaction: async (conversationId: string, messageId: string, emoji: string) => {
    try {
      const { user } = require('./authStore').useAuthStore.getState();

      // Optimistic update
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) => {
            if (msg.id === messageId) {
              const reactions = msg.reactions || [];
              return {
                ...msg,
                reactions: reactions
                  .map(r =>
                    r.emoji === emoji
                      ? { ...r, users: r.users.filter(uid => uid !== user.id) }
                      : r
                  )
                  .filter(r => r.users.length > 0), // Remove reactions with no users
              };
            }
            return msg;
          }),
        },
      }));

      // TODO: API call to persist reaction removal
      // await messagingAPI.removeReaction(conversationId, messageId, emoji);
    } catch (error: any) {
      console.error('Failed to remove reaction:', error);
    }
  },
}));