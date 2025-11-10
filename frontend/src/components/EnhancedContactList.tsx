import { useState, useMemo } from 'react';
import {
  Search,
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  UserMinus,
  UserX,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

export interface Contact {
  id: string;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  avatar?: string;
  status?: string;
  isOnline?: boolean;
  lastSeen?: string;
  isMuted?: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

interface EnhancedContactListProps {
  contacts: Contact[];
  onContactClick?: (contact: Contact) => void;
  onStartChat?: (contactId: string) => void;
  onStartCall?: (contactId: string, callType: 'voice' | 'video') => void;
  onRefresh?: () => void;
  className?: string;
}

const formatLastSeen = (lastSeen?: string): string => {
  if (!lastSeen) return 'Never';

  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return lastSeenDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getFullName = (contact: Contact): string => {
  if (contact.nickname) return contact.nickname;
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`;
  }
  if (contact.firstName) return contact.firstName;
  return contact.username;
};

interface ContactItemProps {
  contact: Contact;
  onClick?: () => void;
  onStartChat?: () => void;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  onRemove?: () => void;
  onBlock?: () => void;
}

const ContactItem = ({
  contact,
  onClick,
  onStartChat,
  onStartCall,
  onStartVideoCall,
  onRemove,
  onBlock,
}: ContactItemProps) => {
  const fullName = getFullName(contact);
  const isOnline = contact.isOnline || contact.status === 'online';

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group',
        contact.isMuted && 'opacity-60'
      )}
    >
      <div
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={onClick}
      >
        {/* Avatar with Status */}
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={contact.avatar} alt={fullName} />
            <AvatarFallback>
              {fullName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>

        {/* Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{fullName}</span>
            {contact.isBlocked && (
              <Badge variant="destructive" className="text-xs">
                Blocked
              </Badge>
            )}
            {contact.isMuted && (
              <Badge variant="secondary" className="text-xs">
                Muted
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {isOnline ? (
              <span className="text-green-600">Online</span>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>{formatLastSeen(contact.lastSeen)}</span>
              </>
            )}
          </div>
          {contact.username !== fullName && (
            <div className="text-xs text-muted-foreground">@{contact.username}</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onStartChat?.();
          }}
          title="Start chat"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onStartCall?.();
          }}
          title="Start voice call"
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onStartVideoCall?.();
          }}
          title="Start video call"
        >
          <Video className="h-4 w-4" />
        </Button>

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStartChat}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Send Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStartCall}>
              <Phone className="mr-2 h-4 w-4" />
              Voice Call
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStartVideoCall}>
              <Video className="mr-2 h-4 w-4" />
              Video Call
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBlock} className="text-yellow-600">
              <UserX className="mr-2 h-4 w-4" />
              {contact.isBlocked ? 'Unblock' : 'Block'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const EnhancedContactList = ({
  contacts,
  onContactClick,
  onStartChat,
  onStartCall,
  onRefresh,
  className,
}: EnhancedContactListProps) => {
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'offline'>('all');
  const [removingContact, setRemovingContact] = useState<Contact | null>(null);
  const [blockingContact, setBlockingContact] = useState<Contact | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter and sort contacts (search is handled by parent component)
  const { onlineContacts, offlineContacts, filteredContacts } = useMemo(() => {
    // Sort alphabetically by display name
    const sorted = [...contacts].sort((a, b) => {
      const nameA = getFullName(a).toLowerCase();
      const nameB = getFullName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Separate online and offline
    const online = sorted.filter(
      (c) => c.isOnline || c.status === 'online'
    );
    const offline = sorted.filter(
      (c) => !c.isOnline && c.status !== 'online'
    );

    // Apply tab filter
    let tabFiltered = sorted;
    if (activeTab === 'online') tabFiltered = online;
    if (activeTab === 'offline') tabFiltered = offline;

    return {
      onlineContacts: online,
      offlineContacts: offline,
      filteredContacts: tabFiltered,
    };
  }, [contacts, activeTab]);

  const handleRemoveContact = async () => {
    if (!removingContact) return;

    setIsActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      await axios.delete(`${apiUrl}/contacts/${removingContact.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`${getFullName(removingContact)} removed from contacts`);
      setRemovingContact(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove contact');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBlockContact = async () => {
    if (!blockingContact) return;

    setIsActionLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const endpoint = blockingContact.isBlocked ? 'unblock' : 'block';
      await axios.post(
        `${apiUrl}/contacts/${blockingContact.id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const action = blockingContact.isBlocked ? 'unblocked' : 'blocked';
      toast.success(`${getFullName(blockingContact)} ${action}`);
      setBlockingContact(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update contact');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartChat = (contactId: string) => {
    onStartChat?.(contactId);
  };

  return (
    <>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Tabs */}
        <div className="p-4 pb-2 border-b">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'online' | 'offline')}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all">
                All ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="online">
                Online ({onlineContacts.length})
              </TabsTrigger>
              <TabsTrigger value="offline">
                Offline ({offlineContacts.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contact List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  {activeTab === 'online' ? (
                    'No contacts are currently online'
                  ) : activeTab === 'offline' ? (
                    'No offline contacts'
                  ) : contacts.length === 0 ? (
                    'No contacts yet'
                  ) : (
                    'No contacts match your search'
                  )}
                </div>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  onClick={() => onContactClick?.(contact)}
                  onStartChat={() => handleStartChat(contact.userId)}
                  onStartCall={() => {
                    if (onStartCall) {
                      onStartCall(contact.userId, 'voice');
                    } else {
                      toast.info('Voice calls are not yet set up');
                    }
                  }}
                  onStartVideoCall={() => {
                    if (onStartCall) {
                      onStartCall(contact.userId, 'video');
                    } else {
                      toast.info('Video calls are not yet set up');
                    }
                  }}
                  onRemove={() => setRemovingContact(contact)}
                  onBlock={() => setBlockingContact(contact)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Remove Contact Confirmation */}
      <AlertDialog
        open={!!removingContact}
        onOpenChange={() => setRemovingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{removingContact && getFullName(removingContact)}</strong>{' '}
              from your contacts? You can always add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveContact}
              disabled={isActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isActionLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block/Unblock Contact Confirmation */}
      <AlertDialog
        open={!!blockingContact}
        onOpenChange={() => setBlockingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockingContact?.isBlocked ? 'Unblock' : 'Block'} Contact
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockingContact?.isBlocked ? (
                <>
                  Are you sure you want to unblock{' '}
                  <strong>{blockingContact && getFullName(blockingContact)}</strong>?
                  They will be able to send you messages again.
                </>
              ) : (
                <>
                  Are you sure you want to block{' '}
                  <strong>{blockingContact && getFullName(blockingContact)}</strong>?
                  They won't be able to send you messages or call you.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockContact}
              disabled={isActionLoading}
              className={
                blockingContact?.isBlocked
                  ? ''
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }
            >
              {isActionLoading
                ? blockingContact?.isBlocked
                  ? 'Unblocking...'
                  : 'Blocking...'
                : blockingContact?.isBlocked
                ? 'Unblock'
                : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
