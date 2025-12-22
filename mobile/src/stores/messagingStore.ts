import { create } from 'zustand';
import { messagingAPI, wsService, API_URL } from '../services/api';
import { Conversation, Message } from '../types';

// Utility function to convert relative avatar URLs to absolute URLs
const getFullAvatarUrl = (avatarPath: string | null | undefined): string | undefined => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath; // Already absolute URL
  }
  // Relative path - prepend API_URL
  return `${API_URL}${avatarPath}`;
};

interface MessagingState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  setConversations: (conversations: Conversation[]) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string, page: number) => Promise<{ messages: Message[]; hasMore: boolean }>;
  sendMessage: (conversationId: string, content: string, replyTo?: string, file?: any, encryption?: any) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  markAsRead: (conversationId: string, messageId: string) => Promise<void>;
  markMessagesAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
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
              // Map profilePicture to avatar for consistency and convert to full URL
              avatar: getFullAvatarUrl(conv.user.profilePicture || conv.user.avatar),
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
              avatar: getFullAvatarUrl(conv.group.avatar),
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

  setConversations: (conversations: Conversation[]) => {
    set({ conversations });
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
        messageCount: (response.data?.data || response.data || []).length,
        pagination: response.data?.pagination
      });

      const messages = response.data?.data || response.data || [];
      // Backend returns messages in DESC order (newest first), keep as-is for inverted FlatList
      const messagesArray = Array.isArray(messages) ? messages : [];

      console.log('[MessagingStore] Processing messages', {
        conversationId,
        receivedCount: messages.length,
        hasMore: response.data?.pagination?.hasNextPage,
        totalMessages: response.data?.pagination?.totalMessages
      });

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messagesArray,
        },
      }));

      console.log('[MessagingStore] Messages set in state', {
        conversationId,
        messageCount: messagesArray.length,
        firstMessageId: messagesArray[0]?.id,
        lastMessageId: messagesArray[messagesArray.length - 1]?.id
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

      // Backend returns DESC (newest first), keep as-is for inverted FlatList
      const newMessages = Array.isArray(messagesData) ? messagesData : [];

      // Append older messages to end of array (they're older, so lower indices in inverted list)
      set((state) => {
        const existingMessages = state.messages[conversationId] || [];
        const existingIds = new Set(existingMessages.map(m => m.id));

        // Filter out any duplicates from new messages
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        return {
          messages: {
            ...state.messages,
            [conversationId]: [...existingMessages, ...uniqueNewMessages],
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

  sendMessage: async (conversationId: string, content: string, replyTo?: string, file?: any, encryption?: any) => {
    try {
      console.log('[MessagingStore] Sending message', {
        conversationId,
        contentLength: content?.length,
        hasReplyTo: !!replyTo,
        hasFile: !!file,
        fileData: file
      });

      // Determine message type
      // file can be either:
      // 1. An uploaded file object from backend: { id, fileUrl, fileName, mimeType, fileSize }
      // 2. A local file object: { uri, type, name }
      const type = file ? (
        file.mimeType?.startsWith('image/') ||
          file.type?.startsWith('image/') ? 'image' : 'file'
      ) : 'text';

      console.log('[MessagingStore] File details', {
        type,
        fileData: file
      });

      const response = await messagingAPI.sendMessage(conversationId, content, type, file, replyTo, encryption);

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
            // Prepend to beginning for inverted FlatList (newest at index 0)
            [conversationId]: messageExists
              ? existingMessages
              : [newMessage, ...existingMessages],
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
      await messagingAPI.editMessage(messageId, content);

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
      await messagingAPI.deleteMessage(messageId, deleteForEveryone);

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
      // Update state OPTIMISTICALLY before API call to prevent duplicate requests
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

      // Then send API request
      await messagingAPI.markMessagesAsRead([messageId]);
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);

      // Rollback on error - restore isRead: false
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            msg.id === messageId ? { ...msg, isRead: false } : msg
          ),
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unreadCount: conv.unreadCount + 1 }
            : conv
        ),
      }));
    }
  },

  markMessagesAsRead: async (conversationId: string, messageIds: string[]) => {
    try {
      // Update state OPTIMISTICALLY before API call to prevent duplicate requests
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
          ),
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - messageIds.length) }
            : conv
        ),
      }));

      // Then send API request
      await messagingAPI.markMessagesAsRead(messageIds);
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);

      // Rollback on error - restore isRead: false for failed messages
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, isRead: false } : msg
          ),
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unreadCount: conv.unreadCount + messageIds.length }
            : conv
        ),
      }));
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
          // Prepend to beginning for inverted FlatList (newest at index 0)
          [conversationId]: messageExists
            ? existingMessages
            : [message, ...existingMessages],
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

      // API call to persist reaction
      await messagingAPI.addReaction(messageId, emoji);
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

      // API call to persist reaction removal
      await messagingAPI.removeReaction(messageId, emoji);
    } catch (error: any) {
      console.error('Failed to remove reaction:', error);
    }
  },
}));