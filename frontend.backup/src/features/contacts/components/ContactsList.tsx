import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  MessageCircle,
  Phone,
  Video,
  UserMinus,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Contact, User } from '@/shared/lib/types'

interface ContactsListProps {
  contacts: Contact[]
  currentUserId: string
  onContactClick?: (contact: Contact) => void
  onStartDM?: (contact: Contact) => void
  onStartCall?: (contact: Contact) => void
  onStartVideoCall?: (contact: Contact) => void
  onRemoveContact?: (contact: Contact) => void
  onToggleMute?: (contact: Contact) => void
  onViewProfile?: (contact: Contact) => void
  className?: string
}

const formatLastSeen = (lastSeen: string): string => {
  const now = new Date()
  const lastSeenDate = new Date(lastSeen)
  const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return lastSeenDate.toLocaleDateString()
}

const ContactItem: React.FC<{
  contact: Contact
  onClick?: () => void
  onStartDM?: () => void
  onStartCall?: () => void
  onStartVideoCall?: () => void
  onRemove?: () => void
  onToggleMute?: () => void
  onViewProfile?: () => void
}> = ({
  contact,
  onClick,
  onStartDM,
  onStartCall,
  onStartVideoCall,
  onRemove,
  onToggleMute,
  onViewProfile
}) => {
  const user = contact.contactUser || contact.user
  if (!user) return null

  const isOnline = contact.isOnline || false
  const lastSeen = contact.lastSeen

  return (
    <div
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors group',
        contact.isMuted && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Avatar with Status */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background',
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {contact.nickname || user.name}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {isOnline ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Online
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {lastSeen ? formatLastSeen(lastSeen) : 'Offline'}
                </p>
              )}
              {contact.category && (
                <Badge variant="outline" className="text-xs">
                  {contact.category}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onStartDM && (
                <DropdownMenuItem onClick={onStartDM}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
              )}
              {onStartCall && (
                <DropdownMenuItem onClick={onStartCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Voice Call
                </DropdownMenuItem>
              )}
              {onStartVideoCall && (
                <DropdownMenuItem onClick={onStartVideoCall}>
                  <Video className="h-4 w-4 mr-2" />
                  Video Call
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onViewProfile && (
                <DropdownMenuItem onClick={onViewProfile}>
                  <Settings className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              )}
              {onToggleMute && (
                <DropdownMenuItem onClick={onToggleMute}>
                  {contact.isMuted ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Mute
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Contact
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  currentUserId,
  onContactClick,
  onStartDM,
  onStartCall,
  onStartVideoCall,
  onRemoveContact,
  onToggleMute,
  onViewProfile,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredContacts = useMemo(() => {
    let filtered = contacts

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contact => {
        const user = contact.contactUser || contact.user
        if (!user) return false

        return (
          user.name.toLowerCase().includes(query) ||
          (contact.nickname && contact.nickname.toLowerCase().includes(query)) ||
          user.email.toLowerCase().includes(query) ||
          (contact.category && contact.category.toLowerCase().includes(query))
        )
      })
    }

    // Filter by tab
    switch (activeTab) {
      case 'online':
        return filtered.filter(contact => contact.isOnline)
      case 'favorites':
        return filtered.filter(contact => contact.isFavorite)
      case 'muted':
        return filtered.filter(contact => contact.isMuted)
      default:
        return filtered
    }
  }, [contacts, searchQuery, activeTab])

  const onlineCount = contacts.filter(c => c.isOnline).length
  const favoriteCount = contacts.filter(c => c.isFavorite).length

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="online">
              Online
              <Badge variant="secondary" className="ml-2">
                {onlineCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="favorites">
              Favorites
              <Badge variant="secondary" className="ml-2">
                {favoriteCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="muted">Muted</TabsTrigger>
          </TabsList>
        </div>

        {/* Contacts List */}
        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <ContactItem
                    key={contact.id}
                    contact={contact}
                    onClick={() => onContactClick?.(contact)}
                    onStartDM={() => onStartDM?.(contact)}
                    onStartCall={() => onStartCall?.(contact)}
                    onStartVideoCall={() => onStartVideoCall?.(contact)}
                    onRemove={() => onRemoveContact?.(contact)}
                    onToggleMute={() => onToggleMute?.(contact)}
                    onViewProfile={() => onViewProfile?.(contact)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}