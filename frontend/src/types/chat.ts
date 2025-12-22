export interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: Date;
  isOwn: boolean;
  imageUrl?: string;
  reactions?: Record<string, string[]>; // { "??": ["userId1", "userId2"], "??": ["userId3"] }
  replyTo?: ReplyPreview;
  // Message status: 'sending', 'sent', 'delivered', 'read', 'failed'
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  // File attachment fields
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  messageType?: 'text' | 'image' | 'file' | 'video' | 'audio' | 'call';
  // Call-specific fields
  callId?: string;
  callType?: 'voice' | 'video';
  callStatus?: 'completed' | 'missed' | 'cancelled' | 'rejected' | 'ongoing';
  callDuration?: number; // in seconds, only for completed calls
  // Encryption fields
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
}

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface ReplyPreview {
  id: string;
  text: string;
  senderName: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline?: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
  userRole?: 'admin' | 'member'; // User's role in group chats
  creatorId?: string; // Group creator ID for group chats
  isMuted?: boolean; // Whether notifications are muted for this chat
  // Encryption fields for last message preview
  lastMessageIsEncrypted?: boolean;
  lastMessageEncryptedContent?: string;
  lastMessageEncryptionMetadata?: {
    nonce: string;
    keys?: Record<string, string>;
  };
  lastMessageMetadata?: {
    encryptedContentOwner?: string;
    nonceOwner?: string;
    [key: string]: unknown;
  };
}
