import React, { useState, useEffect, useMemo } from 'react'
import { Search, MessageCircle, Users, Phone, Video, MoreVertical, Wifi, WifiOff } from 'lucide-react'
import { useMessageStore } from '@/app/stores/messageStore'
import { useAuthStore } from '@/app/stores/authStore'
import { useWebSocketIntegration } from '../lib/websocketIntegration'
import type { Conversation } from '../../../shared/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => void
  selectedConversationId?: string | null
  className?: string
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  onConversationSelect,
  selectedConversationId,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    conversations,
    isLoading,
    error,
    loadConversations,
    currentConversationId,
    typingUsers
  } = useMessageStore()

  const { user } = useAuthStore()

  // WebSocket integration
  const { isConnected } = useWebSocketIntegration()

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    return conversations.filter(conversation => {
      const searchLower = searchQuery.toLowerCase()

      // Search in conversation name for groups
      if (conversation.name?.toLowerCase().includes(searchLower)) {
        return true
      }

      // Search in participant names for direct messages
      return conversation.participants.some(participant =>
        participant.name.toLowerCase().includes(searchLower) ||
        participant.username.toLowerCase().includes(searchLower)
      )
    })
  }, [conversations, searchQuery])

  const formatTime = (dateString: string) => {
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
  }

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.name) return conversation.name

    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.name || otherParticipant?.username || 'Unknown User'
  }

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.avatar) return conversation.avatar

    // For direct messages, use the other participant's avatar
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.avatar
  }

  const getTypingUsers = (conversationId: string) => {
    return typingUsers[conversationId] || []
  }

  const renderConversationItem = (conversation: Conversation) => {
    const displayName = getConversationDisplayName(conversation)
    const avatar = getConversationAvatar(conversation)
    const typingUsersList = getTypingUsers(conversation.id)
    const isSelected = selectedConversationId === conversation.id
    const isTyping = typingUsersList.length > 0

    return (
      <div
        key={conversation.id}
        onClick={() => onConversationSelect(conversation.id)}
        className={cn(
          'flex items-center p-4 hover:bg-accent cursor-pointer transition-colors duration-fast',
          'border-b border',
          isSelected && 'bg-accent'
        )}
      >
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback>
              {conversation.type === 'group' ? (
                <Users className="h-6 w-6" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>

          {/* Online status indicator */}
          {conversation.participants.some(p => p.id !== user?.id && p.isOnline) && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full"></div>
          )}
        </div>

        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn(
              'text-base font-medium truncate',
              conversation.unreadCount > 0 && 'font-semibold',
              'text-foreground'
            )}>
              {displayName}
            </p>
            <div className="flex items-center space-x-2">
              {conversation.lastMessage && (
                <span className="text-xs text-muted-foreground">
                  {formatTime(conversation.lastMessage.createdAt)}
                </span>
              )}
              {conversation.unreadCount > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex-1 min-w-0">
              {isTyping ? (
                <p className="text-sm text-primary italic flex items-center gap-1">
                  <span>
                    {typingUsersList.length === 1
                      ? `${typingUsersList[0].name} is typing`
                      : `${typingUsersList.length} people are typing`
                    }
                  </span>
                  <span className="flex gap-0.5">
                    <span className="typing-dot inline-block w-1 h-1 rounded-full bg-primary"></span>
                    <span className="typing-dot inline-block w-1 h-1 rounded-full bg-primary"></span>
                    <span className="typing-dot inline-block w-1 h-1 rounded-full bg-primary"></span>
                  </span>
                </p>
              ) : conversation.lastMessage ? (
                <p className={cn(
                  'text-sm truncate',
                  conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                  {conversation.lastMessage.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No messages yet
                </p>
              )}
            </div>

            <div className="flex items-center space-x-1 ml-2">
              {conversation.type === 'group' && (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className={cn('bg-card border-r border', className)}>
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="w-full justify-center"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-card border-r border flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            {/* Connection status */}
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="md:hidden"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            Error loading conversations: {error}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map(renderConversationItem)
        )}
      </div>
    </div>
  )
}