import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  usernames?: string[];
  className?: string;
  showText?: boolean;
}

export const TypingIndicator = ({
  usernames = [],
  className,
  showText = true,
}: TypingIndicatorProps) => {
  const getTypingText = () => {
    if (usernames.length === 0) return 'Someone is typing';
    if (usernames.length === 1) return `${usernames[0]} is typing`;
    if (usernames.length === 2) return `${usernames[0]} and ${usernames[1]} are typing`;
    return `${usernames[0]} and ${usernames.length - 1} others are typing`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={getTypingText()}
    >
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
          style={{ animationDelay: '0ms' }}
          aria-hidden="true"
        />
        <span
          className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
          style={{ animationDelay: '150ms' }}
          aria-hidden="true"
        />
        <span
          className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
          style={{ animationDelay: '300ms' }}
          aria-hidden="true"
        />
      </div>

      {/* Typing text */}
      {showText && (
        <span className="italic">
          {getTypingText()}
        </span>
      )}
    </div>
  );
};

// Inline typing indicator for chat list
export const InlineTypingIndicator = ({
  username
}: {
  username: string;
}) => {
  return (
    <div className="flex items-center gap-1">
      <span
        className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dot"
        style={{ animationDelay: '0ms' }}
        aria-hidden="true"
      />
      <span
        className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dot"
        style={{ animationDelay: '100ms' }}
        aria-hidden="true"
      />
      <span
        className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dot"
        style={{ animationDelay: '200ms' }}
        aria-hidden="true"
      />
      <span className="text-xs text-primary italic ml-1">
        {username} is typing...
      </span>
    </div>
  );
};