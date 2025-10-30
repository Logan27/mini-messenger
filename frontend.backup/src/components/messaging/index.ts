// Messaging components with full Telegram design system compliance
export { ChatListItem } from './ChatListItem';
export { MessageBubble } from './MessageBubble';
export { TypingIndicator, InlineTypingIndicator } from './TypingIndicator';
export { MessageInput } from './MessageInput';

// Types for messaging components
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isTyping: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: MessageStatus;
  isEdited: boolean;
  senderAvatar?: string;
  senderName?: string;
}