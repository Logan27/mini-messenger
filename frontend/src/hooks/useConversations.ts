import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface Conversation {
  type: 'direct' | 'group';
  user?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    onlineStatus: string;
  };
  group?: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    isOwn: boolean;
    isEncrypted?: boolean;
    encryptedContent?: string;
    encryptionMetadata?: {
      nonce: string;
      keys?: Record<string, string>;
    };
    metadata?: {
      encryptedContentOwner?: string;
      nonceOwner?: string;
      [key: string]: unknown;
    };
  };
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
  isMuted?: boolean;
}

export function useConversations(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: async () => {
      const response = await apiClient.get('/messages/conversations', { params });
      return response.data.data as Conversation[];
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch when invalidated (for real-time unread counts)
    placeholderData: (previousData) => previousData,
  });
}
