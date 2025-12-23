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

  const onNewMessage = useCallback((callback: (message: unknown) => void) => {
    return socketService.on('message.new', callback);
  }, []);

  const onMessageRead = useCallback((callback: (data: unknown) => void) => {
    return socketService.on('message_read', callback);  // Backend sends message_read with underscore
  }, []);

  const onTyping = useCallback((callback: (data: unknown) => void) => {
    return socketService.on('message.typing', (data: unknown) => {
      callback(data);
    });
  }, []);

  const onUserStatus = useCallback((callback: (data: unknown) => void) => {
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
    const unsubscribeNew = socketService.on('message.new', (message: unknown) => {
      // Determine which chat this message belongs to
      // For direct messages: the other user's ID
      // For group messages: the group ID
      const messageChatId = message.groupId || message.senderId || message.recipientId;
      

      // If this message is for the currently active chat, invalidate its messages
      if (activeChat && messageChatId === activeChat) {
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

      // Refetch conversations to update unread counts
      queryClient.refetchQueries({ queryKey: ['conversations'] });
    });

    // Listen for message reactions
    const unsubscribeReaction = socketService.on('message.reaction', (data: { messageId: string; reactions: Record<string, string[]> }) => {

      // Update messages cache
      queryClient.setQueriesData({ queryKey: ['messages'] }, (old: any) => {
        if (!old) return old;
        
        // Handle paginated data structure if necessary
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((msg: any) => 
                msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
              )
            }))
          };
        }

        // Handle flat array structure
        if (Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((msg: any) => 
              msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
            )
          };
        }

        return old;
      });
    });

    return () => {
      unsubscribeNew();
      unsubscribeSoftDeleted();
      unsubscribeHardDeleted();
      unsubscribeReaction();
    };
  }, [activeChat, queryClient]);
}

// Hook for listening to message read receipts
export function useReadReceiptListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Backend sends 'message_read' (underscore), not 'message.read' (dot)
    const unsubscribe = socketService.on('message_read', (data: { messageId: string }) => {
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

      // Use onlineStatus if provided, otherwise fallback to status
      const newStatus = data.onlineStatus || data.status;

      // Update contacts cache with new status
      queryClient.setQueryData(['contacts', 'accepted'], (old: unknown) => {
        if (!old) return old;

        const updated = old.map((contact: unknown) => {
          if (contact.user?.id === data.userId) {
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

        return updated;
      });

      // Update conversations cache with new status
      queryClient.setQueryData(['conversations'], (old: unknown) => {
        if (!old) return old;

        const updated = old.map((conversation: unknown) => {
          if (conversation.type === 'direct' && conversation.user?.id === data.userId) {
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

      // Remove from conversations cache
      queryClient.setQueryData(['conversations'], (old: unknown) => {
        if (!old) return old;
        return old.filter((conv: unknown) =>
          conv.type !== 'group' || conv.group?.id !== data.groupId
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    });

    // Listen for group updates
    const unsubscribeUpdated = socketService.on('group_updated', (data: { group: unknown }) => {

      // Update conversations cache with new group data
      queryClient.setQueryData(['conversations'], (old: unknown) => {
        if (!old) return old;

        const updated = old.map((conv: unknown) => {
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

        return updated;
      });

      // Force refetch to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups', data.group.id] });
    });

    // Listen for member left
    const unsubscribeMemberLeft = socketService.on('group_member_left', (data: { groupId: string; userId: string }) => {

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
