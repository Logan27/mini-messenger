import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatList } from "@/components/ChatList";
import { ChatView } from "@/components/ChatView";
import { ChatListSkeleton } from "@/components/SkeletonLoaders";
import EmptyState from "@/components/EmptyState";
import ReconnectingIndicator from "@/components/ReconnectingIndicator";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useMessageListener, useReadReceiptListener, useUserStatusListener, useGroupListener, useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { safeParseDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import type { Chat } from "@/types/chat";

const Index = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChat = chatId || null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Fetch contacts from API
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts('accepted');

  // Fetch conversations with unread counts
  const { data: conversationsData } = useConversations();

  // Determine if active chat is a group to pass correct ID to useMessages
  const isActiveGroup = conversationsData?.some((conv) => 
    conv.type === 'group' && conv.group?.id === activeChat
  );

  // Fetch messages for active chat with pagination
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useMessages({
    recipientId: isActiveGroup ? undefined : (activeChat || undefined),
    groupId: isActiveGroup ? activeChat : undefined,
    limit: 20, // Load only 20 messages initially (one page)
  });

  // Listen for real-time updates and get connection status
  useMessageListener(activeChat || undefined);
  useReadReceiptListener();
  useUserStatusListener();
  useGroupListener();
  const { isConnected, isReconnecting, onTyping } = useSocket();

  // Listen for typing indicators globally to update chat list
  useEffect(() => {
    const unsubscribe = onTyping((data: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));
    });

    return () => unsubscribe();
  }, [onTyping]);

  // Transform contacts to Chat format with unread counts from conversations
  // Create a map of userId/groupId -> conversation data for quick lookup
  const conversationMap = new Map(
    conversationsData?.map((conv) => [
      conv.type === 'direct' ? conv.user?.id : conv.group?.id,
      conv
    ]) || []
  );

  // Build chats from direct contacts
  const directChats: Chat[] = (contactsData?.map((contact: unknown) => {
    const userId = contact.user.id;
    const conversation = conversationMap.get(userId);

    return {
      id: userId,
      name: contact.nickname || contact.user.username,
      avatar: getAvatarUrl(contact.user.profilePicture || contact.user.avatar),
      lastMessage: conversation?.lastMessage?.content || "",
      timestamp: safeParseDate(conversation?.lastMessageAt) || new Date(0),
      unreadCount: conversation?.unreadCount || 0,
      isOnline: contact.user.onlineStatus === 'online',
      lastSeen: safeParseDate(contact.user.lastSeen) || undefined,
      isTyping: typingUsers[userId] || false,
      isMuted: conversation?.isMuted || false,
    };
  }) || []);

  // Build chats from group conversations
  const groupChats: Chat[] = (conversationsData
    ?.filter((conv) => conv.type === 'group' && conv.group)
    .map((conv) => {
      const group = conv.group!;
      return {
        id: group.id,
        name: group.name,
        avatar: getAvatarUrl(group.avatar),
        lastMessage: conv.lastMessage?.content || "",
        timestamp: safeParseDate(conv.lastMessageAt) || new Date(0),
        unreadCount: conv.unreadCount || 0,
        isOnline: false, // Groups don't have online status
        lastSeen: undefined,
        isTyping: false, // TODO: Add group typing indicators
        isMuted: conv.isMuted || false,
      };
    }) || []);

  // OPTIMIZATION: Memoize chat list sorting to avoid recalculating on every render
  const chats: Chat[] = useMemo(() => {
    return [...directChats, ...groupChats].sort((a, b) => {
      // If both have messages, sort by timestamp (newest first)
      if (a.timestamp.getTime() !== 0 && b.timestamp.getTime() !== 0) {
        return b.timestamp.getTime() - a.timestamp.getTime();
      }
      // If only one has messages, put it first
      if (a.timestamp.getTime() !== 0) return -1;
      if (b.timestamp.getTime() !== 0) return 1;
      // If neither has messages, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [directChats, groupChats]);

  // OPTIMIZATION: Memoize message transformation and reversal to avoid recalculating on every render
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];

    // Backend returns newest first (DESC), reverse to show oldest-to-newest in chat
    return messagesData.pages.flatMap(page =>
      page.map((msg: unknown) => ({
        id: msg.id,
        senderId: msg.senderId, // IMPORTANT: Store senderId so isOwn filter works correctly
        text: msg.text || msg.content, // Handle both formats (optimistic has content, transformed has text)
        timestamp: msg.timestamp || new Date(msg.createdAt),
        isOwn: msg.senderId === user?.id,
        status: msg.status, // 'sent', 'delivered', 'read', 'failed'
        imageUrl: msg.messageType === 'image' ? msg.fileName : undefined,
        messageType: msg.messageType,
        reactions: msg.reactions || {},
        // File attachment fields
        fileId: msg.fileId || msg.metadata?.fileId,
        fileName: msg.fileName || msg.metadata?.fileName,
        fileUrl: msg.fileUrl || msg.metadata?.fileUrl,
        fileSize: msg.fileSize || msg.metadata?.fileSize,
        mimeType: msg.mimeType || msg.metadata?.mimeType,
        // Call message fields
        callId: msg.metadata?.callId,
        callType: msg.metadata?.callType,
        callStatus: msg.metadata?.callStatus,
        callDuration: msg.metadata?.callDuration,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          text: msg.replyTo.content || (msg.replyTo.messageType !== 'text' ? `[${msg.replyTo.messageType}]` : ''),
          senderName: msg.replyTo.sender
            ? `${msg.replyTo.sender.firstName || ''} ${msg.replyTo.sender.lastName || ''}`.trim() || msg.replyTo.sender.username
            : 'Unknown',
        } : undefined,
      }))
    ).reverse();
  }, [messagesData?.pages, user?.id]);

  const activeChatData = chats.find((chat) => chat.id === activeChat);

  // Handler for chat selection
  const handleChatSelect = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      // Alt+1-9: Switch between chats
      ...Array.from({ length: 9 }, (_, i) => ({
        key: String(i + 1),
        alt: true,
        description: `Chat: Switch to chat ${i + 1}`,
        action: () => {
          if (chats[i]) {
            navigate(`/chat/${chats[i].id}`);
          }
        },
        enabled: chats.length > i,
      })),
      // Ctrl+Shift+S: Open settings
      {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Navigation: Open settings',
        action: () => navigate('/settings'),
      },
      // Escape: Close active chat
      {
        key: 'Escape',
        description: 'Navigation: Close chat',
        action: () => {
          if (activeChat) {
            navigate('/');
          }
        },
        enabled: !!activeChat,
      },
    ],
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ReconnectingIndicator isConnected={isConnected} isReconnecting={isReconnecting} />

      {/* ChatList - hidden on mobile when a chat is active */}
      {isLoadingContacts ? (
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border",
          activeChat && "hidden md:block"
        )}>
          <ChatListSkeleton count={8} />
        </div>
      ) : (
        <div className={cn(
          "w-full md:w-80 lg:w-96",
          activeChat && "hidden md:block"
        )}>
          <ChatList
            chats={chats}
            activeChat={activeChat}
            onChatSelect={handleChatSelect}
          />
        </div>
      )}

      {/* ChatView - full width on mobile, flex-1 on desktop */}
      {activeChatData ? (
        <div className={cn(
          "flex-1",
          activeChat && "w-full"
        )}>
          <ChatView
            chatName={activeChatData.name}
            chatAvatar={activeChatData.avatar}
            isOnline={activeChatData.isOnline}
            messages={messages}
            recipientId={groupChats.some(g => g.id === activeChat) ? undefined : activeChat}
            groupId={groupChats.some(g => g.id === activeChat) ? activeChat : undefined}
            isGroup={groupChats.some(g => g.id === activeChat)}
            isGroupAdmin={activeChatData.userRole === 'admin'}
            isGroupCreator={activeChatData.creatorId === user?.id}
            isLoadingMessages={isLoadingMessages}
            hasMoreMessages={hasNextPage}
            onLoadMore={fetchNextPage}
            isLoadingMore={isFetchingNextPage}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={MessageSquare}
            title="Select a chat to start messaging"
            description="Choose a conversation from the sidebar to begin chatting"
          />
        </div>
      )}
    </div>
  );
};

export default Index;
