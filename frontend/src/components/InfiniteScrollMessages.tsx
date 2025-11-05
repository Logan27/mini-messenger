import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { Message } from '@/types/chat';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollMessagesProps {
  messages: Message[];
  isLoadingMessages?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectMessage?: (message: Message) => void;
}

/**
 * InfiniteScrollMessages Component
 * 
 * Provides high-performance message list rendering with:
 * - Infinite scroll loading when scrolling to top
 * - Automatic scroll-to-bottom for new messages
 * - Scroll position preservation after loading older messages
 * - Smooth animations and loading states
 */
export const InfiniteScrollMessages: React.FC<InfiniteScrollMessagesProps> = ({
  messages,
  isLoadingMessages = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onSelectMessage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousHeightRef = useRef(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // When new messages load at the top, maintain scroll position
  useEffect(() => {
    if (scrollContainerRef.current && isLoadingMore === false && previousHeightRef.current > 0) {
      const currentHeight = scrollContainerRef.current.scrollHeight;
      const heightDiff = currentHeight - previousHeightRef.current;
      
      // Scroll down by the amount of new content added
      if (heightDiff > 0) {
        scrollContainerRef.current.scrollTop += heightDiff;
      }
    }
  }, [messages, isLoadingMore]);

  // Track container height before loading
  useEffect(() => {
    if (scrollContainerRef.current && isLoadingMore) {
      previousHeightRef.current = scrollContainerRef.current.scrollHeight;
    }
  }, [isLoadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreSentinelRef.current || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && onLoadMore) {
            onLoadMore();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Auto-scroll to bottom on new messages
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Auto-scroll to bottom if user is viewing recent messages
      if (isAtBottom && !isLoadingMore) {
        scrollContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [isLoadingMore]);

  if (isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="overflow-y-auto h-full bg-background"
    >
      {/* Load more sentinel */}
      {hasMore && (
        <div
          ref={loadMoreSentinelRef}
          className="h-8 flex items-center justify-center"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading older messages...</span>
            </div>
          )}
        </div>
      )}

      {/* Messages list */}
      <div className="space-y-2 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            onClick={() => onSelectMessage?.(message)}
            className="hover:bg-muted/20 transition-colors rounded-lg p-2 cursor-pointer"
          >
            <MessageBubble message={message} />
          </div>
        ))}
      </div>

      {/* End of conversation marker */}
      {!hasMore && messages.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-xs text-muted-foreground">End of conversation</p>
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollMessages;
