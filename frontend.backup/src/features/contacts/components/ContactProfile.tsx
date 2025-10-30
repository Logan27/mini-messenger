import React, { useState } from 'react'
import {
  MessageCircle,
  Phone,
  Video,
  UserMinus,
  Volume2,
  VolumeX,
  Settings,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Image,
  File,
  MoreVertical,
  Shield,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Contact, FileMessage } from '@/shared/lib/types'

interface ContactProfileProps {
  contact: Contact
  sharedMedia?: FileMessage[]
  onStartDM?: (contact: Contact) => void
  onStartCall?: (contact: Contact) => void
  onStartVideoCall?: (contact: Contact) => void
  onRemoveContact?: (contact: Contact) => void
  onToggleMute?: (contact: Contact) => void
  onBlockContact?: (contact: Contact) => void
  className?: string
}

const formatLastSeen = (lastSeen: string): string => {
  const now = new Date()
  const lastSeenDate = new Date(lastSeen)
  const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} days ago`

  return lastSeenDate.toLocaleDateString()
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const MediaItem: React.FC<{
  media: FileMessage
  onClick?: () => void
}> = ({ media, onClick }) => {
  const isImage = media.mimeType.startsWith('image/')

  return (
    <div
      className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {isImage ? (
        <img
          src={media.thumbnail || media.url}
          alt={media.fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <File className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-white text-xs truncate">{media.fileName}</p>
      </div>
    </div>
  )
}

export const ContactProfile: React.FC<ContactProfileProps> = ({
  contact,
  sharedMedia = [],
  onStartDM,
  onStartCall,
  onStartVideoCall,
  onRemoveContact,
  onToggleMute,
  onBlockContact,
  className
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  const user = contact.contactUser || contact.user
  if (!user) return null

  const isOnline = contact.isOnline || false
  const lastSeen = contact.lastSeen

  const images = sharedMedia.filter(media => media.mimeType.startsWith('image/'))
  const videos = sharedMedia.filter(media => media.mimeType.startsWith('video/'))
  const documents = sharedMedia.filter(media => !media.mimeType.startsWith('image/') && !media.mimeType.startsWith('video/'))

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background',
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              )}
            />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">{contact.nickname || user.name}</h1>
                <p className="text-muted-foreground">@{user.username}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {onStartDM && (
                  <Button onClick={() => onStartDM(contact)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
                {onStartCall && (
                  <Button variant="outline" onClick={() => onStartCall(contact)}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
                {onStartVideoCall && (
                  <Button variant="outline" onClick={() => onStartVideoCall(contact)}>
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onToggleMute && (
                      <DropdownMenuItem onClick={() => onToggleMute(contact)}>
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
                    {onBlockContact && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onBlockContact(contact)} className="text-destructive">
                          <Shield className="h-4 w-4 mr-2" />
                          Block Contact
                        </DropdownMenuItem>
                      </>
                    )}
                    {onRemoveContact && (
                      <DropdownMenuItem onClick={() => onRemoveContact(contact)} className="text-destructive">
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove Contact
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status and Info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Badge className="bg-green-100 text-green-800">
                    Online
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Last seen {lastSeen ? formatLastSeen(lastSeen) : 'Never'}
                  </Badge>
                )}
                {contact.isMuted && (
                  <Badge variant="outline">
                    <VolumeX className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
                {contact.category && (
                  <Badge variant="outline">
                    {contact.category}
                  </Badge>
                )}
              </div>

              {user.bio && (
                <p className="text-sm text-muted-foreground">{user.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="media">
              Media
              <Badge variant="secondary" className="ml-2">
                {sharedMedia.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="files">
              Files
              <Badge variant="secondary" className="ml-2">
                {documents.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 px-6 pb-6">
          <TabsContent value="overview" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Contact since {formatDate(contact.createdAt)}
                      </span>
                    </div>
                    {user.email && (
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span className="text-sm">{user.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shared Content Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shared Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{images.length}</div>
                        <div className="text-sm text-muted-foreground">Photos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{videos.length}</div>
                        <div className="text-sm text-muted-foreground">Videos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">{documents.length}</div>
                        <div className="text-sm text-muted-foreground">Files</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mutual Contacts */}
                {user.mutualContacts && user.mutualContacts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mutual Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex -space-x-2">
                        {user.mutualContacts.slice(0, 5).map((mutualContact) => (
                          <Avatar key={mutualContact.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={mutualContact.avatar} alt={mutualContact.name} />
                            <AvatarFallback className="text-xs">
                              {mutualContact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {user.mutualContacts.length > 5 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{user.mutualContacts.length - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="media" className="h-full mt-0">
            <ScrollArea className="h-full">
              {images.length === 0 ? (
                <div className="text-center py-8">
                  <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No shared photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((media) => (
                    <MediaItem key={media.id} media={media} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="h-full mt-0">
            <ScrollArea className="h-full">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No shared files yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <File className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleDateString()} • {Math.round(file.fileSize / 1024)} KB
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}