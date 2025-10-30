import { create } from 'zustand';
import type { Message, Conversation, User } from '@/shared/lib/types';
import api from '@/shared/api';

interface MessageState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  hasMoreMessages: Record<string, boolean>;
  typingUsers: Record<string, User[]>;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string, page?: number, limit?: number) => Promise<void>;
  sendMessage: (recipientId: string, content: string, messageType?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  handleNewMessage: (message: Message) => void;
  handleMessageStatus: (data: { messageId: string; status: Message['status']; userId: string }) => void;
  handleTyping: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  markAsRead: (conversationId: string) => void;
  setTypingUsers: (conversationId: string, users: User[]) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isLoading: false,
  error: null,
  hasMoreMessages: {},
  typingUsers: {},

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch all users (exclude current user in the component)
      const usersResponse = await api.get('/users', {
        params: {
          limit: 100
        }
      });

      const usersData = usersResponse.data.data?.users || [];

      // Transform users into conversations (filter out current user will be done in component)
      const directConversations: Conversation[] = usersData.map((user: any) => ({
        id: user.id,
        name: user.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user.username,
        type: 'direct' as const,
        participants: [
          {
            id: user.id,
            name: user.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : user.username,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            isApproved: user.isApproved || user.status === 'active',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isOnline: user.isOnline || user.onlineStatus === 'online'
          }
        ],
        lastMessage: undefined,
        unreadCount: 0,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt
      }));

      // Fetch user's groups
      try {
        const groupsResponse = await api.get('/groups', {
          params: {
            limit: 100
          }
        });

        const groupsData = groupsResponse.data.data?.groups || [];

        // Transform groups into conversations
        const groupConversations: Conversation[] = groupsData.map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          type: 'group' as const,
          participants: group.members?.map((member: any) => ({
            id: member.userId || member.user?.id,
            userId: member.userId || member.user?.id,
            name: member.user?.firstName
              ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
              : member.user?.username,
            username: member.user?.username,
            email: member.user?.email,
            avatar: member.user?.avatar,
            role: member.user?.role,
            isApproved: member.user?.isApproved || member.user?.status === 'active',
            createdAt: member.user?.createdAt,
            updatedAt: member.user?.updatedAt,
            isOnline: member.user?.isOnline || member.user?.status === 'online'
          })) || [],
          lastMessage: undefined,
          unreadCount: 0,
          updatedAt: group.lastMessageAt || group.updatedAt,
          createdAt: group.createdAt
        }));

        // Combine direct and group conversations
        const allConversations = [...directConversations, ...groupConversations]

        set({
          conversations: allConversations,
          isLoading: false
        });
      } catch (groupsError) {
        console.error('Failed to load groups:', groupsError);
        // Still set direct conversations even if groups fail
        set({
          conversations: directConversations,
          isLoading: false
        });
      }
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      set({
        error: error.response?.data?.message || 'Failed to load conversations',
        isLoading: false
      });
    }
  },

  loadMessages: async (conversationId: string, page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch messages using the conversationWith parameter
      const response = await api.get('/messages', {
        params: {
          conversationWith: conversationId,
          page,
          limit
        }
      });

      const messagesData = response.data.data || [];
      const hasMore = response.data.pagination?.hasNextPage || false;

      // Transform messages to match frontend format
      const messages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        conversationId: conversationId,
        senderId: msg.senderId,
        content: msg.content,
        encryptedContent: msg.encryptedContent,
        type: msg.type || msg.messageType || 'text',
        status: msg.status || 'sent',
        replyToId: msg.replyToId,
        editedAt: msg.editedAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        metadata: msg.metadata,
        sender: msg.sender
      }));

      set({
        messages: { ...get().messages, [conversationId]: messages },
        hasMoreMessages: { ...get().hasMoreMessages, [conversationId]: hasMore },
        currentConversationId: conversationId,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      set({
        error: error.response?.data?.message || 'Failed to load messages',
        isLoading: false
      });
    }
  },

  sendMessage: async (recipientId: string, content: string, messageType = 'text') => {
    try {
      // Send message to backend API
      const response = await api.post('/messages', {
        recipientId,
        content,
        messageType
      });

      const newMessage: Message = {
        id: response.data.data.id,
        conversationId: recipientId,
        senderId: response.data.data.senderId,
        content: response.data.data.content,
        type: response.data.data.type || response.data.data.messageType || 'text',
        status: response.data.data.status || 'sent',
        createdAt: response.data.data.createdAt,
        updatedAt: response.data.data.updatedAt,
        metadata: response.data.data.metadata
      };

      // Add message to local state
      const currentMessages = get().messages[recipientId] || [];
      set({
        messages: {
          ...get().messages,
          [recipientId]: [...currentMessages, newMessage],
        },
        conversations: get().conversations.map((c) =>
          c.id === recipientId
            ? { ...c, lastMessage: newMessage, updatedAt: new Date().toISOString() }
            : c
        ),
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      set({
        error: error.response?.data?.message || 'Failed to send message'
      });
      throw error;
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      // Edit message via backend API
      const response = await api.patch(`/api/messages/${messageId}`, {
        content
      });

      const updatedMessage = response.data.data;

      // Update message in local state
      const messages = { ...get().messages };
      Object.keys(messages).forEach((conversationId) => {
        messages[conversationId] = messages[conversationId].map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: updatedMessage.content,
                editedAt: updatedMessage.editedAt || new Date().toISOString(),
                updatedAt: updatedMessage.updatedAt
              }
            : msg
        );
      });

      set({ messages });
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      set({
        error: error.response?.data?.message || 'Failed to edit message'
      });
      throw error;
    }
  },

  deleteMessage: async (messageId: string, deleteForEveryone = false) => {
    try {
      // Delete message via backend API
      await api.delete(`/api/messages/${messageId}`, {
        data: { deleteForEveryone }
      });

      // Remove message from local state or mark as deleted
      const messages = { ...get().messages };
      Object.keys(messages).forEach((conversationId) => {
        if (deleteForEveryone) {
          // Mark message as deleted (show "This message was deleted")
          messages[conversationId] = messages[conversationId].map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: 'This message was deleted',
                  type: 'system',
                  deletedAt: new Date().toISOString()
                }
              : msg
          );
        } else {
          // Remove message completely (delete for me)
          messages[conversationId] = messages[conversationId].filter(
            (msg) => msg.id !== messageId
          );
        }
      });

      set({ messages });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      set({
        error: error.response?.data?.message || 'Failed to delete message'
      });
      throw error;
    }
  },

  setCurrentConversation: (conversationId: string | null) => {
    set({ currentConversationId: conversationId });
  },

  setTyping: (_conversationId: string, _isTyping: boolean) => {
    // This will be handled by WebSocket integration
  },

  joinConversation: (conversationId: string) => {
    set({ currentConversationId: conversationId });
  },

  leaveConversation: (conversationId: string) => {
    if (get().currentConversationId === conversationId) {
      set({ currentConversationId: null });
    }
  },

  handleNewMessage: (message: Message) => {
    const conversationId = message.conversationId || message.senderId;
    const currentMessages = get().messages[conversationId] || [];

    // Check if message already exists
    if (currentMessages.find(m => m.id === message.id)) {
      return;
    }

    set({
      messages: {
        ...get().messages,
        [conversationId]: [...currentMessages, message],
      },
      conversations: get().conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
          : c
      ),
    });
  },

  handleMessageStatus: (data: { messageId: string; status: Message['status']; userId: string }) => {
    const messages = { ...get().messages };
    Object.keys(messages).forEach((conversationId) => {
      messages[conversationId] = messages[conversationId].map((msg) =>
        msg.id === data.messageId ? { ...msg, status: data.status } : msg
      );
    });
    set({ messages });
  },

  handleTyping: (data: { conversationId: string; userId: string; isTyping: boolean }) => {
    const typingUsers = { ...get().typingUsers };
    const currentTyping = typingUsers[data.conversationId] || [];

    if (data.isTyping) {
      // Add user to typing list if not already there
      const user = get().conversations
        .find(c => c.id === data.conversationId)
        ?.participants.find(p => p.id === data.userId);

      if (user && !currentTyping.find(u => u.id === user.id)) {
        typingUsers[data.conversationId] = [...currentTyping, user];
      }
    } else {
      // Remove user from typing list
      typingUsers[data.conversationId] = currentTyping.filter(u => u.id !== data.userId);
    }

    set({ typingUsers });
  },

  updateMessageStatus: (messageId: string, status: Message['status']) => {
    const messages = { ...get().messages };
    Object.keys(messages).forEach((conversationId) => {
      messages[conversationId] = messages[conversationId].map((msg) =>
        msg.id === messageId ? { ...msg, status } : msg
      );
    });
    set({ messages });
  },

  markAsRead: (conversationId: string) => {
    set({
      conversations: get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    });
  },

  setTypingUsers: (conversationId: string, users: User[]) => {
    set({
      typingUsers: { ...get().typingUsers, [conversationId]: users },
    });
  },
}));
