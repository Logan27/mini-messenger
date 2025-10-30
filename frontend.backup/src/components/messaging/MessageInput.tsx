import React, { useState, useRef, KeyboardEvent, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Mic, Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => void;
  onAttach?: () => void;
  onVoiceRecord?: () => void;
  onEmojiClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  replyToMessage?: {
    id: string;
    content: string;
    sender: string;
  };
  onCancelReply?: () => void;
  editingMessage?: {
    id: string;
    content: string;
  };
  onCancelEdit?: () => void;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(({
  onSend,
  onAttach,
  onVoiceRecord,
  onEmojiClick,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  replyToMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}, ref) => {
  const [message, setMessage] = useState('');
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');

      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Refocus for next message
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Escape to cancel reply/edit
    if (e.key === 'Escape') {
      if (replyToMessage && onCancelReply) {
        onCancelReply();
      } else if (editingMessage && onCancelEdit) {
        onCancelEdit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      adjustHeight();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t bg-background">
      {/* Reply/Edit indicator */}
      {(replyToMessage || editingMessage) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {replyToMessage ? 'Replying to' : 'Editing'}
              </span>
              <span className="font-medium text-foreground truncate">
                {replyToMessage ? replyToMessage.sender : 'your message'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {replyToMessage?.content || editingMessage?.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={replyToMessage ? onCancelReply : onCancelEdit}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            ×
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        {/* Attach Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onAttach}
          disabled={disabled}
          className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEmojiClick}
          disabled={disabled}
          className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[44px] max-h-[120px] resize-none border-input bg-background placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
            rows={1}
            maxLength={maxLength}
            aria-label="Message input"
          />
        </div>

        {/* Character count (when close to limit) */}
        {message.length > maxLength * 0.9 && (
          <span className={cn(
            "text-xs px-1",
            message.length >= maxLength ? "text-destructive" : "text-muted-foreground"
          )}>
            {message.length}/{maxLength}
          </span>
        )}

        {/* Send / Voice Button */}
        {canSend ? (
          <Button
            onClick={handleSend}
            size="icon"
            disabled={disabled}
            className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoiceRecord}
            disabled={disabled}
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Record voice message"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';