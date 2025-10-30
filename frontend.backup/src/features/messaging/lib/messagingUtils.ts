import { Message, Conversation } from '@/shared/lib/types'

export const messagingUtils = {
  /**
   * Format message timestamp for display
   */
  formatMessageTime: (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  },

  /**
   * Format conversation display name
   */
  getConversationDisplayName: (conversation: Conversation, currentUserId?: string): string => {
    if (conversation.name) return conversation.name

    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.name || otherParticipant?.username || 'Unknown User'
  },

  /**
   * Get conversation avatar URL
   */
  getConversationAvatar: (conversation: Conversation, currentUserId?: string): string | null => {
    if (conversation.avatar) return conversation.avatar

    // For direct messages, use the other participant's avatar
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId)
    return otherParticipant?.avatar || null
  },

  /**
   * Group messages by date
   */
  groupMessagesByDate: (messages: Message[]): { [date: string]: Message[] } => {
    const groups: { [date: string]: Message[] } = {}

    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  },

  /**
   * Check if two messages should be grouped together
   */
  shouldGroupMessages: (message1: Message, message2: Message): boolean => {
    return (
      message1.senderId === message2.senderId &&
      (new Date(message1.createdAt).getTime() - new Date(message2.createdAt).getTime()) < 5 * 60 * 1000
    )
  },

  /**
   * Get typing indicator text
   */
  getTypingText: (typingUsers: any[], currentUserId?: string): string => {
    const otherUsers = typingUsers.filter(user => user.id !== currentUserId)

    if (otherUsers.length === 0) return ''
    if (otherUsers.length === 1) return `${otherUsers[0].name} is typing...`
    if (otherUsers.length === 2) return `${otherUsers[0].name} and ${otherUsers[1].name} are typing...`

    return `${otherUsers[0].name} and ${otherUsers.length - 1} others are typing...`
  },

  /**
   * Calculate unread count for conversations
   */
  calculateUnreadCount: (conversations: Conversation[]): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0)
  },

  /**
   * Sort conversations by last activity
   */
  sortConversationsByActivity: (conversations: Conversation[]): Conversation[] => {
    return [...conversations].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt).getTime()
      return bTime - aTime
    })
  },

  /**
   * Check if message is from current user
   */
  isOwnMessage: (message: Message, currentUserId?: string): boolean => {
    return message.senderId === currentUserId
  },

  /**
   * Get message status for display
   */
  getMessageStatusText: (status: Message['status']): string => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'sent':
        return 'Sent'
      case 'delivered':
        return 'Delivered'
      case 'read':
        return 'Read'
      case 'failed':
        return 'Failed to send'
      default:
        return ''
    }
  },

  /**
   * Debounce function for search
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout

    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }
}