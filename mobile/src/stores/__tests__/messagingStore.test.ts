import { useMessagingStore } from '../messagingStore';
import { messagingAPI, wsService } from '../../services/api';

// Mock API
jest.mock('../../services/api', () => ({
  messagingAPI: {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    markAsRead: jest.fn(),
    markMessagesAsRead: jest.fn(),
  },
  wsService: {
    emit: jest.fn(),
  },
}));

// Mock authStore for reactions
jest.mock('../authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: 'user-1', username: 'testuser' },
    })),
  },
}));

describe('messagingStore', () => {
  beforeEach(() => {
    // Reset store state
    useMessagingStore.setState({
      conversations: [],
      activeConversation: null,
      messages: {},
      isLoading: false,
      error: null,
      typingUsers: {},
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useMessagingStore.getState();

      expect(state.conversations).toEqual([]);
      expect(state.activeConversation).toBeNull();
      expect(state.messages).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.typingUsers).toEqual({});
    });
  });

  describe('loadConversations', () => {
    it('loads conversations successfully', async () => {
      const mockConversations = [
        {
          type: 'direct',
          user: {
            id: 'user-1',
            username: 'alice',
            firstName: 'Alice',
            lastName: 'Smith',
            profilePicture: 'avatar.jpg',
            onlineStatus: 'online',
          },
          lastMessage: { content: 'Hello', createdAt: '2024-01-01' },
          unreadCount: 2,
          lastMessageAt: '2024-01-01',
        },
      ];

      (messagingAPI.getConversations as jest.Mock).mockResolvedValueOnce({
        data: mockConversations,
      });

      await useMessagingStore.getState().loadConversations();

      const state = useMessagingStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0].type).toBe('direct');
      expect(state.conversations[0].participants[0].name).toBe('Alice Smith');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('transforms direct conversations correctly', async () => {
      const mockConversations = [
        {
          type: 'direct',
          user: {
            id: 'user-2',
            username: 'bob',
            profilePicture: 'bob.jpg',
            onlineStatus: 'offline',
          },
          lastMessage: { content: 'Hi there', createdAt: '2024-01-02' },
          unreadCount: 0,
          lastMessageAt: '2024-01-02',
        },
      ];

      (messagingAPI.getConversations as jest.Mock).mockResolvedValueOnce({
        data: { data: mockConversations },
      });

      await useMessagingStore.getState().loadConversations();

      const state = useMessagingStore.getState();
      const conversation = state.conversations[0];

      expect(conversation.id).toBe('user-2');
      expect(conversation.type).toBe('direct');
      expect(conversation.participants[0].avatar).toBe('bob.jpg');
      expect(conversation.participants[0].isOnline).toBe(false);
      expect(conversation.unreadCount).toBe(0);
    });

    it('transforms group conversations correctly', async () => {
      const mockConversations = [
        {
          type: 'group',
          group: {
            id: 'group-1',
            name: 'Team Chat',
            description: 'Work team',
            avatar: 'group.jpg',
          },
          lastMessage: { content: 'Meeting at 3pm', createdAt: '2024-01-03' },
          unreadCount: 5,
          lastMessageAt: '2024-01-03',
        },
      ];

      (messagingAPI.getConversations as jest.Mock).mockResolvedValueOnce({
        data: mockConversations,
      });

      await useMessagingStore.getState().loadConversations();

      const state = useMessagingStore.getState();
      const conversation = state.conversations[0];

      expect(conversation.id).toBe('group-1');
      expect(conversation.type).toBe('group');
      expect(conversation.name).toBe('Team Chat');
      expect(conversation.description).toBe('Work team');
      expect(conversation.unreadCount).toBe(5);
    });

    it('handles load conversations error', async () => {
      (messagingAPI.getConversations as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Network error' } },
      });

      await useMessagingStore.getState().loadConversations();

      const state = useMessagingStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.conversations).toEqual([]);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (messagingAPI.getConversations as jest.Mock).mockReturnValueOnce(promise);

      const loadPromise = useMessagingStore.getState().loadConversations();

      expect(useMessagingStore.getState().isLoading).toBe(true);

      resolvePromise!({ data: [] });
      await loadPromise;

      expect(useMessagingStore.getState().isLoading).toBe(false);
    });
  });

  describe('loadMessages', () => {
    it('loads direct messages successfully', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', senderId: 'user-1' },
        { id: 'msg-2', content: 'Hi', senderId: 'user-2' },
      ];

      useMessagingStore.setState({
        conversations: [
          {
            id: 'user-2',
            type: 'direct',
            participants: [],
            unreadCount: 0,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      (messagingAPI.getMessages as jest.Mock).mockResolvedValueOnce({
        data: { data: mockMessages },
      });

      await useMessagingStore.getState().loadMessages('user-2');

      const state = useMessagingStore.getState();
      expect(state.messages['user-2']).toHaveLength(2);
      expect(messagingAPI.getMessages).toHaveBeenCalledWith({
        conversationWith: 'user-2',
        page: 1,
        limit: 50,
      });
    });

    it('loads group messages successfully', async () => {
      const mockMessages = [{ id: 'msg-1', content: 'Group message' }];

      useMessagingStore.setState({
        conversations: [
          {
            id: 'group-1',
            type: 'group',
            name: 'Team',
            participants: [],
            unreadCount: 0,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      (messagingAPI.getMessages as jest.Mock).mockResolvedValueOnce({
        data: mockMessages,
      });

      await useMessagingStore.getState().loadMessages('group-1');

      const state = useMessagingStore.getState();
      expect(state.messages['group-1']).toHaveLength(1);
      expect(messagingAPI.getMessages).toHaveBeenCalledWith({
        groupId: 'group-1',
        page: 1,
        limit: 50,
      });
    });

    it('handles load messages error', async () => {
      useMessagingStore.setState({
        conversations: [
          {
            id: 'user-2',
            type: 'direct',
            participants: [],
            unreadCount: 0,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      (messagingAPI.getMessages as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Failed to load' } },
      });

      await useMessagingStore.getState().loadMessages('user-2');

      const state = useMessagingStore.getState();
      expect(state.error).toBe('Failed to load');
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const newMessage = {
        id: 'msg-1',
        content: 'Test message',
        senderId: 'user-1',
        conversationId: 'conv-1',
        createdAt: '2024-01-01',
      };

      (messagingAPI.sendMessage as jest.Mock).mockResolvedValueOnce({
        data: newMessage,
      });

      await useMessagingStore.getState().sendMessage('conv-1', 'Test message');

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1']).toContainEqual(newMessage);
      expect(messagingAPI.sendMessage).toHaveBeenCalledWith(
        'conv-1',
        'Test message',
        'text',
        undefined,
        undefined
      );
    });

    it('updates conversation last message after sending', async () => {
      const newMessage = {
        id: 'msg-1',
        content: 'Latest message',
        senderId: 'user-1',
        conversationId: 'conv-1',
        createdAt: '2024-01-01',
      };

      useMessagingStore.setState({
        conversations: [
          {
            id: 'conv-1',
            type: 'direct',
            participants: [],
            unreadCount: 0,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      (messagingAPI.sendMessage as jest.Mock).mockResolvedValueOnce({
        data: newMessage,
      });

      await useMessagingStore.getState().sendMessage('conv-1', 'Latest message');

      const state = useMessagingStore.getState();
      expect(state.conversations[0].lastMessage).toEqual(newMessage);
    });

    it('throws error on send failure', async () => {
      const mockError = {
        response: { data: { message: 'Send failed' } },
      };
      (messagingAPI.sendMessage as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useMessagingStore.getState().sendMessage('conv-1', 'Test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      const state = useMessagingStore.getState();
      expect(state.error).toBe('Send failed');
    });
  });

  describe('editMessage', () => {
    it('edits message successfully', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Original',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
            },
          ],
        },
      });

      (messagingAPI.editMessage as jest.Mock).mockResolvedValueOnce({});

      await useMessagingStore
        .getState()
        .editMessage('conv-1', 'msg-1', 'Edited content');

      const state = useMessagingStore.getState();
      const editedMessage = state.messages['conv-1'][0];

      expect(editedMessage.content).toBe('Edited content');
      expect(editedMessage.editedAt).toBeDefined();
    });

    it('throws error on edit failure', async () => {
      const mockError = {
        response: { data: { message: 'Edit failed' } },
      };
      (messagingAPI.editMessage as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useMessagingStore.getState().editMessage('conv-1', 'msg-1', 'New content');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useMessagingStore.getState().error).toBe('Edit failed');
    });
  });

  describe('deleteMessage', () => {
    it('deletes message successfully', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Message 1',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
            },
            {
              id: 'msg-2',
              content: 'Message 2',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-02',
            },
          ],
        },
      });

      (messagingAPI.deleteMessage as jest.Mock).mockResolvedValueOnce({});

      await useMessagingStore.getState().deleteMessage('conv-1', 'msg-1');

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1']).toHaveLength(1);
      expect(state.messages['conv-1'][0].id).toBe('msg-2');
    });

    it('calls API with deleteForEveryone parameter', async () => {
      (messagingAPI.deleteMessage as jest.Mock).mockResolvedValueOnce({});

      await useMessagingStore.getState().deleteMessage('conv-1', 'msg-1', true);

      expect(messagingAPI.deleteMessage).toHaveBeenCalledWith(
        'msg-1',
        true
      );
    });
  });

  describe('markAsRead', () => {
    it('marks message as read successfully', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Unread message',
              senderId: 'user-2',
              conversationId: 'conv-1',
              isRead: false,
              createdAt: '2024-01-01',
            },
          ],
        },
        conversations: [
          {
            id: 'conv-1',
            type: 'direct',
            participants: [],
            unreadCount: 3,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      (messagingAPI.markMessagesAsRead as jest.Mock).mockResolvedValueOnce({});

      await useMessagingStore.getState().markAsRead('conv-1', 'msg-1');

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1'][0].isRead).toBe(true);
      expect(state.conversations[0].unreadCount).toBe(2);
      expect(messagingAPI.markMessagesAsRead).toHaveBeenCalledWith(['msg-1']);
    });
  });

  describe('setActiveConversation', () => {
    it('sets active conversation', () => {
      const conversation = {
        id: 'conv-1',
        type: 'direct' as const,
        participants: [],
        unreadCount: 5,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      useMessagingStore.setState({
        conversations: [conversation],
      });

      useMessagingStore.getState().setActiveConversation(conversation);

      const state = useMessagingStore.getState();
      expect(state.activeConversation).toEqual(conversation);
    });

    it('clears unread count when setting active conversation', () => {
      const conversation = {
        id: 'conv-1',
        type: 'direct' as const,
        participants: [],
        unreadCount: 5,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      useMessagingStore.setState({
        conversations: [conversation],
      });

      useMessagingStore.getState().setActiveConversation(conversation);

      const state = useMessagingStore.getState();
      expect(state.conversations[0].unreadCount).toBe(0);
    });
  });

  describe('addMessage', () => {
    it('adds message to conversation', () => {
      const message = {
        id: 'msg-1',
        content: 'New message',
        senderId: 'user-1',
        conversationId: 'conv-1',
        createdAt: '2024-01-01',
      };

      useMessagingStore.setState({
        conversations: [
          {
            id: 'conv-1',
            type: 'direct',
            participants: [],
            unreadCount: 0,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      });

      useMessagingStore.getState().addMessage(message);

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1']).toContainEqual(message);
      expect(state.conversations[0].lastMessage).toEqual(message);
    });
  });

  describe('updateMessage', () => {
    it('updates existing message', () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Original',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
            },
          ],
        },
      });

      const updatedMessage = {
        id: 'msg-1',
        content: 'Updated',
        senderId: 'user-1',
        conversationId: 'conv-1',
        createdAt: '2024-01-01',
      };

      useMessagingStore.getState().updateMessage(updatedMessage);

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1'][0].content).toBe('Updated');
    });
  });

  describe('removeMessage', () => {
    it('removes message from conversation', () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Message 1',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
            },
            {
              id: 'msg-2',
              content: 'Message 2',
              senderId: 'user-1',
              conversationId: 'conv-1',
              createdAt: '2024-01-02',
            },
          ],
        },
      });

      useMessagingStore.getState().removeMessage('conv-1', 'msg-1');

      const state = useMessagingStore.getState();
      expect(state.messages['conv-1']).toHaveLength(1);
      expect(state.messages['conv-1'][0].id).toBe('msg-2');
    });
  });

  describe('setTyping', () => {
    it('adds user to typing list', () => {
      useMessagingStore.getState().setTyping('conv-1', 'user-2', true);

      const state = useMessagingStore.getState();
      expect(state.typingUsers['conv-1']).toContain('user-2');
    });

    it('removes user from typing list', () => {
      useMessagingStore.setState({
        typingUsers: {
          'conv-1': ['user-2', 'user-3'],
        },
      });

      useMessagingStore.getState().setTyping('conv-1', 'user-2', false);

      const state = useMessagingStore.getState();
      expect(state.typingUsers['conv-1']).not.toContain('user-2');
      expect(state.typingUsers['conv-1']).toContain('user-3');
    });
  });

  describe('joinConversation', () => {
    it('emits joinConversation event', () => {
      useMessagingStore.getState().joinConversation('conv-1');

      expect(wsService.emit).toHaveBeenCalledWith('joinConversation', 'conv-1');
    });
  });

  describe('leaveConversation', () => {
    it('emits leaveConversation event', () => {
      useMessagingStore.getState().leaveConversation('conv-1');

      expect(wsService.emit).toHaveBeenCalledWith('leaveConversation', 'conv-1');
    });
  });

  describe('Reactions', () => {
    beforeEach(() => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Test message',
              senderId: 'user-2',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
              reactions: [],
            },
          ],
        },
      });
    });

    it('adds reaction to message', async () => {
      await useMessagingStore.getState().addReaction('conv-1', 'msg-1', '👍');

      const state = useMessagingStore.getState();
      const message = state.messages['conv-1'][0];

      expect(message.reactions).toHaveLength(1);
      expect(message.reactions![0].emoji).toBe('👍');
      expect(message.reactions![0].users).toContain('user-1');
    });

    it('adds user to existing reaction', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Test message',
              senderId: 'user-2',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
              reactions: [{ emoji: '👍', users: ['user-2'] }],
            },
          ],
        },
      });

      await useMessagingStore.getState().addReaction('conv-1', 'msg-1', '👍');

      const state = useMessagingStore.getState();
      const message = state.messages['conv-1'][0];

      expect(message.reactions).toHaveLength(1);
      expect(message.reactions![0].users).toEqual(['user-2', 'user-1']);
    });

    it('removes reaction from message', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Test message',
              senderId: 'user-2',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
              reactions: [{ emoji: '👍', users: ['user-1', 'user-2'] }],
            },
          ],
        },
      });

      await useMessagingStore.getState().removeReaction('conv-1', 'msg-1', '👍');

      const state = useMessagingStore.getState();
      const message = state.messages['conv-1'][0];

      expect(message.reactions).toHaveLength(1);
      expect(message.reactions![0].users).toEqual(['user-2']);
    });

    it('removes reaction entirely when last user removes it', async () => {
      useMessagingStore.setState({
        messages: {
          'conv-1': [
            {
              id: 'msg-1',
              content: 'Test message',
              senderId: 'user-2',
              conversationId: 'conv-1',
              createdAt: '2024-01-01',
              reactions: [{ emoji: '👍', users: ['user-1'] }],
            },
          ],
        },
      });

      await useMessagingStore.getState().removeReaction('conv-1', 'msg-1', '👍');

      const state = useMessagingStore.getState();
      const message = state.messages['conv-1'][0];

      expect(message.reactions).toHaveLength(0);
    });
  });
});
