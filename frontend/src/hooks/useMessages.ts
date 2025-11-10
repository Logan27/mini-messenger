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

export function useMessages({ recipientId, groupId, limit = 50 }: UseMessagesParams) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Listen for new messages via WebSocket
  useEffect(() => {
    const unsubscribe = socketService.on('message.new', (newMessage: any) => {
      console.log('📨 New message received via WebSocket:', {
        messageId: newMessage.id,
        senderId: newMessage.senderId,
        recipientId: newMessage.recipientId,
        currentRecipientId: recipientId,
        currentGroupId: groupId,
        content: newMessage.content?.substring(0, 50),
      });
      
      // Only update if the message is for the current chat
      const isForCurrentChat =
        (recipientId && (newMessage.senderId === recipientId || newMessage.recipientId === recipientId)) ||
        (groupId && newMessage.groupId === groupId);

      console.log('📨 Message is for current chat:', isForCurrentChat);

      if (isForCurrentChat) {
        // Transform backend message format to frontend format
        const transformedMessage = {
          id: newMessage.id,
          text: newMessage.content,
          timestamp: new Date(newMessage.createdAt),
          isOwn: newMessage.senderId === user?.id,
          status: newMessage.status || 'sent',
          messageType: newMessage.messageType,
          imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
          reactions: newMessage.reactions || {},
          // File attachment fields
          fileId: newMessage.metadata?.fileId || newMessage.fileId,
          fileName: newMessage.metadata?.fileName || newMessage.fileName,
          fileUrl: newMessage.metadata?.fileId || newMessage.fileId
            ? `/api/files/${newMessage.metadata?.fileId || newMessage.fileId}`
            : undefined,
          fileSize: newMessage.metadata?.fileSize || newMessage.fileSize,
          mimeType: newMessage.metadata?.mimeType || newMessage.mimeType,
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

        console.log('📨 Adding/updating message in cache:', transformedMessage.id);
        
        const queryKey = ['messages', recipientId, groupId];
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) {
            console.log('📨 No existing cache, creating new');
            return { pages: [[transformedMessage]], pageParams: [undefined] };
          }

          const newPages = [...old.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];
          
          // Check if message already exists (replace temp or duplicate)
          const existingIndex = lastPage.findIndex((msg: any) => 
            msg.id === transformedMessage.id || 
            (msg.id.startsWith('temp-') && msg.text === transformedMessage.text)
          );
          
          if (existingIndex !== -1) {
            console.log('📨 Replacing existing message at index:', existingIndex);
            lastPage[existingIndex] = transformedMessage;
          } else {
            console.log('📨 Adding new message to cache');
            lastPage.push(transformedMessage);
          }
          
          newPages[lastPageIndex] = lastPage;
          console.log('📨 Cache updated, last page length:', newPages[lastPageIndex].length);
          return { ...old, pages: newPages };
        });

        // Send delivery confirmation to backend
        // This happens immediately when message is received, regardless of which chat is open
        // Skip temporary messages (IDs starting with "temp-")
        if (newMessage.id && !newMessage.id.startsWith('temp-')) {
          console.log('📨 Sending delivery confirmation for:', newMessage.id);
          socketService.markAsDelivered(newMessage.id, newMessage.senderId);
        }

        // Note: Notifications are handled globally by NotificationManager
        // No need to show notifications here to avoid duplicates
      }
    });

    // Listen for message delivered receipts (backend sends message_delivered with underscore)
    const unsubscribeDelivered = socketService.on('message_delivered', (data: any) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any[]) =>
          page.map((msg: any) =>
            msg.id === messageId
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for message read receipts (backend sends message_read with underscore)
    const unsubscribeRead = socketService.on('message_read', (data: any) => {
      console.log('📖 Read receipt received:', data);
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      console.log('📖 Updating query cache for key:', queryKey, 'messageId:', messageId);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) {
          console.log('⚠️ No existing messages data in cache');
          return old;
        }

        console.log('📖 Current cache pages:', old.pages.length);

        const newPages = old.pages.map((page: any[], pageIndex: number) => {
          console.log(`📖 Processing page ${pageIndex} with ${page.length} messages`);
          return page.map((msg: any) => {
            if (msg.id === messageId) {
              console.log('✅ Found message to mark as read:', msg.id);
              return { ...msg, status: 'read' };
            }
            return msg;
          });
        });

        console.log('📖 Cache updated, triggering re-render');
        return { ...old, pages: newPages };
      });
    });

    // Listen for message deletions (soft delete - only for sender)
    const unsubscribeSoftDeleted = socketService.on('message_soft_deleted', (data: any) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any[]) =>
          page.filter((msg: any) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for hard deletions (deleted for everyone)
    const unsubscribeHardDeleted = socketService.on('message_hard_deleted', (data: any) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any[]) =>
          page.filter((msg: any) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for reaction updates
    const unsubscribeReaction = socketService.on('message.reaction', (data: any) => {
      const { messageId, reactions } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const newPages = old.pages.map((page: any[]) =>
          page.map((msg: any) => {
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
        text: variables.content,
        timestamp: new Date(),
        isOwn: true,
        status: 'sending' as const,
      };

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return { pages: [[tempMessage]], pageParams: [undefined] };

        const newPages = [...old.pages];
        // Add to last page (newest messages, since we reversed DESC to ASC)
        const lastPageIndex = newPages.length - 1;
        newPages[lastPageIndex] = [...newPages[lastPageIndex], tempMessage];
        return { ...old, pages: newPages };
      });

      return { previousMessages, tempMessage };
    },
    onSuccess: (newMessage, variables, context) => {
      console.log('✅ Message sent successfully, server returned:', newMessage.id);
      
      // Replace temp message with real one from server
      const queryKey = ['messages', variables.recipientId, variables.groupId];
      
      // Transform backend message format to frontend format
      const transformedMessage = {
        id: newMessage.id,
        text: newMessage.content,
        timestamp: new Date(newMessage.createdAt),
        isOwn: true, // Message sent by current user
        status: newMessage.status || 'sent',
        messageType: newMessage.messageType,
        imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
        // File attachment fields
        fileId: newMessage.metadata?.fileId || newMessage.fileId,
        fileName: newMessage.metadata?.fileName || newMessage.fileName,
        fileUrl: newMessage.metadata?.fileId || newMessage.fileId
          ? `/api/files/${newMessage.metadata?.fileId || newMessage.fileId}`
          : undefined,
        fileSize: newMessage.metadata?.fileSize || newMessage.fileSize,
        mimeType: newMessage.metadata?.mimeType || newMessage.mimeType,
        replyTo: newMessage.replyTo ? {
          id: newMessage.replyTo.id,
          text: newMessage.replyTo.content || '',
          senderName: newMessage.replyTo.sender?.username || 'Unknown',
        } : undefined,
      };
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return { pages: [[transformedMessage]], pageParams: [undefined] };

        // Replace the temp message with the real one
        const newPages = old.pages.map((page: any[]) =>
          page.map((msg: any) =>
            msg.id === context?.tempMessage.id
              ? transformedMessage
              : msg
          )
        );

        return { ...old, pages: newPages };
      });

      console.log('✅ Optimistic message replaced with server message');
      console.log('🔄 Invalidating conversations to update counters and last message');
      
      // Invalidate conversations to update last message and counters
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
