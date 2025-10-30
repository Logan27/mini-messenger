import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Pin, Volume2, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListItemProps {
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
  isSelected?: boolean;
  onClick: (id: string) => void;
}

export const ChatListItem = ({
  id,
  name,
  avatar,
  lastMessage,
  timestamp,
  unreadCount,
  isOnline,
  isPinned,
  isMuted,
  isTyping,
  isSelected = false,
  onClick,
}: ChatListItemProps) => {
  const handleClick = () => onClick(id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Chat with ${name}, ${unreadCount} unread messages, last message: ${lastMessage}`}
      className={cn(
        "flex items-center gap-3 p-3 hover:bg-secondary cursor-pointer transition-all duration-fast chat-list-item btn-press",
        "border-b border-border last:border-0",
        isSelected && "bg-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-ring"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 bg-online border-2 border-background rounded-full animate-pulse-gentle"
            aria-label="Online"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={cn(
              "text-base font-medium truncate",
              unreadCount > 0 && "font-semibold text-foreground"
            )}>
              {name}
            </span>
            {isPinned && (
              <Pin className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-label="Pinned" />
            )}
            {isMuted && (
              <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-label="Muted" />
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm text-muted-foreground truncate flex-1 min-w-0",
            isTyping && "text-primary italic"
          )}>
            {isTyping ? 'typing...' : lastMessage}
          </p>
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 min-w-[20px] h-5 flex items-center justify-center text-xs font-medium bg-primary text-primary-foreground"
              aria-label={`${unreadCount} unread messages`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};