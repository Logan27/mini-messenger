import React, { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'file' | 'image') => void
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  className
}) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true)
      onTyping?.(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      onTyping?.(false)
    }, 1000)

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, isTyping, onTyping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || disabled) return

    onSendMessage(message.trim(), 'text')
    setMessage('')
    setIsTyping(false)
    onTyping?.(false)

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Focus back to textarea
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    // Shift+Enter for new line (default textarea behavior)
  }

  const handleFileUpload = (type: 'file' | 'image') => {
    // TODO: Implement file upload
    console.log(`Upload ${type}`)
  }

  const isEmpty = !message.trim()

  return (
    <div className={cn('flex items-end gap-2 p-3 xs:p-4 border-t border-border bg-background', className)}>
      {/* File upload buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => handleFileUpload('file')}
          className="h-10 w-10 xs:h-11 xs:w-11 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4 xs:h-5 xs:w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => handleFileUpload('image')}
          className="h-10 w-10 xs:h-11 xs:w-11 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Attach image"
        >
          <Image className="h-4 w-4 xs:h-5 xs:w-5" />
        </Button>
      </div>

      {/* Message input form */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2 min-w-0">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'min-h-[44px] xs:min-h-[48px] max-h-32 resize-none rounded-lg text-base xs:text-lg',
              'focus-visible:ring-primary',
              'pr-12 xs:pr-14', // Space for emoji button
              'transition-colors duration-fast'
            )}
            rows={1}
            aria-label="Message input"
          />

          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="absolute right-2 xs:right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 xs:h-9 xs:w-9 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Add emoji"
          >
            <Smile className="h-4 w-4 xs:h-5 xs:w-5" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={disabled || isEmpty}
          size="icon"
          className={cn(
            'h-10 w-10 xs:h-11 xs:w-11 rounded-full transition-all duration-fast flex-shrink-0',
            isEmpty
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4 xs:h-5 xs:w-5" />
        </Button>
      </form>
    </div>
  )
}