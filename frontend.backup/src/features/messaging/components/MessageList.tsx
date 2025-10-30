import React, { useEffect, useRef, useState, useMemo } from 'react'
import { MessageCircle, ArrowDown, Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { Message } from '@/shared/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [date: string]: Message[] } = {}

    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }, [messages])

  // Auto-scroll to bottom when new messages arrive (unless user is scrolling)
  useEffect(() => {
    if (messages.length > 0 && !isUserScrolling) {
      scrollToBottom()
    }
  }, [messages.length, isUserScrolling])

  // Check if user is scrolling up
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

      setIsUserScrolling(!isNearBottom)
      setShowScrollToBottom(!isNearBottom && messages.length > 0)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const renderDateSeparator = (date: string, index: number) => (
    <div key={`date-${date}-${index}`} className="flex items-center justify-center my-4">
      <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
        {formatDate(date)}
      </div>
    </div>
  )

  const renderMessageGroup = (date: string, dateMessages: Message[], groupIndex: number) => (
    <div key={`group-${date}-${groupIndex}`} className="space-y-1">
      {renderDateSeparator(date, groupIndex)}

      {dateMessages.map((message, messageIndex) => {
        const prevMessage = messageIndex > 0 ? dateMessages[messageIndex - 1] : null
        const nextMessage = messageIndex < dateMessages.length - 1 ? dateMessages[messageIndex + 1] : null

        // Check if messages are from the same sender and close in time (5 minutes)
        const isGroupedWithPrev =
          prevMessage &&
          prevMessage.senderId === message.senderId &&
          (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 5 * 60 * 1000

        const isGroupedWithNext =
          nextMessage &&
          nextMessage.senderId === message.senderId &&
          (new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5 * 60 * 1000

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
            showAvatar={!isGroupedWithPrev}
            showTimestamp={!isGroupedWithNext}
          />
        )
      })}
    </div>
  )

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center bg-background',
        className
      )}>
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
          <p className="text-muted-foreground">Start the conversation by sending the first message!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex-1 overflow-hidden relative', className)}>
      <div
        ref={messagesContainerRef}
        className="h-full overflow-y-auto p-4 space-y-4"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Messages'
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        {Object.entries(groupedMessages).map(([date, dateMessages], index) =>
          renderMessageGroup(date, dateMessages, index)
        )}

        {/* Loading indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={() => scrollToBottom()}
            size="sm"
            className="rounded-full h-10 w-10 p-0 shadow-lg"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
}