import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/socket.service';
import { useAuth } from '@/contexts/AuthContext';

export function useSocket() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(socketService.isReconnecting());

  useEffect(() => {
    if (!isAuthenticated) return;

    // Don't call socketService.connect() here - AuthContext already handles connection
    // Just listen for connection status changes
    const unsubscribe = socketService.on('connection.status', (status: { connected: boolean; reconnecting: boolean }) => {
      setIsConnected(status.connected);
      setIsReconnecting(status.reconnecting);
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  const onNewMessage = useCallback((callback: (message: any) => void) => {
    return socketService.on('message.new', callback);
  }, []);

  const onMessageRead = useCallback((callback: (data: any) => void) => {
    return socketService.on('message_read', callback);  // Backend sends message_read with underscore
  }, []);

  const onTyping = useCallback((callback: (data: any) => void) => {
    return socketService.on('message.typing', (data: any) => {
      console.log('📬 Received typing indicator:', data);
      callback(data);
    });
  }, []);

  const onUserStatus = useCallback((callback: (data: any) => void) => {
    return socketService.on('user.status', callback);
  }, []);

  const sendTyping = useCallback((recipientId: string, isTyping: boolean) => {
    socketService.sendTyping(recipientId, isTyping);
  }, []);

  return {
    isConnected,
    isReconnecting,
    onNewMessage,
    onMessageRead,
    onTyping,
    onUserStatus,
    sendTyping,
  };
}

// Hook for listening to new messages and updating React Query cache
export function useMessageListener(activeChat?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeNew = socketService.on('message.new', (message: any) => {
      console.log('📨 Global message.new listener received:', {
        messageId: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        groupId: message.groupId,
        activeChat: activeChat
      });

      // Determine which chat this message belongs to
      // For direct messages: the other user's ID
      // For group messages: the group ID
      const messageChatId = message.groupId || message.senderId || message.recipientId;
      
      console.log('📨 Message chat ID:', messageChatId, 'Active chat:', activeChat);

      // If this message is for the currently active chat, invalidate its messages
      if (activeChat && messageChatId === activeChat) {
        console.log('✅ Message is for active chat, invalidating messages query');
        // For group messages
        if (message.groupId) {
          queryClient.invalidateQueries({ queryKey: ['messages', undefined, message.groupId] });
        } else {
          // For direct messages - figure out which user
          const otherUserId = message.senderId === message.recipientId ? message.senderId : 
                             (activeChat === message.senderId ? message.senderId : message.recipientId);
          queryClient.invalidateQueries({ queryKey: ['messages', otherUserId, undefined] });
        }
      }

      // Always invalidate conversations to update unread counts and last message
      // Small delay to ensure backend has committed the message to database
      console.log('📨 Scheduling conversations invalidation');
      setTimeout(() => {
        console.log('📨 Invalidating conversations and contacts');
        // Use refetchQueries to force immediate refetch
        queryClient.refetchQueries({ queryKey: ['conversations'] });
        queryClient.refetchQueries({ queryKey: ['contacts'] });
      }, 100);
    });

    // Listen for soft deleted messages
    const unsubscribeSoftDeleted = socketService.on('message_soft_deleted', (data: any) => {
      console.log('🗑️ Message soft deleted, updating UI:', data);

      // Invalidate messages query to refetch and remove deleted message
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Listen for hard deleted messages
    const unsubscribeHardDeleted = socketService.on('message_hard_deleted', (data: any) => {
      console.log('🗑️ Message hard deleted, updating UI:', data);

      // Invalidate messages query to refetch and remove deleted message
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      unsubscribeNew();
      unsubscribeSoftDeleted();
      unsubscribeHardDeleted();
    };
  }, [activeChat, queryClient]);
}

// Hook for listening to message read receipts
export function useReadReceiptListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Backend sends 'message_read' (underscore), not 'message.read' (dot)
    const unsubscribe = socketService.on('message_read', (data: { messageId: string }) => {
      console.log('📖 Read receipt received, refetching caches:', data);
      queryClient.refetchQueries({ queryKey: ['messages'] });
      // Refetch conversations to update unread counts
      queryClient.refetchQueries({ queryKey: ['conversations'] });
    });

    return unsubscribe;
  }, [queryClient]);
}

// Hook for online status updates
export function useUserStatusListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = socketService.on('user.status', (data: { userId: string; status: string; onlineStatus?: string }) => {
      console.log('👤 User status update received:', data);

      // Use onlineStatus if provided, otherwise fallback to status
      const newStatus = data.onlineStatus || data.status;

      // Update contacts cache with new status
      queryClient.setQueryData(['contacts', 'accepted'], (old: any) => {
        if (!old) return old;

        const updated = old.map((contact: any) => {
          if (contact.user?.id === data.userId) {
            console.log(`  📝 Updating contact ${contact.user.username} status: ${contact.user.onlineStatus} -> ${newStatus}`);
            return {
              ...contact,
              user: {
                ...contact.user,
                onlineStatus: newStatus,
              },
            };
          }
          return contact;
        });

        console.log('  ✅ Contacts cache updated');
        return updated;
      });

      // Update conversations cache with new status
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old) return old;

        const updated = old.map((conversation: any) => {
          if (conversation.type === 'direct' && conversation.user?.id === data.userId) {
            console.log(`  📝 Updating conversation with ${conversation.user?.username || 'unknown'} status: ${conversation.user?.onlineStatus} -> ${newStatus}`);
            return {
              ...conversation,
              user: {
                ...conversation.user,
                onlineStatus: newStatus,
              },
            };
          }
          return conversation;
        });

        console.log('  ✅ Conversations cache updated');
        return updated;
      });

      // Force invalidate to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    });

    return unsubscribe;
  }, [queryClient]);
}

// Hook for group events (deletion, updates, member changes)
export function useGroupListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for group deletion
    const unsubscribeDeleted = socketService.on('group_deleted', (data: { groupId: string }) => {
      console.log('🗑️ Group deleted event received:', data);

      // Remove from conversations cache
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old) return old;
        return old.filter((conv: any) =>
          conv.type !== 'group' || conv.group?.id !== data.groupId
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    });

    // Listen for group updates
    const unsubscribeUpdated = socketService.on('group_updated', (data: { group: any }) => {
      console.log('✏️ Group updated event received:', data);

      // Update conversations cache with new group data
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old) return old;

        const updated = old.map((conv: any) => {
          if (conv.type === 'group' && conv.group?.id === data.group.id) {
            return {
              ...conv,
              group: {
                ...conv.group,
                name: data.group.name,
                description: data.group.description,
                avatar: data.group.avatar,
              },
            };
          }
          return conv;
        });

        console.log('📝 Updated conversations cache with new group data');
        return updated;
      });

      // Force refetch to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups', data.group.id] });
    });

    // Listen for member left
    const unsubscribeMemberLeft = socketService.on('group_member_left', (data: { groupId: string; userId: string }) => {
      console.log('👋 Group member left event received:', data);

      // Invalidate conversations to refetch
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups', data.groupId] });
    });

    return () => {
      unsubscribeDeleted();
      unsubscribeUpdated();
      unsubscribeMemberLeft();
    };
  }, [queryClient]);
}
