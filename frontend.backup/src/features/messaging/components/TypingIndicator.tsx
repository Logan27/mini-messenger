import React, { useEffect, useRef } from 'react'
import { useMessageStore } from '@/app/stores/messageStore'
import { useAuthStore } from '@/app/stores/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  conversationId: string
  className?: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  conversationId,
  className
}) => {
  const { typingUsers, clearTypingUser } = useMessageStore()
  const { user } = useAuthStore()
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const typingUsersInConversation = typingUsers[conversationId] || []

  // Filter out current user from typing indicators
  const otherTypingUsers = typingUsersInConversation.filter(
    typingUser => typingUser.id !== user?.id
  )

  // Set up timeout cleanup for typing users
  useEffect(() => {
    otherTypingUsers.forEach(typingUser => {
      const key = `${conversationId}-${typingUser.id}`

      // Clear existing timeout
      if (timeoutRefs.current.has(key)) {
        clearTimeout(timeoutRefs.current.get(key))
      }

      // Set new timeout to clear typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        clearTypingUser(conversationId, typingUser.id)
        timeoutRefs.current.delete(key)
      }, 3000)

      timeoutRefs.current.set(key, timeout)
    })

    // Cleanup timeouts on unmount
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
    }
  }, [conversationId, otherTypingUsers, clearTypingUser])

  if (otherTypingUsers.length === 0) {
    return null
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].name} is typing...`
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].name} and ${otherTypingUsers[1].name} are typing...`
    } else {
      return `${otherTypingUsers[0].name} and ${otherTypingUsers.length - 1} others are typing...`
    }
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground',
      className
    )}>
      {/* Typing animation dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>

      {/* Typing text */}
      <span className="text-xs">{getTypingText()}</span>

      {/* User avatars */}
      <div className="flex -space-x-2">
        {otherTypingUsers.slice(0, 3).map((typingUser) => (
          <Avatar key={typingUser.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={typingUser.avatar} alt={typingUser.name} />
            <AvatarFallback className="text-xs">
              {typingUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  )
}