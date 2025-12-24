import { useRef, useEffect, useCallback, useState } from 'react';
import { Message } from '@/types/chat';

interface UseChatScrollOptions {
    messages: Message[];
    isLoadingMessages: boolean;
    isLoadingMore: boolean;
    hasMoreMessages: boolean;
    onLoadMore?: () => void;
    conversationId: string | undefined;
}

interface UseChatScrollReturn {
    messagesContainerRef: React.RefObject<HTMLDivElement>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    isReady: boolean; // True when initial scroll positioning is complete
    showScrollButton: boolean;
    scrollToBottom: (smooth?: boolean) => void;
}

/**
 * Custom hook for managing chat scroll behavior.
 * 
 * Handles:
 * - Initial scroll positioning (to bottom or saved position)
 * - Saving/restoring scroll position per conversation
 * - Pagination scroll preservation
 * - New message auto-scroll (only if near bottom)
 * - Scroll-to-bottom button visibility
 */
export function useChatScroll({
    messages,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    onLoadMore,
    conversationId,
}: UseChatScrollOptions): UseChatScrollReturn {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // State
    const [isReady, setIsReady] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Refs for tracking state without triggering re-renders
    const prevConversationIdRef = useRef<string | undefined>(undefined);
    const prevMessageCountRef = useRef<number>(0);
    const isInitialLoadRef = useRef<boolean>(true);
    const wasLoadingMoreRef = useRef<boolean>(false);
    const scrollPositionBeforePaginationRef = useRef<{ messageId: string; offset: number } | null>(null);



    // Helper: Get storage key for this conversation
    const getStorageKey = useCallback(() => {
        return conversationId ? `chat_scroll_${conversationId}` : null;
    }, [conversationId]);

    // Helper: Scroll to bottom
    const scrollToBottom = useCallback((smooth = true) => {
        const container = messagesContainerRef.current;
        if (!container) return;


        container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto',
        });
    }, []);

    // Helper: Check if near bottom
    const isNearBottom = useCallback((threshold = 150) => {
        const container = messagesContainerRef.current;
        if (!container) return true;

        const { scrollTop, scrollHeight, clientHeight } = container;
        // console.log('📜 [ScrollDebug] isNearBottom', { scrollTop, scrollHeight, clientHeight, threshold });
        return scrollHeight - scrollTop - clientHeight < threshold;
    }, []);

    // Reset state when conversation changes
    useEffect(() => {
        if (conversationId !== prevConversationIdRef.current) {
            prevConversationIdRef.current = conversationId;
            prevMessageCountRef.current = 0;
            isInitialLoadRef.current = true;
            setIsReady(false);
            messageRefs.current.clear();
        }
    }, [conversationId]);

    // Initial positioning: scroll to bottom or saved position
    useEffect(() => {
        if (!conversationId || isLoadingMessages || isLoadingMore || messages.length === 0) {
            return;
        }

        if (!isInitialLoadRef.current) {
            return;
        }

        const container = messagesContainerRef.current;
        if (!container) return;

        // Use double RAF to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const storageKey = getStorageKey();
                const savedMessageId = storageKey ? localStorage.getItem(storageKey) : null;

                if (savedMessageId) {
                    // Try to scroll to saved message
                    const savedElement = messageRefs.current.get(savedMessageId);
                    if (savedElement) {
                        savedElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                        isInitialLoadRef.current = false;
                        prevMessageCountRef.current = messages.length;
                        setIsReady(true);
                        return;
                    }

                    // Saved message not found - it was probably deleted
                    // Since we now load from the saved position via `after` param,
                    // the first message in the list is the "nearest" message
                    // Scroll to first message as fallback
                    // Saved message not found - default to bottom to avoid jumping to oldest
                    scrollToBottom(false);

                    // Clear the stale saved position
                    if (storageKey) {
                        localStorage.removeItem(storageKey);
                    }

                    isInitialLoadRef.current = false;
                    prevMessageCountRef.current = messages.length;
                    setIsReady(true);
                    return;
                }

                // No saved position: scroll to bottom instantly
                container.scrollTop = container.scrollHeight;
                isInitialLoadRef.current = false;
                prevMessageCountRef.current = messages.length;
                setIsReady(true);
            });
        });
    }, [conversationId, isLoadingMessages, isLoadingMore, messages.length, getStorageKey]);

    // Pagination: save position before loading, restore after
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || !hasMoreMessages || !onLoadMore) return;

        const handleScroll = () => {
            // Near top: save position and trigger load
            if (container.scrollTop < 100 && !isLoadingMore && !scrollPositionBeforePaginationRef.current) {
                // Find the first visible message to anchor to
                let closestMessage: { messageId: string; offset: number } | null = null;
                let minDistance = Infinity;

                messageRefs.current.forEach((element, messageId) => {
                    const rect = element.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const offset = rect.top - containerRect.top;

                    if (offset >= 0 && offset < minDistance) {
                        minDistance = offset;
                        closestMessage = { messageId, offset };
                    }
                });

                if (closestMessage) {
                    scrollPositionBeforePaginationRef.current = closestMessage;
                    onLoadMore();
                }
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMoreMessages, isLoadingMore, onLoadMore]);

    // Restore scroll position after pagination completes
    useEffect(() => {
        const justFinishedLoading = wasLoadingMoreRef.current && !isLoadingMore;
        wasLoadingMoreRef.current = isLoadingMore;

        if (!justFinishedLoading || isInitialLoadRef.current) return;

        const container = messagesContainerRef.current;
        const savedPosition = scrollPositionBeforePaginationRef.current;

        if (!container || !savedPosition) return;

        requestAnimationFrame(() => {
            const { messageId, offset } = savedPosition;
            const element = messageRefs.current.get(messageId);

            if (element) {
                const rect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const currentOffset = rect.top - containerRect.top;

                // Adjust scroll to maintain the same visual position
                container.scrollTop += currentOffset - offset;
            }

            scrollPositionBeforePaginationRef.current = null;
        });
    }, [isLoadingMore]);

    // New message handling: auto-scroll if near bottom
    useEffect(() => {
        if (isInitialLoadRef.current || isLoadingMessages || isLoadingMore) return;

        const currentCount = messages.length;
        const prevCount = prevMessageCountRef.current;
        prevMessageCountRef.current = currentCount;

        // Only handle new messages (count increased)
        if (currentCount <= prevCount) return;

        const latestMessage = messages[messages.length - 1];
        if (!latestMessage) return;

        // Auto-scroll if: own message (including temp messages) OR already near bottom
        const container = messagesContainerRef.current;
        if (!container) return;

        const shouldScroll = latestMessage.isOwn || isNearBottom(150);

        if (shouldScroll) {
            // Wait for DOM to update, then scroll smoothly
            requestAnimationFrame(() => {
                scrollToBottom(true);
            });
        }
    }, [messages, isLoadingMessages, isLoadingMore, isNearBottom, scrollToBottom]);

    // Scroll button visibility & save position on scroll
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        let saveTimeout: NodeJS.Timeout;

        const handleScroll = () => {
            // Update scroll button visibility
            setShowScrollButton(!isNearBottom(100));

            // Debounce save position
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const storageKey = getStorageKey();
                if (!storageKey) return;

                // If at bottom, clear saved position
                if (isNearBottom(100)) { // Increased threshold to 100
                    localStorage.removeItem(storageKey);
                    return;
                }

                // Save the center-most visible message
                const { top, left, width, height } = container.getBoundingClientRect();
                const centerX = left + width / 2;
                const centerY = top + height / 2;

                // Use elementFromPoint to find the element at the center of the container
                // This is O(1) compared to O(N) loop over all messages
                const elementAtCenter = document.elementFromPoint(centerX, centerY);
                const messageElement = elementAtCenter?.closest('[data-message-id]');

                let closestMessage = null;
                if (messageElement) {
                    closestMessage = messageElement.getAttribute('data-message-id');
                }

                if (closestMessage) {
                    localStorage.setItem(storageKey, closestMessage);
                }
            }, 200);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(saveTimeout);
        };
    }, [getStorageKey, isNearBottom]);

    return {
        messagesContainerRef,
        messagesEndRef,
        messageRefs,
        isReady,
        showScrollButton,
        scrollToBottom,
    };
}
