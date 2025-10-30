import React, { useState, useRef, useEffect } from 'react'
import { Check, X, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MessageEditorProps {
  messageId: string
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
  maxLength?: number
  className?: string
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messageId,
  initialContent,
  onSave,
  onCancel,
  maxLength = 1000,
  className
}) => {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleSave = async () => {
    if (!content.trim() || content.trim() === initialContent) {
      onCancel()
      return
    }

    setIsSaving(true)
    try {
      await onSave(content.trim())
    } catch (error) {
      console.error('Failed to save message:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const isContentChanged = content.trim() !== initialContent
  const isContentValid = content.trim().length > 0 && content.length <= maxLength

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          className="pr-20"
          placeholder="Edit your message..."
        />

        {/* Character count */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {content.length}/{maxLength}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isContentChanged || !isContentValid || isSaving}
          className="h-8 px-2"
        >
          {isSaving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}