import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { messageService } from '@/services/message.service';
import { socketService } from '@/services/socket.service';
import { useAuth } from '@/contexts/AuthContext';

interface UseMessagesParams {
  recipientId?: string;
  groupId?: string;
  limit?: number;
}

export function useMessages({ recipientId, groupId, limit = 20 }: UseMessagesParams) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Listen for new messages via WebSocket
  useEffect(() => {
    const unsubscribe = socketService.on('message.new', (newMessage: unknown) => {
      // Only update if the message is for the current chat
      const isForCurrentChat =
        (recipientId && (newMessage.senderId === recipientId || newMessage.recipientId === recipientId)) ||
        (groupId && newMessage.groupId === groupId);

      if (isForCurrentChat) {
        // Transform backend message format to frontend format
        const transformedMessage = {
          id: newMessage.id,
          senderId: newMessage.senderId,
          text: newMessage.content,
          timestamp: new Date(newMessage.createdAt),
          isOwn: newMessage.senderId === user?.id,
          status: newMessage.status || 'sent',
          messageType: newMessage.messageType,
          imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
          reactions: newMessage.reactions || {},
          // File attachment fields
          fileId: newMessage.fileId || newMessage.metadata?.fileId,
          fileName: newMessage.fileName || newMessage.metadata?.fileName,
          fileUrl: newMessage.fileUrl || newMessage.metadata?.fileUrl,
          fileSize: newMessage.fileSize || newMessage.metadata?.fileSize,
          mimeType: newMessage.mimeType || newMessage.metadata?.mimeType,
          // Call message fields
          callId: newMessage.metadata?.callId,
          callType: newMessage.metadata?.callType,
          callStatus: newMessage.metadata?.callStatus,
          callDuration: newMessage.metadata?.callDuration,
          // Reply fields
          replyTo: newMessage.replyTo ? {
            id: newMessage.replyTo.id,
            text: newMessage.replyTo.content || '',
            senderName: newMessage.replyTo.sender?.username || 'Unknown',
          } : undefined,
        };

        const queryKey = ['messages', recipientId, groupId];
        queryClient.setQueryData(queryKey, (old) => {
          if (!old) {
            return { pages: [[transformedMessage]], pageParams: [undefined] };
          }

          const newPages = [...old.pages];
          const firstPage = [...newPages[0]];

          // Check if message already exists (replace temp or duplicate)
          const existingIndex = firstPage.findIndex((msg: unknown) =>
            msg.id === transformedMessage.id ||
            (msg.id.startsWith('temp-') && msg.content === newMessage.content)
          );

          if (existingIndex !== -1) {
            firstPage[existingIndex] = transformedMessage;
          } else {
            firstPage.unshift(transformedMessage);
          }

          newPages[0] = firstPage;
          return { ...old, pages: newPages };
        });

        // Invalidate conversations to update last message and counters
        queryClient.invalidateQueries({ queryKey: ['conversations'] });

        // Send delivery confirmation to backend
        if (newMessage.id && !newMessage.id.startsWith('temp-')) {
          socketService.markAsDelivered(newMessage.id, newMessage.senderId);
        }
      }
    });

    // Listen for message delivered receipts (backend sends message_delivered with underscore)
    const unsubscribeDelivered = socketService.on('message_delivered', (data: unknown) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page: unknown[]) =>
          page.map((msg: unknown) =>
            msg.id === messageId
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for message read receipts (backend sends message_read with underscore)
    const unsubscribeRead = socketService.on('message_read', (data: unknown) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page: unknown[]) =>
          page.map((msg: unknown) =>
            msg.id === messageId ? { ...msg, status: 'read' } : msg
          )
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for message deletions (soft delete - only for sender)
    const unsubscribeSoftDeleted = socketService.on('message_soft_deleted', (data: unknown) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page: unknown[]) =>
          page.filter((msg: unknown) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for hard deletions (deleted for everyone)
    const unsubscribeHardDeleted = socketService.on('message_hard_deleted', (data: unknown) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page: unknown[]) =>
          page.filter((msg: unknown) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for reaction updates
    const unsubscribeReaction = socketService.on('message.reaction', (data: unknown) => {
      const { messageId, reactions } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page: unknown[]) =>
          page.map((msg: unknown) => {
            if (msg.id === messageId) {
              return { ...msg, reactions: reactions || {} };
            }
            return msg;
          })
        );

        return { ...old, pages: newPages };
      });
    });

    return () => {
      unsubscribe();
      unsubscribeDelivered();
      unsubscribeRead();
      unsubscribeSoftDeleted();
      unsubscribeHardDeleted();
      unsubscribeReaction();
    };
  }, [recipientId, groupId, queryClient, user]);

  return useInfiniteQuery({
    queryKey: ['messages', recipientId, groupId],
    queryFn: ({ pageParam }) =>
      messageService.getMessages({
        recipientId,
        groupId,
        limit,
        before: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      // If there are more messages, return the oldest message ID
      if (lastPage && lastPage.length === limit) {
        return lastPage[lastPage.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: undefined,
    enabled: !!(recipientId || groupId),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: messageService.sendMessage,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      const queryKey = ['messages', variables.recipientId, variables.groupId];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(queryKey);

      // Optimistically add message with 'sending' status
      const tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: user?.id,
        content: variables.content,
        createdAt: new Date().toISOString(),
        status: 'sending' as const,
        messageType: 'text',
      };

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return { pages: [[tempMessage]], pageParams: [undefined] };

        const newPages = old.pages.map((page, index) => {
          if (index === 0) {
            return [tempMessage, ...page];
          }
          return page;
        });
        return { ...old, pages: newPages };
      });

      return { previousMessages, tempMessage };
    },
    onSuccess: (newMessage, variables, context) => {
      const queryKey = ['messages', variables.recipientId, variables.groupId];

      // Transform backend message to frontend format
      const transformedMessage = {
        id: newMessage.id,
        senderId: newMessage.senderId,
        text: newMessage.content,
        timestamp: new Date(newMessage.createdAt),
        isOwn: true,
        status: newMessage.status || 'sent',
        messageType: newMessage.messageType,
        imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
        fileId: newMessage.fileId || newMessage.metadata?.fileId,
        fileName: newMessage.fileName || newMessage.metadata?.fileName,
        fileUrl: newMessage.fileUrl || newMessage.metadata?.fileUrl,
        fileSize: newMessage.fileSize || newMessage.metadata?.fileSize,
        mimeType: newMessage.mimeType || newMessage.metadata?.mimeType,
        replyTo: newMessage.replyTo ? {
          id: newMessage.replyTo.id,
          text: newMessage.replyTo.content || '',
          senderName: newMessage.replyTo.sender?.username || 'Unknown',
        } : undefined,
      };

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return { pages: [[transformedMessage]], pageParams: [undefined] };

        const newPages = old.pages.map((page: unknown[]) =>
          page.map((msg: unknown) =>
            msg.id === context?.tempMessage.id ? transformedMessage : msg
          )
        );

        return { ...old, pages: newPages };
      });
    },
    onError: (error, variables, context) => {
      // Revert to previous state on error
      if (context?.previousMessages) {
        const queryKey = ['messages', variables.recipientId, variables.groupId];
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      messageService.editMessage(messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, deleteType }: { messageId: string; deleteType?: 'soft' | 'hard' }) =>
      messageService.deleteMessage(messageId, deleteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageIds: string[]) => messageService.markAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
