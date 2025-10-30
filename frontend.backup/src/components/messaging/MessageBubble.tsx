import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageBubbleProps {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: MessageStatus;
  isEdited: boolean;
  senderAvatar?: string;
  senderName?: string;
  showAvatar?: boolean;
  isGroupChat?: boolean;
}

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  const icons = {
    sending: <Clock className="w-4 h-4 text-muted-foreground animate-pulse-gentle" aria-label="Sending" />,
    sent: <Check className="w-4 h-4 text-muted-foreground animate-status-change" aria-label="Sent" />,
    delivered: <CheckCheck className="w-4 h-4 text-muted-foreground animate-status-change" aria-label="Delivered" />,
    read: <CheckCheck className="w-4 h-4 text-primary animate-status-change" aria-label="Read" />,
    failed: <AlertCircle className="w-4 h-4 text-destructive animate-status-change" aria-label="Failed to send" />,
  };

  return icons[status];
};

export const MessageBubble = ({
  content,
  sender,
  timestamp,
  status,
  isEdited,
  senderAvatar,
  senderName,
  showAvatar = true,
  isGroupChat = false,
}: MessageBubbleProps) => {
  const isMe = sender === 'me';

  return (
    <div
      className={cn(
        "flex gap-2 mb-4 animate-message-appear",
        isMe ? "justify-end" : "justify-start"
      )}
      role="article"
      aria-label={`Message from ${isMe ? 'you' : senderName || 'sender'} at ${format(timestamp, 'HH:mm')}: ${content}`}
    >
      {/* Avatar (for incoming messages in group chats and 1-on-1 when enabled) */}
      {!isMe && showAvatar && (
        <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {senderName?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Container */}
      <div className={cn(
        "max-w-[60%] lg:max-w-[50%]",
        isMe && "flex flex-col items-end"
      )}>
        {/* Sender name (for group chats) */}
        {!isMe && isGroupChat && senderName && (
          <p className="text-xs font-semibold text-primary mb-1 px-1">
            {senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-bubble px-4 py-2 shadow-sm transition-all duration-fast message-bubble focus-ring",
            isMe
              ? "bg-bubble-out text-bubble-out-text rounded-bl-sm animate-slide-in-right"
              : "bg-bubble-in text-bubble-in-text rounded-br-sm animate-slide-in-left"
          )}
          tabIndex={0}
        >
          {/* Content */}
          <p className="text-base whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </p>

          {/* Footer */}
          <div className={cn(
            "flex items-center gap-1 mt-1 text-xs",
            isMe ? "justify-end" : "justify-start"
          )}>
            {isEdited && (
              <span className="opacity-70" aria-label="Edited">
                edited
              </span>
            )}
            <span className="opacity-70" aria-label={`Sent at ${format(timestamp, 'HH:mm')}`}>
              {format(timestamp, 'HH:mm')}
            </span>
            {isMe && <StatusIcon status={status} />}
          </div>
        </div>
      </div>
    </div>
  );
};