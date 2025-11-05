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

      const response = await apiClient.post(`/messages/${messageId}/reactions`, {
        emoji,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate messages query to refetch with updated reactions
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      console.error('Failed to add reaction:', error);
      toast.error(error.response?.data?.error || 'Failed to add reaction');
    },
  });
}
