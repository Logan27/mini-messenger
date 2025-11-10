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
      const response = await apiClient.post(`/messages/${messageId}/reactions`, {
        emoji,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Optimistically update the cache with the new reactions from the API response
      if (data?.data?.reactions) {
        const messageId = data.data.messageId;
        const newReactions = data.data.reactions;

        // Update all message queries
        queryClient.setQueriesData({ queryKey: ['messages'] }, (old: unknown) => {
          if (!old) return old;

          const newPages = old.pages.map((page: unknown[]) =>
            page.map((msg: unknown) => {
              if (msg.id === messageId) {
                return { ...msg, reactions: newReactions };
              }
              return msg;
            })
          );

          return { ...old, pages: newPages };
        });
      }

      // Don't invalidate immediately - rely on WebSocket updates for real-time sync
      // Invalidating here causes a race condition where the refetch might get old data
    },
    onError: (error) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to add reaction');
    },
  });
}
