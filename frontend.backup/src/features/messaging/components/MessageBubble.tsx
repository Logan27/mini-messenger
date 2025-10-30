import React, { useState } from 'react'
import { Check, CheckCheck, Clock, Edit3 } from 'lucide-react'
import { Message } from '@/shared/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageActions } from './MessageActions'
import { MessageEditor } from './MessageEditor'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string, deleteForEveryone?: boolean) => void
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onReact?: (messageId: string, emoji: string) => void
  className?: string
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onReact,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />
      case 'failed':
        return <div className="h-3 w-3 text-destructive">!</div>
      default:
        return null
    }
  }

  const isSystemMessage = message.type === 'system'

  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full max-w-xs">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-end gap-2 mb-4 message-enter',
      isOwn ? 'justify-end' : 'justify-start',
      className
    )}>
      {/* Avatar for incoming messages only */}
      {!isOwn && showAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={`/api/users/${message.senderId}/avatar`} alt="User" />
          <AvatarFallback>
            {message.senderId.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message bubble */}
      <div className={cn(
        'flex flex-col max-w-[60%] lg:max-w-md',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Message content */}
        <div className={cn(
          'group relative px-4 py-2 rounded-bubble break-words shadow-sm',
          isOwn
            ? 'bg-bubble-out text-bubble-out-text'
            : 'bg-bubble-in text-bubble-in-text'
        )}>
          {/* Inline editor for text messages */}
          {isEditing && message.type === 'text' ? (
            <MessageEditor
              messageId={message.id}
              initialContent={message.content}
              onSave={(content) => {
                onEdit?.(message.id, content)
                setIsEditing(false)
              }}
              onCancel={() => setIsEditing(false)}
              className="mb-0"
            />
          ) : (
            <>
              {message.type === 'text' && (
                <p className="text-base whitespace-pre-wrap leading-normal">{message.content}</p>
              )}

              {message.type === 'file' && (
                <div className="flex items-center space-x-2">
                  <div className="text-sm">{message.content}</div>
                  <Button size="sm" variant="ghost" className="h-6 px-2">
                    Download
                  </Button>
                </div>
              )}

              {message.type === 'image' && (
                <div className="space-y-2">
                  <img
                    src={message.content}
                    alt="Shared image"
                    className="max-w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                  {message.metadata?.fileName && (
                    <p className="text-xs opacity-70">{message.metadata.fileName}</p>
                  )}
                </div>
              )}

              {/* Timestamp and status inline at bottom right */}
              <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                {message.editedAt && (
                  <>
                    <Edit3 className="h-3 w-3" />
                    <span className="mr-1">edited</span>
                  </>
                )}
                <span>{formatTime(message.createdAt)}</span>
                {isOwn && <span className="status-icon">{getStatusIcon()}</span>}
              </div>

              {/* Message actions - appears on hover */}
              {!isEditing && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                  <MessageActions
                    message={message}
                    isOwn={isOwn}
                    onEdit={(messageId, content) => {
                      onEdit?.(messageId, content)
                    }}
                    onDelete={onDelete}
                    onReply={onReply}
                    onForward={onForward}
                    onReact={onReact}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Message reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              {message.reactions.slice(0, 3).map((reaction) => (
                <span key={reaction.id} className="text-xs">
                  {reaction.emoji}
                </span>
              ))}
              {message.reactions.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{message.reactions.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Read receipts for group messages (shown below bubble) */}
        {!isOwn && message.readBy && message.readBy.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <div className="flex -space-x-1">
              {message.readBy.slice(0, 3).map((receipt) => (
                <div
                  key={receipt.userId}
                  className="w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center text-[10px] text-primary-foreground"
                  title={receipt.user?.name || 'Unknown user'}
                >
                  {(receipt.user?.name || '?').charAt(0).toUpperCase()}
                </div>
              ))}
              {message.readBy.length > 3 && (
                <div className="w-4 h-4 bg-muted rounded-full border-2 border-background flex items-center justify-center text-[10px]">
                  +{message.readBy.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}