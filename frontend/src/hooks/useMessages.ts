import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { messageService, Message as BackendMessage } from '@/services/message.service';
import { socketService } from '@/services/socket.service';
import { useAuth } from '@/contexts/AuthContext';
import { Message as FrontendMessage } from '@/types/chat';

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
    const unsubscribe = socketService.on('message.new', (newMessage: BackendMessage & {
      content?: string;
      reactions?: Record<string, string[]>;
      replyTo?: { id: string; content?: string; sender?: { username: string } };
      // Encryption fields - may come as camelCase or snake_case
      isEncrypted?: boolean;
      is_encrypted?: boolean;
      encryptedContent?: string;
      encrypted_content?: string;
      encryptionMetadata?: Record<string, unknown>;
      encryption_metadata?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      // File fields from backend
      fileId?: string;
      fileUrl?: string;
    }) => {
      // Only update if the message is for the current chat
      const isForCurrentChat =
        (recipientId && (newMessage.senderId === recipientId || newMessage.recipientId === recipientId)) ||
        (groupId && newMessage.groupId === groupId);

      if (isForCurrentChat) {

        // Transform backend message format to frontend format
        const transformedMessage: FrontendMessage = {
          id: newMessage.id,
          senderId: newMessage.senderId,
          text: newMessage.content,
          timestamp: new Date(newMessage.createdAt),
          isOwn: newMessage.senderId === user?.id,
          status: newMessage.status || 'sent',
          messageType: newMessage.messageType as FrontendMessage['messageType'],
          imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
          reactions: newMessage.reactions || {},
          // File attachment fields
          fileId: newMessage.fileId || (newMessage.metadata?.fileId as string),
          fileName: newMessage.fileName || (newMessage.metadata?.fileName as string),
          fileUrl: newMessage.fileUrl || (newMessage.metadata?.fileUrl as string),
          fileSize: newMessage.fileSize || (newMessage.metadata?.fileSize as number),
          mimeType: newMessage.mimeType || (newMessage.metadata?.mimeType as string),
          // Call message fields
          callId: newMessage.metadata?.callId as string,
          callType: newMessage.metadata?.callType as 'voice' | 'video',
          callStatus: newMessage.metadata?.callStatus as FrontendMessage['callStatus'],
          callDuration: newMessage.metadata?.callDuration as number,
          // Reply fields
          replyTo: newMessage.replyTo ? {
            id: newMessage.replyTo.id,
            text: newMessage.replyTo.content || '',
            senderName: newMessage.replyTo.sender?.username || 'Unknown',
          } : undefined,
          // Encryption
          isEncrypted: !!newMessage.isEncrypted || !!newMessage.is_encrypted || !!newMessage.encryptedContent || !!newMessage.encrypted_content,
          encryptedContent: newMessage.encryptedContent || newMessage.encrypted_content,
          encryptionMetadata: (newMessage.encryptionMetadata || newMessage.encryption_metadata) as FrontendMessage['encryptionMetadata'],
          // Include metadata for dual encryption (contains encryptedContentOwner and nonceOwner)
          metadata: newMessage.metadata,
        };


        const queryKey = ['messages', recipientId, groupId];
        queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
          if (!old) {
            return { pages: [[transformedMessage]], pageParams: [undefined] };
          }

          const newPages = [...old.pages];
          const firstPage = [...newPages[0]];

          // Check if message already exists (replace temp or duplicate)
          const existingIndex = firstPage.findIndex((msg) =>
            msg.id === transformedMessage.id ||
            (msg.id.startsWith('temp-') && msg.text === newMessage.content)
          );

          if (existingIndex !== -1) {
            firstPage[existingIndex] = transformedMessage;
          } else {
            firstPage.unshift(transformedMessage);
          }

          newPages[0] = firstPage;
          return { ...old, pages: newPages };
        });

        // Invalidate conversations to update last message and counters (throttled)
        // We use a property on the queryClient or a global throttle map to prevent excessive invalidations
        // For now, let's just let React Query dedupe, but we could add manual throttling if needed.
        // Actually, let's trust React Query's deduplication for now as manual throttling inside useEffect is tricky without ref.
        queryClient.invalidateQueries({ queryKey: ['conversations'] });

        // Send delivery confirmation to backend
        if (newMessage.id && !newMessage.id.startsWith('temp-')) {
          socketService.markAsDelivered(newMessage.id, newMessage.senderId);
        }
      }
    });

    // Listen for message delivered receipts (backend sends message_delivered with underscore)
    const unsubscribeDelivered = socketService.on('message_delivered', (data: { messageId: string }) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];



      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page) =>
          page.map((msg) =>
            msg.id === messageId
              ? { ...msg, status: 'delivered' as const }
              : msg
          )
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for message read receipts (backend sends message_read with underscore)
    const unsubscribeRead = socketService.on('message_read', (data: { messageId: string }) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page) =>
          page.map((msg) =>
            msg.id === messageId ? { ...msg, status: 'read' as const } : msg
          )
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for message deletions (soft delete - only for sender)
    const unsubscribeSoftDeleted = socketService.on('message_soft_deleted', (data: { messageId: string }) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page) =>
          page.filter((msg) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for hard deletions (deleted for everyone)
    const unsubscribeHardDeleted = socketService.on('message_hard_deleted', (data: { messageId: string }) => {
      const { messageId } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page) =>
          page.filter((msg) => msg.id !== messageId)
        );

        return { ...old, pages: newPages };
      });
    });

    // Listen for reaction updates
    const unsubscribeReaction = socketService.on('message.reaction', (data: { messageId: string; reactions: Record<string, string[]> }) => {
      const { messageId, reactions } = data;
      const queryKey = ['messages', recipientId, groupId];

      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return old;

        const newPages = old.pages.map((page) =>
          page.map((msg) => {
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

  // Check for saved scroll position to optimize initial load
  // This allows us to start loading from the saved position instead of newest
  const conversationId = recipientId || groupId;
  const savedScrollMessageId = conversationId
    ? localStorage.getItem(`chat_scroll_${conversationId}`)
    : null;

  return useInfiniteQuery<BackendMessage[], Error, InfiniteData<FrontendMessage[]>>({
    queryKey: ['messages', recipientId, groupId],
    queryFn: ({ pageParam }) => {
      // For initial load (pageParam undefined), use saved position if available
      const isInitialLoad = pageParam === undefined;

      return messageService.getMessages({
        recipientId,
        groupId,
        limit,
        // If initial load with saved position, use `after` to load from saved position forward
        // Otherwise use `before` for paginating backwards (loading older messages)
        ...(isInitialLoad && savedScrollMessageId
          ? { after: savedScrollMessageId }
          : { before: pageParam as string | undefined }
        ),
      });
    },
    getNextPageParam: (lastPage) => {
      // If there are more messages, return the oldest message ID
      if (lastPage && lastPage.length === limit) {
        return lastPage[lastPage.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: undefined,
    enabled: !!(recipientId || groupId),
    // CRITICAL: Prevent unnecessary refetches - WebSocket handles real-time updates
    staleTime: Infinity, // Data never goes stale automatically (WebSocket pushes updates)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnMount: false, // Don't refetch when component remounts (chat switch)
    refetchOnReconnect: false, // Don't refetch on network reconnect (WebSocket handles this)
    select: (data) => {

      return {
        ...data,
        pages: data.pages.map(page => page.map((msg: BackendMessage & {
          text?: string;
          content?: string;
          // Encryption fields - may come as camelCase or snake_case
          isEncrypted?: boolean;
          is_encrypted?: boolean;
          encryptedContent?: string;
          encrypted_content?: string;
          encryptionMetadata?: Record<string, unknown>;
          encryption_metadata?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          // Other fields that may be transformed
          timestamp?: Date;
          isOwn?: boolean;
        }) => {
          // Normalize encryption
          const isEnc = !!msg.isEncrypted || !!msg.is_encrypted || !!msg.encryptedContent || !!msg.encrypted_content;

          return {
            ...msg,
            text: msg.text || msg.content,
            timestamp: msg.timestamp || new Date(msg.createdAt),
            isOwn: msg.isOwn !== undefined ? msg.isOwn : msg.senderId === user?.id,
            isEncrypted: isEnc,
            encryptedContent: msg.encryptedContent || msg.encrypted_content,
            encryptionMetadata: (msg.encryptionMetadata || msg.encryption_metadata) as FrontendMessage['encryptionMetadata'],
            // Preserve metadata for dual encryption (contains encryptedContentOwner, nonceOwner)
            metadata: msg.metadata,
            messageType: msg.messageType as FrontendMessage['messageType'],
          } as FrontendMessage;
        }))
      };
    },
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
      const previousMessages = queryClient.getQueryData<InfiniteData<FrontendMessage[]>>(queryKey);

      // Optimistically add message with 'sending' status
      console.log('[useSendMessage] onMutate variables:', {
        hasMetadata: !!variables.metadata,
        metadata: variables.metadata,
        hasEncryptedContentOwner: !!(variables.metadata as Record<string, unknown>)?.encryptedContentOwner,
      });
      const tempMessage: FrontendMessage = {
        id: `temp-${Date.now()}`,
        senderId: user?.id || '',
        text: variables.content,
        timestamp: new Date(),
        isOwn: true,
        status: 'sending' as const,
        messageType: (variables.messageType as FrontendMessage['messageType']) || 'text',
        // Pass through encryption fields for optimistic update
        isEncrypted: variables.isEncrypted,
        encryptedContent: variables.encryptedContent,
        encryptionMetadata: variables.encryptionMetadata as FrontendMessage['encryptionMetadata'],
        metadata: variables.metadata as Record<string, unknown>, // Contains encryptedContentOwner
      };
      console.log('[useSendMessage] tempMessage created:', {
        hasMetadata: !!tempMessage.metadata,
        metadata: tempMessage.metadata,
      });

      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
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
      const transformedMessage: FrontendMessage = {
        id: newMessage.id,
        senderId: newMessage.senderId,
        text: newMessage.content,
        timestamp: new Date(newMessage.createdAt),
        isOwn: true,
        status: newMessage.status || 'sent',
        messageType: newMessage.messageType as FrontendMessage['messageType'],
        imageUrl: newMessage.messageType === 'image' ? newMessage.fileName : undefined,
        fileId: newMessage.fileId || (newMessage.metadata?.fileId as string),
        fileName: newMessage.fileName || (newMessage.metadata?.fileName as string),
        fileUrl: newMessage.fileUrl || (newMessage.metadata?.fileUrl as string),
        fileSize: newMessage.fileSize || (newMessage.metadata?.fileSize as number),
        mimeType: newMessage.mimeType || (newMessage.metadata?.mimeType as string),
        replyTo: newMessage.replyTo ? {
          id: newMessage.replyTo.id,
          text: newMessage.replyTo.content || '',
          senderName: newMessage.replyTo.sender?.username || 'Unknown',
        } : undefined,
        // Encryption
        isEncrypted: !!newMessage.isEncrypted || !!newMessage.is_encrypted || !!newMessage.encryptedContent || !!newMessage.encrypted_content,
        encryptedContent: newMessage.encryptedContent || newMessage.encrypted_content,
        encryptionMetadata: (newMessage.encryptionMetadata || newMessage.encryption_metadata) as FrontendMessage['encryptionMetadata'],
        // Preserve metadata for dual encryption (contains encryptedContentOwner, nonceOwner)
        metadata: newMessage.metadata || variables.metadata,
      };



      queryClient.setQueryData<InfiniteData<FrontendMessage[]>>(queryKey, (old) => {
        if (!old) return { pages: [[transformedMessage]], pageParams: [undefined] };

        const newPages = old.pages.map((page) =>
          page.map((msg) =>
            msg.id === context?.tempMessage.id ? transformedMessage : msg
          )
        );

        return { ...old, pages: newPages };
      });
    },
    onError: (_error, variables, context) => {
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
    onSuccess: (updatedMessage) => {
      // Optimistically update the message in all cached conversations
      queryClient.setQueriesData<InfiniteData<FrontendMessage[]>>({ queryKey: ['messages'] }, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) =>
              msg.id === updatedMessage.id ? { ...msg, text: updatedMessage.content, isEdited: true } : msg
            )
          ),
        };
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, deleteType }: { messageId: string; deleteType?: 'soft' | 'hard' }) =>
      messageService.deleteMessage(messageId, deleteType),
    onSuccess: (data, variables) => {
      // Remove the message from cache
      queryClient.setQueriesData<InfiniteData<FrontendMessage[]>>({ queryKey: ['messages'] }, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) =>
            page.filter((msg) => msg.id !== variables.messageId)
          ),
        };
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageIds: string[]) => messageService.markAsRead(messageIds),
    onSuccess: (_, messageIds) => {
      // Update status to 'read' in cache
      queryClient.setQueriesData<InfiniteData<FrontendMessage[]>>({ queryKey: ['messages'] }, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) =>
              messageIds.includes(msg.id) ? { ...msg, status: 'read' as const } : msg
            )
          ),
        };
      });

      // We still need to invalidate conversations to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
