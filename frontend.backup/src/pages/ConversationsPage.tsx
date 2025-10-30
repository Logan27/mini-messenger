import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMessageStore } from '@/app/stores/messageStore';
import { useAuthStore } from '@/app/stores/authStore';
import { cn } from '@/lib/utils';
import { Search, Edit, MoreVertical, Users } from 'lucide-react';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import { api } from '@/shared/api';

export function ConversationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const { conversations, isLoading, error, loadConversations } = useMessageStore();
  const { user } = useAuthStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    // Load available users for group creation
    loadAvailableUsers();
  }, [loadConversations]);

  // Load available users for group creation
  const loadAvailableUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: { limit: 100 }
      });
      const users = response.data.data?.users || [];
      // Filter out current user
      setAvailableUsers(users.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Filter out current user from conversations
  const filteredByUser = conversations.filter(chat => chat.id !== user?.id);

  // Filter conversations based on search query
  const filteredConversations = filteredByUser.filter(chat => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();

    // For direct messages, search in participant names
    if (chat.type === 'direct' && chat.participants.length > 0) {
      const participant = chat.participants[0];
      return participant?.name?.toLowerCase().includes(searchLower) ||
             participant?.username?.toLowerCase().includes(searchLower);
    }

    // For group chats, search in group name
    return chat.name?.toLowerCase().includes(searchLower);
  });

  // Sort: by last message timestamp
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.updatedAt;
    const bTime = b.lastMessage?.createdAt || b.updatedAt;

    const aDate = new Date(aTime);
    const bDate = new Date(bTime);

    return bDate.getTime() - aDate.getTime();
  });

  const handleChatSelect = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  const handleGroupCreated = (group: any) => {
    // Navigate to the newly created group
    navigate(`/chat/${group.id}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col h-screen">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Create Group</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-muted border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 text-center text-destructive">
              {error}
            </div>
          )}

          {isLoading && conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            sortedConversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border",
                  "hover:bg-chat-hover"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.participants?.[0]?.avatar} alt={chat.name} />
                    <AvatarFallback>{chat.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  {chat.participants?.[0]?.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {chat.lastMessage?.createdAt ? formatTime(chat.lastMessage.createdAt) :
                       chat.updatedAt ? formatTime(chat.updatedAt) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>

                {chat.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 px-1.5 text-xs">
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">Select a chat to start messaging</p>
          <p className="text-muted-foreground text-sm">Choose a conversation from the list</p>
        </div>
      </div>

      {/* Create Group Modal */}
      {user && (
        <CreateGroupModal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          onGroupCreated={handleGroupCreated}
          availableUsers={availableUsers}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
