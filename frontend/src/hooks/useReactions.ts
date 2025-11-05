import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AddReactionParams {
  messageId: string;
  emoji: string;
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: AddReactionParams) => {
      console.log('🎯 useAddReaction mutation called:', {
        messageId,
        emoji,
        url: `/messages/${messageId}/reactions`,
        messageIdIsUndefined: messageId === undefined,
        messageIdIsNull: messageId === null,
        messageIdIsEmpty: messageId === '',
      });

      try {
        const response = await apiClient.post(`/messages/${messageId}/reactions`, {
          emoji,
        });
        console.log('✅ Reaction API response:', response.data);
        return response.data;
      } catch (error: any) {
        console.error('❌ Reaction API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Reaction mutation succeeded:', data);

      // Optimistically update the cache with the new reactions from the API response
      if (data?.data?.reactions) {
        const messageId = data.data.messageId;
        const newReactions = data.data.reactions;

        console.log('🔄 Optimistically updating reactions in cache:', {
          messageId,
          newReactions,
        });

        // Update all message queries
        queryClient.setQueriesData({ queryKey: ['messages'] }, (old: any) => {
          if (!old) return old;

          const newPages = old.pages.map((page: any[]) =>
            page.map((msg: any) => {
              if (msg.id === messageId) {
                console.log('✅ Updated message in cache:', {
                  messageId,
                  oldReactions: msg.reactions,
                  newReactions,
                });
                return { ...msg, reactions: newReactions };
              }
              return msg;
            })
          );

          return { ...old, pages: newPages };
        });
      }

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      console.error('❌ Reaction mutation failed:', error);
      toast.error(error.response?.data?.error || 'Failed to add reaction');
    },
  });
}
