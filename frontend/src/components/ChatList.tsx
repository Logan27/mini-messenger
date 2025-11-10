import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Chat } from "@/types/chat";
import { ChatListItem } from "./ChatListItem";
import { AddContactDialog } from "./AddContactDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { MainMenu } from "./MainMenu";
import { EnhancedContactList, Contact } from "./EnhancedContactList";
import { PendingContactRequests } from "./PendingContactRequests";
import EmptyState from "./EmptyState";
import KeyboardShortcutsHelp, { HelpButton } from "./KeyboardShortcutsHelp";
import { allShortcuts } from "@/config/keyboardShortcuts";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Users, MessageSquare, UserCircle } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { contactService } from "@/services/contact.service";
import { groupService } from "@/services/group.service";
import { useToast } from "@/hooks/use-toast";

interface ChatListProps {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
}

export const ChatList = ({ chats, activeChat, onChatSelect }: ChatListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  
  // Fetch contacts
  const { data: contactsData, refetch: refetchContacts } = useContacts('accepted');
  
  // Fetch pending contact requests for badge count
  const { data: pendingRequestsData } = useContacts('pending');
  const pendingRequestsCount = pendingRequestsData?.length || 0;
  
  // Map contacts for group creation
  const contactsForGroupCreation = contactsData?.map((contact: unknown) => ({
    id: contact.user.id,
    username: contact.nickname || contact.user.username,
    firstName: contact.user.firstName,
    lastName: contact.user.lastName,
    avatar: getAvatarUrl(contact.user.avatar || contact.user.profilePicture),
    online: contact.user.onlineStatus === 'online',
  })) || [];
  
  // Map contacts for enhanced contact list
  const enhancedContacts: Contact[] = contactsData?.map((contact: unknown) => ({
    id: contact.id,
    userId: contact.user.id,
    username: contact.user.username,
    firstName: contact.user.firstName,
    lastName: contact.user.lastName,
    nickname: contact.nickname,
    avatar: getAvatarUrl(contact.user.avatar || contact.user.profilePicture),
    status: contact.user.onlineStatus,
    isOnline: contact.user.onlineStatus === 'online',
    lastSeen: contact.user.lastSeen,
    isMuted: contact.isMuted,
    isBlocked: contact.status === 'blocked',
    createdAt: contact.createdAt,
  })) || [];
  
  const handleGroupCreated = (groupId: string) => {
    // Navigate to the new group chat and switch to chats tab
    setActiveTab('chats');
    onChatSelect(groupId);
  };

  const handleContactClick = (contact: Contact) => {
    // Start a chat with the contact
    setActiveTab('chats');
    onChatSelect(contact.userId);
  };

  const handleStartChat = (contactId: string) => {
    // Start a chat with the contact
    setActiveTab('chats');
    onChatSelect(contactId);
  };

  const handleStartCall = (contactId: string, callType: 'voice' | 'video') => {
    // Navigate to chat and initiate call
    setActiveTab('chats');
    onChatSelect(contactId);
    // The call will be initiated from the chat view
    // Store the pending call in sessionStorage so ChatView can pick it up
    sessionStorage.setItem('pendingCall', JSON.stringify({ contactId, callType }));
  };

  const handleMuteToggle = async (chatId: string, isMuted: boolean) => {
    if (chatId.startsWith('group-')) {
      // Group chat mute/unmute
      try {
        if (isMuted) {
          await groupService.unmuteGroup(chatId);
          toast({
            title: "Group unmuted",
            description: "You will now receive notifications from this group",
          });
        } else {
          await groupService.muteGroup(chatId);
          toast({
            title: "Group muted",
            description: "You won't receive notifications from this group",
          });
        }
        // Refresh conversations to update UI
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (error) {
        console.error('Failed to toggle group mute:', error);
        toast({
          title: "Error",
          description: "Failed to update notification settings",
          variant: "destructive",
        });
      }
    } else {
      // 1-to-1 chat mute/unmute
      const contact = contactsData?.find((c: unknown) => (c as Record<string, unknown>).user?.id === chatId);
      if (contact) {
        try {
          if (isMuted) {
            await contactService.unmuteContact(contact.id);
            toast({
              title: "Contact unmuted",
              description: "You will now receive notifications from this contact",
            });
          } else {
            await contactService.muteContact(contact.id);
            toast({
              title: "Contact muted",
              description: "You won't receive notifications from this contact",
            });
          }
          // Refresh both contacts and conversations to update UI
          await Promise.all([
            refetchContacts(),
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          ]);
        } catch (error) {
          console.error('Failed to toggle contact mute:', error);
          toast({
            title: "Error",
            description: "Failed to update notification settings",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleDelete = async (chatId: string) => {
    // For 1-to-1 chats, we need to find the contact ID first
    // For group chats, delete using group ID
    if (chatId.startsWith('group-')) {
      // Group chat deletion
      try {
        await groupService.deleteGroup(chatId);
        toast({
          title: "Group deleted",
          description: "The group has been permanently deleted",
        });
        // If we're currently viewing this chat, navigate away
        if (activeChat === chatId) {
          onChatSelect('');
        }
        // Refresh conversations
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (error) {
        console.error('Failed to delete group:', error);
        toast({
          title: "Error",
          description: "Failed to delete group. You must be the creator to delete it.",
          variant: "destructive",
        });
      }
    } else {
      // Find contact by user ID and remove
      const contact = contactsData?.find((c: unknown) => (c as Record<string, unknown>).user?.id === chatId);
      if (contact) {
        try {
          await contactService.removeContact(contact.id);
          toast({
            title: "Chat deleted",
            description: "The conversation has been removed",
          });
          // If we're currently viewing this chat, navigate away
          if (activeChat === chatId) {
            onChatSelect('');
          }
          // Refresh both contacts and conversations
          await Promise.all([
            refetchContacts(),
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          ]);
        } catch (error) {
          console.error('Failed to remove contact:', error);
          toast({
            title: "Error",
            description: "Failed to delete chat",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleBlock = async (chatId: string) => {
    // Find contact by user ID and block
    const contact = contactsData?.find((c: unknown) => (c as Record<string, unknown>).user?.id === chatId);
    if (contact) {
      try {
        await contactService.blockContact(contact.id);
        toast({
          title: "User blocked",
          description: "You have blocked this contact",
        });
        // If we're currently viewing this chat, navigate away
        if (activeChat === chatId) {
          onChatSelect('');
        }
        // Refresh both contacts and conversations
        await Promise.all([
          refetchContacts(),
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        ]);
      } catch (error) {
        console.error('Failed to block contact:', error);
        toast({
          title: "Error",
          description: "Failed to block user",
          variant: "destructive",
        });
      }
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = enhancedContacts.filter(contact =>
    (contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-sidebar-border flex flex-col h-screen bg-sidebar-background">
      <div className="p-4 border-b border-sidebar-border space-y-3 bg-card shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MainMenu />
            <h1 className="text-xl font-bold text-sidebar-foreground">Messages</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateGroup(true)}
              title="New Group"
              className="hover:bg-sidebar-accent"
            >
              <Users className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddContact(true)}
              title="Add Contact"
              className="hover:bg-sidebar-accent"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Main Tabs - Chats vs Contacts */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats' | 'contacts')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2 relative">
              <UserCircle className="h-4 w-4" />
              Contacts
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'chats' ? "Search chats..." : "Search contacts..."}
            className="pl-9 bg-muted border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        contacts={contactsForGroupCreation}
        onGroupCreated={handleGroupCreated}
      />

      <KeyboardShortcutsHelp shortcuts={allShortcuts} />
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chats' ? (
          <div className="h-full overflow-y-auto">
            {filteredChats.length === 0 ? (
              searchQuery ? (
                <EmptyState
                  icon={Search}
                  title="No chats found"
                  description={`No conversations match "${searchQuery}"`}
                  className="h-full"
                />
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations yet"
                  description="Start chatting by adding a contact or creating a group"
                  actionLabel="Add Contact"
                  onAction={() => setShowAddContact(true)}
                  className="h-full"
                />
              )
            ) : (
              filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChat === chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  onStartCall={handleStartCall}
                  onMuteToggle={handleMuteToggle}
                  onDelete={handleDelete}
                  onBlock={handleBlock}
                />
              ))
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {/* Show pending contact requests at the top */}
            <PendingContactRequests />
            
            {/* Contact list */}
            <EnhancedContactList
              contacts={filteredContacts}
              onContactClick={handleContactClick}
              onStartChat={handleStartChat}
              onStartCall={handleStartCall}
              onRefresh={refetchContacts}
            />
          </div>
        )}
      </div>
    </div>
  );
};
