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
      console.log('✅ Reaction mutation succeeded, invalidating queries');
      // Invalidate messages query to refetch with updated reactions
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      console.error('❌ Reaction mutation failed:', error);
      toast.error(error.response?.data?.error || 'Failed to add reaction');
    },
  });
}
