import { useState, useRef, useEffect, useReducer, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { CallMessage } from "./CallMessage";
import { TypingIndicator } from "./TypingIndicator";
import { FileUploadDialog } from "./FileUploadDialog";
import { MessageSearch } from "./MessageSearch";
import { FileGallery } from "./FileGallery";
import { GroupSettings } from "./GroupSettings";
import { GroupInfo } from "./GroupInfo";
import { MessageSkeleton } from "./SkeletonLoaders";
import { EmojiPicker } from "./EmojiPicker";
import { OutgoingCall } from "./OutgoingCall";
import { IncomingCall } from "./IncomingCall";
import { InlineLoadingFallback } from "./LoadingFallback";
import EmptyState from "./EmptyState";

// Lazy load heavy WebRTC component - only loaded when user starts a call
const ActiveCall = lazy(() => import("./ActiveCall").then(module => ({ default: module.ActiveCall })));
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, Phone, Video, ArrowDown, ArrowLeft, X, Paperclip, Smile, MessageSquare, FolderOpen, Settings, Users, Info, Loader2, LogOut, Bell, BellOff, UserPlus, UserX, Trash2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { useAddReaction } from "@/hooks/useReactions";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { useMuteContact, useUnmuteContact, useMuteGroup, useUnmuteGroup, useBlockContact, useRemoveContact, useContacts } from "@/hooks/useContacts";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/services/socket.service";
import { toast as sonnerToast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";

interface ChatViewProps {
  chatName: string;
  chatAvatar: string;
  isOnline?: boolean;
  messages: Message[];
  recipientId?: string | null;
  groupId?: string | null;
  isGroup?: boolean;
  isGroupAdmin?: boolean;
  isGroupCreator?: boolean;
  isLoadingMessages?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onGroupUpdated?: () => void;
  onGroupLeft?: () => void;
}

export const ChatView = ({
  chatName,
  chatAvatar,
  isOnline,
  messages,
  recipientId,
  groupId,
  isGroup = false,
  isGroupAdmin = false,
  isGroupCreator = false,
  isLoadingMessages = false,
  hasMoreMessages = false,
  onLoadMore,
  isLoadingMore = false,
  onGroupUpdated,
  onGroupLeft,
}: ChatViewProps) => {
  const [inputValue, setInputValue] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  // Use useReducer to ensure state updates trigger re-renders
  const [isTyping, setIsTyping] = useReducer((_: boolean, newValue: boolean) => newValue, false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showOutgoingCall, setShowOutgoingCall] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callType: 'video' | 'voice';
  } | null>(null);
  const [callType, setCallType] = useState<'video' | 'voice'>('voice');
  const [showActiveCall, setShowActiveCall] = useState(false);
  const [activeCallData, setActiveCallData] = useState<{
    callId: string;
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    callType: 'video' | 'voice';
    isInitiator: boolean;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Track dropdown state for re-render
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false); // Track mobile search dialog
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState([]);
  const [mobileSearchLoading, setMobileSearchLoading] = useState(false);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(true); // Always try to restore scroll position on initial load
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set()); // Track which messages we've marked as read
  const isTypingRef = useRef<boolean>(false); // Track if we're currently in typing state
  const isMountedRef = useRef<boolean>(false); // Track if component is actually mounted and visible
  const isInitialLoadRef = useRef<boolean>(true); // Track if this is the initial message load
  const previousMessageCountRef = useRef<number>(0); // Track previous message count
  const wasLoadingMoreRef = useRef<boolean>(false); // Track if we were loading more messages
  const scrollBeforePaginationRef = useRef<{ messageId: string; offset: number } | null>(null); // Track scroll position before pagination
  const lastPaginationCompleteRef = useRef<number>(0); // Track when pagination last completed
  const lastScrolledMessageIdRef = useRef<string>(''); // Track which message we last scrolled for (to prevent duplicate scrolls on status updates)

  const navigate = useNavigate();
  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const addReaction = useAddReaction();
  const { sendTyping, onTyping, isConnected } = useSocket();

  const { toast } = useToast();
  const muteContact = useMuteContact();
  const unmuteContact = useUnmuteContact();
  const muteGroup = useMuteGroup();
  const unmuteGroup = useUnmuteGroup();
  const blockContact = useBlockContact();
  const removeContact = useRemoveContact();
  const { data: contacts, refetch: refetchContacts } = useContacts('accepted');

  // Listen for socket mute/unmute events
  useEffect(() => {
    const handleContactMuted = (data: { contactId: string; isMuted: boolean; timestamp: string }) => {
      // Refetch contacts to get updated mute status
      refetchContacts();
    };

    const handleContactUnmuted = (data: { contactId: string; isMuted: boolean; timestamp: string }) => {
      // Refetch contacts to get updated mute status
      refetchContacts();
    };

    // Subscribe to socket events
    socketService.on('contact.muted', handleContactMuted);
    socketService.on('contact.unmuted', handleContactUnmuted);

    // Cleanup
    return () => {
      socketService.off('contact.muted', handleContactMuted);
      socketService.off('contact.unmuted', handleContactUnmuted);
    };
  }, [refetchContacts]);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Track when component is mounted and visible
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-load more messages on scroll to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMoreMessages || isLoadingMore || !onLoadMore) return;

    let previousScrollHeight = 0;
    let previousScrollTop = 0;
    let isLoading = false;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // Save current scroll position when getting close to top (within 200px)
      // This happens BEFORE we trigger loading, ensuring we capture the right position
      if (scrollTop < 200 && !isLoading && !scrollBeforePaginationRef.current) {
        const viewportTop = scrollTop;
        let closestMessage = null;
        let closestDistance = Infinity;

        messageRefs.current.forEach((element, messageId) => {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const messageTop = rect.top - containerRect.top + scrollTop;
          const distance = Math.abs(messageTop - viewportTop);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestMessage = { messageId, offset: messageTop - viewportTop };
          }
        });

        if (closestMessage) {
          scrollBeforePaginationRef.current = closestMessage;
        }
      }

      // Check if scrolled near top (within 100px) to trigger loading
      const isNearTop = scrollTop < 100;

      if (isNearTop && !isLoading) {
        isLoading = true;
        previousScrollHeight = scrollHeight;
        previousScrollTop = scrollTop;

        // Position should already be saved from above

        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  // Restore scroll position after loading more messages (but not on initial load)
  useEffect(() => {
    const container = messagesContainerRef.current;

    // Only run when we've just finished loading more messages
    // (transition from isLoadingMore=true to isLoadingMore=false)
    const justFinishedLoading = wasLoadingMoreRef.current && !isLoadingMore;

    // Update the ref for next time
    wasLoadingMoreRef.current = isLoadingMore;

    // Don't run if:
    // - No container
    // - Still loading
    // - Initial load
    // - Didn't just finish loading more messages
    if (!container || isLoadingMore || isInitialLoadRef.current || !justFinishedLoading) return;

    // Maintain scroll position: restore to the exact position before pagination started
    const timer = setTimeout(() => {
      const savedPosition = scrollBeforePaginationRef.current;

      if (savedPosition) {
        const { messageId, offset } = savedPosition;
        const savedElement = messageRefs.current.get(messageId);

        if (savedElement) {
          // Get the message's current position
          const rect = savedElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const currentMessageTop = rect.top - containerRect.top;

          // Calculate how much to scroll to restore the exact position
          const scrollAdjustment = currentMessageTop - offset;
          container.scrollTop += scrollAdjustment;


          // Clear the saved position and mark pagination as just completed
          scrollBeforePaginationRef.current = null;
          lastPaginationCompleteRef.current = Date.now();
          return;
        }
      }

      // Fallback: keep first message at top (if no saved position)
      const firstMessage = container.querySelector('[data-message-id]');
      if (firstMessage) {
        firstMessage.scrollIntoView({ block: 'start', behavior: 'auto' });
      }

      // Mark pagination as just completed
      lastPaginationCompleteRef.current = Date.now();
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoadingMore, recipientId, groupId]);

  // Focus input when chat opens or recipient changes
  useEffect(() => {
    if (recipientId) {
      inputRef.current?.focus();
      // Clear the marked-as-read tracking when switching chats
      markedAsReadRef.current.clear();
      // Reset typing state
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Check for pending call from ChatList
      const pendingCallStr = sessionStorage.getItem('pendingCall');
      if (pendingCallStr) {
        try {
          const pendingCall = JSON.parse(pendingCallStr);
          if (pendingCall.contactId === recipientId) {
            // Clear the pending call
            sessionStorage.removeItem('pendingCall');
            // Initiate the call
            setCallType(pendingCall.callType);
            setShowOutgoingCall(true);
          }
        } catch (error) {
          console.error('Failed to parse pending call:', error);
          sessionStorage.removeItem('pendingCall');
        }
      }
    }
  }, [recipientId]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    // Only reset if conversation actually changed (not just component re-render)
    const conversationId = recipientId || groupId;
    const previousConversationId = localStorage.getItem('lastConversationId');

    if (conversationId !== previousConversationId) {
      isInitialLoadRef.current = true;
      previousMessageCountRef.current = 0;
      setShouldRestoreScroll(true); // We want to restore scroll position for new conversations
      localStorage.setItem('lastConversationId', conversationId || '');
    }
  }, [recipientId, groupId]);

  // Save scroll position when user scrolls (message-based)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (!messagesContainerRef.current) return;

      const { scrollTop, clientHeight, scrollHeight } = messagesContainerRef.current;

      // Debounce the scroll position saving
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const conversationId = recipientId || groupId;
        if (!conversationId) return;

        const savedScrollKey = `chat_scroll_${conversationId}`;

        // Check if we're at the very bottom (within 10px)
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < 10;

        if (isAtBottom) {
          // At bottom - clear saved position (will default to bottom on reload)
          localStorage.removeItem(savedScrollKey);
          return;
        }

        // Not at bottom - save the bottom-most (newest) visible message
        // This is the last message user was viewing
        const viewportBottom = scrollTop + clientHeight;
        let bottomMostVisibleMessage = null;
        let bottomMostPosition = -Infinity;

        messageRefs.current.forEach((element, messageId) => {
          const rect = element.getBoundingClientRect();
          const containerRect = messagesContainerRef.current!.getBoundingClientRect();
          const messageTop = rect.top - containerRect.top + scrollTop;
          const messageBottom = messageTop + rect.height;

          // Check if message is visible in viewport
          const isVisible = messageTop < viewportBottom && messageBottom > scrollTop;

          if (isVisible && messageBottom > bottomMostPosition) {
            bottomMostPosition = messageBottom;
            bottomMostVisibleMessage = messageId;
          }
        });

        if (bottomMostVisibleMessage) {
          localStorage.setItem(savedScrollKey, bottomMostVisibleMessage);
        }
      }, 200); // Wait 200ms after scrolling stops
    };

    const container = messagesContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => {
      container?.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [recipientId, groupId, messages]);

  // Mobile search functionality
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (mobileSearchQuery.length >= 2) {
        setMobileSearchLoading(true);
        try {
          const params = new URLSearchParams({
            q: mobileSearchQuery,
            limit: '20',
            page: '1',
          });

          // Filter by current conversation if recipientId provided
          if (recipientId) {
            params.append('conversationWith', recipientId);
          } else if (groupId) {
            params.append('groupId', groupId);
          }

          const response = await apiClient.get(`/messages/search?${params}`);
          setMobileSearchResults(response.data.data || response.data.results || []);
        } catch (error) {
          console.error('Search error:', error);
          setMobileSearchResults([]);
        } finally {
          setMobileSearchLoading(false);
        }
      } else {
        setMobileSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimer);
  }, [mobileSearchQuery, recipientId, groupId]);

  // Smart scroll: only scroll to bottom for new messages, not on initial load or when loading history
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    // First load: restore scroll position or scroll to bottom if no saved position
    if (isInitialLoadRef.current && currentMessageCount > 0 && !isLoadingMessages && !isLoadingMore) {
      // Use setTimeout to ensure DOM is fully rendered (more reliable than requestAnimationFrame)
      const timer = setTimeout(() => {
        const conversationId = recipientId || groupId || 'global';
        const savedMessageId = localStorage.getItem(`chat_scroll_${conversationId}`);

        if (shouldRestoreScroll && savedMessageId) {
          // Try to restore saved message position
          const savedElement = messageRefs.current.get(savedMessageId);
          if (savedElement && messagesContainerRef.current) {
            savedElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            isInitialLoadRef.current = false;
            setShouldRestoreScroll(false); // Only restore once per conversation change
          } else if (hasMoreMessages && onLoadMore && !isLoadingMore) {
            // Saved message not in current page, load more pages to find it
            onLoadMore();
            // Don't set isInitialLoadRef to false yet - we'll retry when more messages load
          } else if (!hasMoreMessages) {
            // No more messages to load, saved message doesn't exist (might be deleted)
            scrollToBottom();
            isInitialLoadRef.current = false;
            setShouldRestoreScroll(false);
          }
          // else: isLoadingMore is true, wait for it to complete
        } else {
          // Scroll to bottom for new chats or when no saved position
          scrollToBottom();
          isInitialLoadRef.current = false;
          setShouldRestoreScroll(false); // Only restore once per conversation change
        }
      }, 100); // 100ms delay to ensure DOM is fully painted

      previousMessageCountRef.current = currentMessageCount;
      return () => clearTimeout(timer);
    }

    // New message arrived (count increased)
    if (currentMessageCount > previousMessageCount && !isInitialLoadRef.current) {

      // Skip if we're currently loading more messages (pagination)
      // The separate pagination effect will handle scroll restoration
      if (isLoadingMore || wasLoadingMoreRef.current) {
        previousMessageCountRef.current = currentMessageCount;
        return;
      }

      // Skip if pagination just completed (within 500ms)
      // This handles the race condition where messages increase right after pagination
      const timeSincePagination = Date.now() - lastPaginationCompleteRef.current;
      if (timeSincePagination < 500) {
        previousMessageCountRef.current = currentMessageCount;
        return;
      }

      // Get the latest message to check if it's from the current user
      // Scan from the end to find the actual newest message (in case of timing issues)
      let latestMessage = messages[messages.length - 1];
      let isOwnMessage = latestMessage?.isOwn;

      // Also check the last few messages in case the newest isn't at the very end yet
      for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
        if (messages[i] && new Date(messages[i].timestamp) > new Date(latestMessage.timestamp)) {
          latestMessage = messages[i];
          isOwnMessage = messages[i].isOwn;
        }
      }



      // Skip auto-scroll for optimistic (temp) messages - wait for server confirmation
      // This prevents scrolling before the message is actually sent
      const isTempMessage = latestMessage?.id?.startsWith('temp-');

      if (isTempMessage) {
        previousMessageCountRef.current = currentMessageCount;
        return;
      }

      // Check scroll position BEFORE DOM updates
      // We need to check if user was at bottom BEFORE the new message was added
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // More generous threshold: if within 1.5 screens of bottom, consider it "at bottom"
      // This ensures users who are reading recent messages get auto-scrolled
      const isNearBottom = distanceFromBottom < (clientHeight * 1.5);

      // Check if this is a RECENT own message (sent within last 5 seconds)
      const messageAge = Date.now() - new Date(latestMessage.timestamp).getTime();
      const isRecentOwnMessage = isOwnMessage && messageAge < 5000;

      // Auto-scroll rules:
      // - ALWAYS scroll for RECENT own messages (sent within 5 seconds)
      // - For incoming messages OR old own messages, only scroll if already near bottom
      const shouldScroll = isRecentOwnMessage || isNearBottom;

      if (shouldScroll) {
        const container = messagesContainerRef.current;
        if (!container) return;

        const hasFileMessage = latestMessage?.messageType === 'file';
        const oldScrollHeight = container.scrollHeight;


        // Use MutationObserver to detect when DOM actually changes
        let hasScrolled = false;
        let mutationTimer: NodeJS.Timeout | null = null;

        const observer = new MutationObserver((mutations) => {
          // Skip if we already scrolled
          if (hasScrolled) return;

          const newScrollHeight = container.scrollHeight;
          const heightDiff = newScrollHeight - oldScrollHeight;


          // Clear previous timer - wait for mutations to stabilize
          if (mutationTimer) {
            clearTimeout(mutationTimer);
          }

          // Debounce: wait for mutations to stop for 50ms before scrolling
          mutationTimer = setTimeout(() => {
            // Double-check with RAF to ensure layout is 100% complete
            requestAnimationFrame(() => {
              const finalHeight = container.scrollHeight;

              container.scrollTo({
                top: finalHeight,
                behavior: "smooth"
              });

              hasScrolled = true;

              // Disconnect observer after successful scroll
              observer.disconnect();
            });
          }, 50); // Wait 50ms after last mutation
        });

        // Observe the messages container for DOM changes
        observer.observe(container, {
          childList: true,      // Watch for added/removed children
          subtree: true,        // Watch all descendants
          characterData: true,  // Watch for text changes
          attributes: true,     // Watch for attribute changes (e.g., class changes)
        });

        // Fallback timeout in case observer doesn't fire (e.g., message already rendered)
        // Use longer timeout for files to allow images to load
        const fallbackTimeout = hasFileMessage ? 1000 : 500;
        setTimeout(() => {
          const finalScrollHeight = container.scrollHeight;
          const finalHeightDiff = finalScrollHeight - oldScrollHeight;


          // If height changed but observer didn't fire, scroll now
          if (finalHeightDiff > 0 || finalScrollHeight !== oldScrollHeight) {
            container.scrollTo({
              top: finalScrollHeight,
              behavior: "smooth"
            });
          } else {
          }

          // Clean up observer and timer
          if (mutationTimer) {
            clearTimeout(mutationTimer);
          }
          observer.disconnect();
        }, fallbackTimeout);
      } else {
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, recipientId, groupId, shouldRestoreScroll, isLoadingMore, isLoadingMessages, hasMoreMessages, onLoadMore]);

  // Periodic sync for contact status (including mute state)
  useEffect(() => {
    if (!contacts || contacts.length === 0) return;

    // Refetch contacts periodically to sync with backend state
    const syncInterval = setInterval(() => {
      refetchContacts();
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [contacts, recipientId, groupId, refetchContacts]);

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);

        // Debounce the scroll position saving
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          // Save the message ID that's currently in the center of the viewport
          const savedScrollKey = `chat_scroll_${recipientId || groupId}`;
          const viewportCenter = scrollTop + clientHeight / 2;

          // Find the message closest to the viewport center
          let closestMessage = null;
          let closestDistance = Infinity;

          messageRefs.current.forEach((element, messageId) => {
            const rect = element.getBoundingClientRect();
            const containerRect = messagesContainerRef.current!.getBoundingClientRect();
            const messageCenter = rect.top - containerRect.top + scrollTop + rect.height / 2;
            const distance = Math.abs(messageCenter - viewportCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestMessage = messageId;
            }
          });

          if (closestMessage) {
            localStorage.setItem(savedScrollKey, closestMessage);
          }
        }, 200); // Wait 200ms after scrolling stops
      }
    };

    const container = messagesContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => {
      container?.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [recipientId, groupId, messages]);

  // Listen for typing indicators
  useEffect(() => {
    if (!recipientId) return;

    const unsubscribe = onTyping((data: { userId: string; isTyping: boolean }) => {
      if (data.userId === recipientId) {
        setIsTyping(data.isTyping);
        forceUpdate(); // Force component to re-render
      }
    });

    return () => {
      unsubscribe();
    };
  }, [recipientId, onTyping]);

  // Listen for incoming calls
  useEffect(() => {
    const handleIncomingCall = (data: unknown) => {
      
      const call = data.call;
      if (!call) return;

      // Set incoming call data and show dialog
      setIncomingCallData({
        callId: call.id,
        callerId: call.callerId,
        callerName: call.caller?.username || call.caller?.firstName || 'Unknown',
        callerAvatar: call.caller?.avatar,
        callType: call.callType as 'video' | 'voice',
      });
      setShowIncomingCall(true);
    };

    const unsubscribeIncoming = socketService.on('call.incoming', handleIncomingCall);

    return () => {
      unsubscribeIncoming();
    };
  }, []);

  // Mark messages as read when they're displayed
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (!isMountedRef.current) return;
    if (!isConnected) return;

    const markAsReadTimer = setTimeout(() => {
      if (!isMountedRef.current) return;

      const unreadMessages = messages.filter(
        msg => !msg.isOwn &&
               msg.status !== 'read' &&
               !msg.id.startsWith('temp-') &&
               !markedAsReadRef.current.has(msg.id)
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(msg => {
          socketService.markAsRead(msg.id);
          markedAsReadRef.current.add(msg.id);
        });

        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['conversations'] });
        }, 500);
      }
    }, 100);

    return () => clearTimeout(markAsReadTimer);
  }, [messages, isConnected, queryClient]);

  const handleSend = async () => {
    if (!inputValue.trim() || (!recipientId && !groupId)) return;

    try {
      if (editingMessage) {
        await editMessage.mutateAsync({
          messageId: editingMessage.id,
          content: inputValue.trim(),
        });

        setEditingMessage(null);
        toast({
          title: "Message edited",
          description: "Your message has been updated",
        });
      } else {
        const messageData = isGroup
          ? { groupId, content: inputValue.trim(), replyToId: replyingTo?.id }
          : { recipientId, content: inputValue.trim(), replyToId: replyingTo?.id };

        await sendMessage.mutateAsync(messageData);
        setReplyingTo(null);
      }

      setInputValue("");

      // Send typing stopped
      const targetId = recipientId || groupId;
      if (targetId) {
        sendTyping(targetId, false);
      }
      isTypingRef.current = false;

      // Clear any pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Refocus input after sending (use setTimeout for more reliability)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('❌ Failed to send/edit message:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast({
        variant: "destructive",
        title: editingMessage ? "Failed to edit message" : "Failed to send message",
        description: getErrorMessage(error),
      });
    } finally {
      // Always refocus input, even on error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    const targetId = recipientId || groupId;
    if (!targetId) return;

    // Send typing indicator only if not already typing
    if (!isTypingRef.current) {
      sendTyping(targetId, true);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(targetId, false);
      isTypingRef.current = false;
    }, 3000);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setInputValue(message.text || "");
    setReplyingTo(null);
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync({ messageId, deleteType: 'soft' });
      toast({
        title: "Message deleted",
        description: "Your message has been removed",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete message",
        description: getErrorMessage(error),
      });
    }
  };

  const handleReplyClick = (messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement && messagesContainerRef.current) {
      // Scroll to message
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight the message temporarily
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction.mutateAsync({ messageId, emoji });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add reaction",
        description: getErrorMessage(error),
      });
    }
  };

  const handleFileUploaded = async (fileData: unknown) => {
    if (!recipientId && !groupId) return;

    try {
      await sendMessage.mutateAsync({
        ...(recipientId && { recipientId }),
        ...(groupId && { groupId }),
        content: fileData.fileName,
        messageType: 'file',
        metadata: {
          fileId: fileData.id,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
        },
      });

      // Note: Auto-scroll is now handled by the messages.length effect
      // No need to manually scroll here - the effect will detect the new message
      // and scroll after appropriate delay based on message type

      toast({
        title: "File sent",
        description: "File has been sent successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send file",
        description: error.message || "Please try again",
      });
    }
  };

  const handleStartCall = (type: 'video' | 'voice') => {
    if (!recipientId) {
      toast({
        variant: "destructive",
        title: "Cannot start call",
        description: "No recipient selected",
      });
      return;
    }
    setCallType(type);
    setShowOutgoingCall(true);
  };

  return (
    <div className="flex flex-col mobile-vh-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background safe-top">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="md:hidden"
            title="Back to chat list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getAvatarUrl(chatAvatar)} alt={chatName} />
              <AvatarFallback>{chatName.charAt(0)}</AvatarFallback>
            </Avatar>
            {!isGroup && isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="text-primary font-semibold animate-pulse flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1">typing...</span>
                </span>
              ) : isGroup ? (
                "Group chat"
              ) : (
                isOnline ? "online" : "offline"
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">

          {/* Desktop search and files buttons - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <MessageSearch
              recipientId={recipientId}
              onSelectResult={(result) => {
                // Scroll to and highlight the found message
                handleReplyClick(result.id);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFileGallery(true)}
              title="View files & media"
            >
              <FolderOpen className="h-5 w-5" />
            </Button>
          </div>
          {!isGroup && recipientId && (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleStartCall('voice')}
                title="Voice call"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleStartCall('video')}
                title="Video call"
              >
                <Video className="h-5 w-5" />
              </Button>
            </>
          )}
          
          {/* Group-specific menu - desktop only */}
          {isGroup && groupId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden md:flex">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowGroupInfo(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Group Info
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      // This would need to check current group mute state from backend
                      // For now, we'll just toggle (backend handles the logic)
                      await muteGroup.mutateAsync(groupId);
                      sonnerToast.success('Notifications muted');
                    } catch (error) {
                      console.error('❌ Group mute error:', error);
                      sonnerToast.error(getErrorMessage(error));
                    }
                  }}
                >
                  <BellOff className="mr-2 h-4 w-4" />
                  Mute Notifications
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this group?')) {
                      onGroupLeft?.();
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Direct chat menu - desktop only */}
          {!isGroup && recipientId && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild className="hidden md:flex">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(() => {
                  // Find contact once at render time
                  const contact = contacts?.find((c: unknown) => {
                    // Contact can be stored with either userId or contactUserId depending on who initiated
                    return c.contactUserId === recipientId || c.userId === recipientId;
                  });
                  
                  return (
                    <DropdownMenuItem 
                      onClick={async (e) => {
                        e.preventDefault();
                        
                        
                        if (!contact) {
                          toast({
                            title: "Error",
                            description: "Contact not found. Please add this user as a contact first.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          if (contact.isMuted) {
                            await unmuteContact.mutateAsync(contact.id);
                            toast({
                              title: "Success",
                              description: "Notifications enabled",
                            });
                          } else {
                            await muteContact.mutateAsync(contact.id);
                            toast({
                              title: "Success",
                              description: "Notifications muted",
                            });
                          }
                          // Refetch contacts to get updated mute status
                          const result = await refetchContacts();
                          const updatedContact = result.data?.find((c: unknown) => (c as Record<string, unknown>).id === contact.id);
                          console.log('✅ Updated contact after refetch:', updatedContact);
                          
                          // Close and reopen dropdown to show updated state
                          setDropdownOpen(false);
                        } catch (error) {
                          console.error('❌ Mute/unmute error:', error);
                          toast({
                            title: "Error",
                            description: "Failed to update mute status",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {contact?.isMuted ? (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Unmute Notifications
                        </>
                      ) : (
                        <>
                          <BellOff className="mr-2 h-4 w-4" />
                          Mute Notifications
                        </>
                      )}
                    </DropdownMenuItem>
                  );
                })()}
                <DropdownMenuItem
                  onClick={async () => {
                    const contact = contacts?.find((c: unknown) => (c as Record<string, unknown>).contactUserId === recipientId || (c as Record<string, unknown>).userId === recipientId);
                    if (!contact) {
                      toast({
                        title: "Error",
                        description: "Contact not found",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (confirm('Are you sure you want to block this user? You will no longer receive messages from them.')) {
                      try {
                        await blockContact.mutateAsync(contact.id);
                        toast({
                          title: "Success",
                          description: "User blocked",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to block user",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const contact = contacts?.find((c: unknown) => (c as Record<string, unknown>).contactUserId === recipientId || (c as Record<string, unknown>).userId === recipientId);
                    if (!contact) {
                      toast({
                        title: "Error",
                        description: "Contact not found",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (confirm('Are you sure you want to delete this chat? This will remove the contact and all messages.')) {
                      try {
                        await removeContact.mutateAsync(contact.id);
                        toast({
                          title: "Success",
                          description: "Chat deleted",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to delete chat",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile 3-dot menu - comprehensive with all options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Search option - enabled with mobile dialog */}
              <DropdownMenuItem onClick={() => setMobileSearchOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Search Messages
              </DropdownMenuItem>

              {/* Files & Media */}
              <DropdownMenuItem onClick={() => setShowFileGallery(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                View Files & Media
              </DropdownMenuItem>

              {/* Group-specific options */}
              {isGroup && groupId && (
                <>
                  <DropdownMenuItem onClick={() => setShowGroupInfo(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Group Info
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        // Try to mute - backend will handle if already muted
                        await muteGroup.mutateAsync(groupId);
                        sonnerToast.success('Notifications muted');
                      } catch (error: unknown) {
                        // If already muted, try to unmute
                        const err = error as { response?: { status?: number } };
                        if (err?.response?.status === 400) {
                          try {
                            await unmuteGroup.mutateAsync(groupId);
                            sonnerToast.success('Notifications enabled');
                          } catch (unmuteError) {
                            console.error('❌ Group unmute error:', unmuteError);
                            sonnerToast.error(getErrorMessage(unmuteError));
                          }
                        } else {
                          console.error('❌ Group mute error:', error);
                          sonnerToast.error(getErrorMessage(error));
                        }
                      }
                    }}
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute/Unmute Notifications
                  </DropdownMenuItem>
                </>
              )}

              {/* Direct chat options */}
              {!isGroup && recipientId && (
                (() => {
                  // Find contact once at render time
                  const contact = contacts?.find((c: unknown) => {
                    // Contact can be stored with either userId or contactUserId depending on who initiated
                    return c.contactUserId === recipientId || c.userId === recipientId;
                  });

                  return (
                    <>
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.preventDefault();

                          if (!contact) {
                            toast({
                              title: "Error",
                              description: "Contact not found. Please add this user as a contact first.",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            if (contact.isMuted) {
                              await unmuteContact.mutateAsync(contact.id);
                              toast({
                                title: "Success",
                                description: "Notifications enabled",
                              });
                            } else {
                              await muteContact.mutateAsync(contact.id);
                              toast({
                                title: "Success",
                                description: "Notifications muted",
                              });
                            }
                            // Refetch contacts to get updated mute status
                            const result = await refetchContacts();
                          } catch (error) {
                            console.error('❌ Mute/unmute error:', error);
                            toast({
                              title: "Error",
                              description: getErrorMessage(error),
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        {contact.isMuted ? (
                          <>
                            <Bell className="mr-2 h-4 w-4" />
                            Unmute Notifications
                          </>
                        ) : (
                          <>
                            <BellOff className="mr-2 h-4 w-4" />
                            Mute Notifications
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          if (!contact) {
                            toast({
                              title: "Error",
                              description: "Contact not found",
                              variant: "destructive",
                            });
                            return;
                          }

                          if (confirm('Are you sure you want to block this user?')) {
                            try {
                              await blockContact.mutateAsync(contact.id);
                              toast({
                                title: "Success",
                                description: "User blocked",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to block user",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Block User
                      </DropdownMenuItem>
                    </>
                  );
                })()
              )}

  
              {/* Leave/Delete chat option */}
              {isGroup && groupId && (
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this group?')) {
                      onGroupLeft?.();
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group
                </DropdownMenuItem>
              )}
              {!isGroup && recipientId && (
                (() => {
                  // Find contact once at render time for delete functionality
                  const contact = contacts?.find((c: unknown) => {
                    return c.contactUserId === recipientId || c.userId === recipientId;
                  });

                  return (
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!contact) {
                          toast({
                            title: "Error",
                            description: "Contact not found",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (confirm('Are you sure you want to delete this chat? This will remove the contact and all messages.')) {
                          try {
                            await removeContact.mutateAsync(contact.id);
                            toast({
                              title: "Success",
                              description: "Chat deleted",
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to delete chat",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Chat
                    </DropdownMenuItem>
                  );
                })()
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-muted/30 relative"
      >
        {isLoadingMessages ? (
          <MessageSkeleton count={6} />
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Start the conversation by sending a message"
            />
          </div>
        ) : (
          <>
            {/* Loading indicator when auto-loading */}
            {hasMoreMessages && isLoadingMore && (
              <div className="flex justify-center py-3 mb-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading older messages...
                </div>
              </div>
            )}

            {(() => {
              // Filter all file messages for navigation ONCE (not on every message render)
              const allFileMessages = messages.filter(
                msg => msg.messageType === 'file' && msg.fileId
              );

              return messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;

                return (
                <div
                  key={message.id}
                  data-message-id={message.id}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(message.id, el);

                      // Auto-scroll when last message element mounts/updates
                      if (isLastMessage && message.isOwn) {
                        const messageAge = Date.now() - message.timestamp.getTime();
                        const isRecentOwnMessage = messageAge < 5000; // 5 seconds

                        // Only scroll if this is a different message than last time
                        // This prevents scrolling on status updates (read receipts)
                        if (isRecentOwnMessage && lastScrolledMessageIdRef.current !== message.id) {
                          lastScrolledMessageIdRef.current = message.id;

                          // Use RAF to ensure layout is complete
                          requestAnimationFrame(() => {
                            const container = messagesContainerRef.current;
                            if (container) {
                              container.scrollTo({
                                top: container.scrollHeight,
                                behavior: "smooth"
                              });
                            }
                          });
                        }
                      }
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                  className={cn(
                    "transition-colors duration-300",
                    highlightedMessageId === message.id && "bg-primary/10 rounded-lg"
                  )}
                >
                  {message.messageType === 'call' ? (
                    <CallMessage
                      callId={message.callId || message.id}
                      callType={message.callType || 'voice'}
                      callStatus={message.callStatus || 'completed'}
                      callDuration={message.callDuration}
                      timestamp={message.timestamp}
                      isOwn={message.isOwn}
                      onCallBack={() => {
                        if (message.callType === 'video') {
                          handleStartCall('video');
                        } else {
                          handleStartCall('voice');
                        }
                      }}
                    />
                  ) : (
                    <MessageBubble
                      message={message}
                      currentUserId={user?.id || ''}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReplyClick={handleReplyClick}
                      onReaction={handleReaction}
                      isGroupMessage={!!groupId}
                      allImages={allFileMessages}
                    />
                  )}
                </div>
              );
              });
            })()}
          </>
        )}
        {isTyping && (
          <div className="px-4 pb-4">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />

        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            className="fixed bottom-24 right-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background">
        {editingMessage && (
          <div className="px-4 pt-3 pb-2 bg-muted/50 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary mb-1">
                  Editing message
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {editingMessage.text}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditingMessage(null);
                  setInputValue("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {replyingTo && !editingMessage && (
          <div className="px-4 pt-3 pb-2 bg-muted/50 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary mb-1">
                  Replying to {replyingTo.isOwn ? "yourself" : chatName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyingTo.text || "Image"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 safe-bottom">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFileUpload(true)}
              disabled={!recipientId && !groupId}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
              disabled={sendMessage.isPending || (!recipientId && !groupId)}
            />

            <EmojiPicker
              onEmojiSelect={(emoji) => setInputValue(prev => prev + emoji)}
            />

            <Button
              onClick={handleSend}
              size="icon"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={sendMessage.isPending || !inputValue.trim() || (!recipientId && !groupId)}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <FileUploadDialog
        open={showFileUpload}
        onOpenChange={setShowFileUpload}
        onFileUploaded={handleFileUploaded}
      />

      <FileGallery
        isOpen={showFileGallery}
        onClose={() => setShowFileGallery(false)}
        conversationId={recipientId || undefined}
        groupId={groupId || undefined}
      />

  
      {isGroup && groupId && (
        <>
          <GroupSettings
            open={showGroupSettings}
            onOpenChange={setShowGroupSettings}
            groupId={groupId}
            isAdmin={isGroupAdmin}
            isCreator={isGroupCreator}
            onGroupUpdated={() => {
              setShowGroupSettings(false);
              onGroupUpdated?.();
            }}
            onGroupDeleted={() => {
              setShowGroupSettings(false);
              onGroupLeft?.();
            }}
          />

          <GroupInfo
            open={showGroupInfo}
            onOpenChange={setShowGroupInfo}
            groupId={groupId}
            isAdmin={isGroupAdmin}
            isCreator={isGroupCreator}
            onLeaveGroup={() => {
              setShowGroupInfo(false);
              onGroupLeft?.();
            }}
          />
        </>
      )}

      {/* Outgoing Call Modal */}
      {!isGroup && recipientId && (
        <OutgoingCall
          open={showOutgoingCall}
          onOpenChange={(open) => {
            setShowOutgoingCall(open);
            // When outgoing call is dismissed (rejected, missed, etc.), refresh messages
            if (!open) {
              queryClient.invalidateQueries({ 
                queryKey: recipientId ? ['messages', recipientId] : ['groupMessages', groupId] 
              });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }
          }}
          recipientId={recipientId}
          recipientName={chatName}
          recipientAvatar={chatAvatar}
          callType={callType}
          onCallAccepted={(callId) => {
            console.log('✅ Outgoing call accepted:', callId);
            console.log('🎯 Opening ActiveCall as INITIATOR');
            setShowOutgoingCall(false);
            // Open ActiveCall dialog
            setShowActiveCall(true);
            setActiveCallData({
              callId,
              participantId: recipientId,
              participantName: chatName,
              participantAvatar: chatAvatar,
              callType,
              isInitiator: true // initiating call
            });
            console.log('✅ ActiveCall state set:', { callId, participantId: recipientId, isInitiator: true });
          }}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCallData && (
        <IncomingCall
          open={showIncomingCall}
          onOpenChange={(open) => {
            setShowIncomingCall(open);
            // When incoming call is dismissed, refresh messages
            if (!open) {
              queryClient.invalidateQueries({ 
                queryKey: recipientId ? ['messages', recipientId] : ['groupMessages', groupId] 
              });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }
          }}
          callId={incomingCallData.callId}
          callerId={incomingCallData.callerId}
          callerName={incomingCallData.callerName}
          callerAvatar={incomingCallData.callerAvatar}
          callType={incomingCallData.callType}
          onCallAccepted={(callId) => {
            console.log('✅ Call accepted:', callId);
            console.log('🎯 Opening ActiveCall as RECEIVER');
            setShowIncomingCall(false);
            // Open ActiveCall dialog
            setShowActiveCall(true);
            setActiveCallData({
              callId,
              participantId: incomingCallData.callerId,
              participantName: incomingCallData.callerName,
              participantAvatar: incomingCallData.callerAvatar,
              callType: incomingCallData.callType,
              isInitiator: false // receiving call
            });
          }}
          onCallRejected={() => {
            console.log('❌ Call rejected');
            setShowIncomingCall(false);
            setIncomingCallData(null);
            // Refresh messages to show the missed call
            queryClient.invalidateQueries({ 
              queryKey: recipientId ? ['messages', recipientId] : ['groupMessages', groupId] 
            });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }}
        />
      )}

      {/* Active Call Modal */}
      {showActiveCall && activeCallData && (
        <Suspense fallback={<InlineLoadingFallback />}>
          <ActiveCall
            open={showActiveCall}
            onOpenChange={(open) => {
              console.trace('Stack trace for onOpenChange');
              setShowActiveCall(open);
              if (!open) {
                setActiveCallData(null);
                // Refresh messages to show the call record
                queryClient.invalidateQueries({
                  queryKey: recipientId ? ['messages', recipientId] : ['groupMessages', groupId]
                });
                // Also refresh conversations to update last message
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
              }
            }}
            callId={activeCallData.callId}
            participantId={activeCallData.participantId}
          participantName={activeCallData.participantName}
          participantAvatar={activeCallData.participantAvatar}
          callType={activeCallData.callType}
          isInitiator={activeCallData.isInitiator}
          />
        </Suspense>
      )}
      {/* Mobile Search Dialog */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex"
             onClick={() => setMobileSearchOpen(false)}>
          <div className="m-4 bg-background rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Search Messages</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={recipientId ? "Search in this chat..." : "Search messages..."}
                  className="pl-10 pr-10"
                  autoFocus
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                />
                {mobileSearchLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {mobileSearchQuery.length >= 2 && (
                <div className="mt-4 max-h-96 overflow-y-auto">
                  {mobileSearchResults.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        Found {mobileSearchResults.length} result{mobileSearchResults.length !== 1 ? 's' : ''}
                      </p>
                      {mobileSearchResults.map((result: Record<string, unknown>) => (
                        <div
                          key={result.id as string}
                          onClick={() => {
                            const messageId = result.id as string;

                            // Check if the message exists in the current loaded messages
                            const messageExists = messages.some(msg => msg.id === messageId);
                            console.log('✅ Message exists in current messages:', messageExists);

                            if (messageExists) {
                              handleReplyClick(messageId);
                              setMobileSearchOpen(false);
                              setMobileSearchQuery('');
                            } else {
                              // Message not found, show user-friendly error
                              toast({
                                title: "Message not available",
                                description: "This message is not in the currently loaded conversation. Try loading more messages.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                              {((result.sender as Record<string, unknown>)?.firstName as string)?.[0]?.toUpperCase() ||
                               ((result.sender as Record<string, unknown>)?.username as string)?.[0]?.toUpperCase() ||
                               '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {((result.sender as Record<string, unknown>)?.firstName as string) ||
                                   ((result.sender as Record<string, unknown>)?.username as string)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(result.createdAt as string).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {result.content as string}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !mobileSearchLoading ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No messages found matching "{mobileSearchQuery}"
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {mobileSearchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
