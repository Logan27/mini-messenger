import { useState, useRef, useEffect, useReducer, lazy, Suspense } from "react";
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
import { Send, MoreVertical, Phone, Video, ArrowDown, X, Paperclip, Smile, MessageSquare, FolderOpen, Settings, Users, Info, Loader2, LogOut, Bell, BellOff, UserPlus, UserX, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { useAddReaction } from "@/hooks/useReactions";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { useMuteContact, useUnmuteContact, useBlockContact, useRemoveContact, useContacts } from "@/hooks/useContacts";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/services/socket.service";
import { toast as sonnerToast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuth } from "@/contexts/AuthContext";

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

  const { user } = useAuth();
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const addReaction = useAddReaction();
  const { sendTyping, onTyping, isConnected } = useSocket();
  const { toast } = useToast();
  const muteContact = useMuteContact();
  const unmuteContact = useUnmuteContact();
  const blockContact = useBlockContact();
  const removeContact = useRemoveContact();
  const { data: contacts, refetch: refetchContacts } = useContacts('accepted');
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
      // Check if scrolled near top (within 100px)
      const isNearTop = scrollTop < 100;

      if (isNearTop && !isLoading) {
        isLoading = true;
        previousScrollHeight = scrollHeight;
        previousScrollTop = scrollTop;
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

    // Give the DOM time to update
    const timer = setTimeout(() => {
      const firstMessage = container.querySelector('[data-message-id]');
      if (firstMessage) {
        firstMessage.scrollIntoView({ block: 'start' });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isLoadingMore]);

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
            console.log('📞 Initiating pending call:', pendingCall.callType);
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
    isInitialLoadRef.current = true;
    previousMessageCountRef.current = 0;
  }, [recipientId, groupId]);

  // Smart scroll: only scroll to bottom for new messages, not on initial load or when loading history
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    // First load: always scroll to bottom (don't restore scroll position)
    if (isInitialLoadRef.current && currentMessageCount > 0) {
      // Use requestAnimationFrame to ensure DOM is painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          isInitialLoadRef.current = false;
        });
      });

      previousMessageCountRef.current = currentMessageCount;
      return;
    }

    // New message arrived (count increased)
    if (currentMessageCount > previousMessageCount && !isInitialLoadRef.current) {
      // Get the latest message to check if it's from the current user
      const latestMessage = messages[messages.length - 1];
      const isOwnMessage = latestMessage?.isOwn;

      // Use requestAnimationFrame to ensure DOM has updated before checking scroll position
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

        // Always scroll for own messages, or scroll if user was already near bottom
        if (isOwnMessage || isNearBottom) {
          requestAnimationFrame(() => {
            scrollToBottom();
          });
        }
      });
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, recipientId, groupId]);

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
    const handleIncomingCall = (data: any) => {
      console.log('📞 Incoming call received:', data);
      
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
  // Add delay to ensure user actually sees the messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    // Only mark as read if component is actually mounted and visible
    if (!isMountedRef.current) {
      console.log('⏸️ Skipping mark as read - component not visible');
      return;
    }

    // Only mark as read if WebSocket is connected
    if (!isConnected) {
      console.log('⏳ Skipping mark as read - socket not connected yet');
      return;
    }

    // Delay marking as read to ensure messages are actually visible
    // This prevents immediate marking when switching chats
    const markAsReadTimer = setTimeout(() => {
      // Double-check component is still mounted before marking
      if (!isMountedRef.current) {
        console.log('⏸️ Aborting mark as read - component unmounted during delay');
        return;
      }

      // Mark all unread messages from the other person as read
      // Filter out temporary optimistic messages (IDs starting with "temp-")
      // AND filter out messages we've already marked as read
      const unreadMessages = messages.filter(
        msg => !msg.isOwn && 
               msg.status !== 'read' && 
               !msg.id.startsWith('temp-') &&
               !markedAsReadRef.current.has(msg.id)
      );

      if (unreadMessages.length > 0) {
        console.log(`📖 Marking ${unreadMessages.length} messages as read after 1s delay`);
        // Mark each message as read via WebSocket
        unreadMessages.forEach(msg => {
          socketService.markAsRead(msg.id);
          // Track that we've marked this message
          markedAsReadRef.current.add(msg.id);
        });
        
        // Invalidate conversations to update unread count in sidebar
        setTimeout(() => {
          console.log('📖 Refetching conversations after marking messages as read');
          queryClient.refetchQueries({ queryKey: ['conversations'] });
        }, 500); // Small delay to ensure backend has processed
      }
    }, 1000); // Wait 1 second before marking as read

    return () => clearTimeout(markAsReadTimer);
  }, [messages, isConnected, queryClient]);

  const handleSend = async () => {
    console.log('🔵 handleSend called', {
      inputValue,
      trimmed: inputValue.trim(),
      recipientId,
      groupId,
      isGroup,
      hasInput: !!inputValue.trim(),
      hasRecipient: !!recipientId,
      hasGroupId: !!groupId
    });

    if (!inputValue.trim() || (!recipientId && !groupId)) {
      console.log('⚠️ Early return - missing input or chat target');
      return;
    }

    try {
      if (editingMessage) {
        // Edit existing message
        console.log('✏️ Editing message:', editingMessage.id);
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
        // Send new message
        const messageData = isGroup
          ? { groupId, content: inputValue.trim(), replyToId: replyingTo?.id }
          : { recipientId, content: inputValue.trim(), replyToId: replyingTo?.id };

        console.log('📤 Sending NEW message:', messageData);
        await sendMessage.mutateAsync(messageData);
        console.log('✅ Message sent successfully');

        setReplyingTo(null);

        // Multiple scroll attempts to handle DOM updates
        setTimeout(() => scrollToBottom(), 50);
        setTimeout(() => scrollToBottom(), 150);
        setTimeout(() => scrollToBottom(), 300);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add reaction",
        description: getErrorMessage(error),
      });
    }
  };

  const handleFileUploaded = async (fileData: any) => {
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

      toast({
        title: "File sent",
        description: "File has been sent successfully",
      });
    } catch (error: any) {
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
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
          
          {/* Group-specific menu */}
          {isGroup && groupId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
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
                  onClick={() => {
                    const mutedChats = JSON.parse(localStorage.getItem('mutedChats') || '[]');
                    const isMuted = mutedChats.includes(groupId);
                    
                    if (isMuted) {
                      // Unmute
                      const updated = mutedChats.filter((id: string) => id !== groupId);
                      localStorage.setItem('mutedChats', JSON.stringify(updated));
                      sonnerToast.success('Notifications enabled');
                    } else {
                      // Mute
                      mutedChats.push(groupId);
                      localStorage.setItem('mutedChats', JSON.stringify(mutedChats));
                      sonnerToast.success('Notifications muted');
                    }
                    
                    // Force re-render
                    forceUpdate();
                  }}
                >
                  <BellOff className="mr-2 h-4 w-4" />
                  {JSON.parse(localStorage.getItem('mutedChats') || '[]').includes(groupId) ? 'Unmute' : 'Mute'} Notifications
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
          
          {/* Direct chat menu */}
          {!isGroup && recipientId && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(() => {
                  // Find contact once at render time
                  const contact = contacts?.find((c: any) => {
                    // Contact can be stored with either userId or contactUserId depending on who initiated
                    return c.contactUserId === recipientId || c.userId === recipientId;
                  });
                  
                  return (
                    <DropdownMenuItem 
                      onClick={async (e) => {
                        e.preventDefault();
                        
                        console.log('🔍 Contact before mute/unmute:', contact);
                        
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
                            console.log('🔇 Unmuting contact:', contact.id);
                            await unmuteContact.mutateAsync(contact.id);
                            toast({
                              title: "Success",
                              description: "Notifications enabled",
                            });
                          } else {
                            console.log('🔕 Muting contact:', contact.id);
                            await muteContact.mutateAsync(contact.id);
                            toast({
                              title: "Success",
                              description: "Notifications muted",
                            });
                          }
                          // Refetch contacts to get updated mute status
                          const result = await refetchContacts();
                          console.log('🔄 Refetched contacts:', result.data);
                          const updatedContact = result.data?.find((c: any) => c.id === contact.id);
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
                    const contact = contacts?.find((c: any) => c.contactUserId === recipientId || c.userId === recipientId);
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
                    const contact = contacts?.find((c: any) => c.contactUserId === recipientId || c.userId === recipientId);
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

            {messages.map((message) => (
              <div
                key={message.id}
                data-message-id={message.id}
                ref={(el) => {
                  if (el) {
                    messageRefs.current.set(message.id, el);
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
                  />
                )}
              </div>
            ))}
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
        
        <div className="p-4">
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
              console.log('📞 Outgoing call dismissed, refreshing messages');
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
              console.log('📞 Incoming call dismissed, refreshing messages');
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
              console.log(`🔔 ChatView: ActiveCall onOpenChange called with open=${open}`);
              console.trace('Stack trace for onOpenChange');
              setShowActiveCall(open);
              if (!open) {
                console.log('🔔 ChatView: Clearing activeCallData and refreshing messages');
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
    </div>
  );
};
