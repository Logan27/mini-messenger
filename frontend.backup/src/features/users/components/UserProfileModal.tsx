import React, { useState } from 'react'
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  Shield,
  MoreVertical,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Image,
  File,
  Users,
  Clock,
  ExternalLink,
  Download
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { UserProfile, FileMessage } from '@/shared/lib/types'

interface UserProfileModalProps {
  user: UserProfile | null
  isOpen: boolean
  onClose: () => void
  onSendMessage?: (user: UserProfile) => void
  onAddContact?: (user: UserProfile) => void
  onRemoveContact?: (user: UserProfile) => void
  onBlockUser?: (user: UserProfile) => void
  currentUserId: string
  isExistingContact?: boolean
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

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onSendMessage,
  onAddContact,
  onRemoveContact,
  onBlockUser,
  currentUserId,
  isExistingContact = false
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  if (!user) return null

  const images = user.sharedMedia.filter(media => media.mimeType.startsWith('image/'))
  const videos = user.sharedMedia.filter(media => media.mimeType.startsWith('video/'))
  const documents = user.sharedMedia.filter(media => !media.mimeType.startsWith('image/') && !media.mimeType.startsWith('video/'))

  const isOwnProfile = user.id === currentUserId

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[700px]">
          {/* Profile Header */}
          <div className="p-6 border-b">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xl">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background',
                    user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-muted-foreground">@{user.username}</p>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex items-center space-x-2">
                      {onSendMessage && (
                        <Button onClick={() => onSendMessage(user)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      )}

                      {isExistingContact ? (
                        onRemoveContact && (
                          <Button variant="outline" onClick={() => onRemoveContact(user)}>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )
                      ) : (
                        onAddContact && (
                          <Button variant="outline" onClick={() => onAddContact(user)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Contact
                          </Button>
                        )
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onBlockUser && (
                            <DropdownMenuItem onClick={() => onBlockUser(user)} className="text-destructive">
                              <Shield className="h-4 w-4 mr-2" />
                              Block User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Status and Info */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    {user.isOnline ? (
                      <Badge className="bg-green-100 text-green-800">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Last seen {formatLastSeen(user.lastSeen)}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Joined {formatDate(user.joinedAt)}
                    </Badge>
                  </div>

                  {user.bio && (
                    <p className="text-muted-foreground">{user.bio}</p>
                  )}

                  {(user.location || user.website) && (
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {user.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{user.location}</span>
                        </div>
                      )}
                      {user.website && (
                        <div className="flex items-center space-x-1">
                          <LinkIcon className="h-4 w-4" />
                          <a
                            href={user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Website
                          </a>
                        </div>
                      )}
                    </div>
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
                    {images.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="files">
                  Files
                  <Badge variant="secondary" className="ml-2">
                    {documents.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="groups">
                  Groups
                  <Badge variant="secondary" className="ml-2">
                    {user.mutualGroups.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 px-6 pb-6">
              <TabsContent value="overview" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    {/* Mutual Contacts */}
                    {user.mutualContacts.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Mutual Contacts ({user.mutualContacts.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex -space-x-2">
                            {user.mutualContacts.slice(0, 8).map((contact) => (
                              <Avatar key={contact.id} className="h-10 w-10 border-2 border-background">
                                <AvatarImage src={contact.avatar} alt={contact.name} />
                                <AvatarFallback className="text-sm">
                                  {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {user.mutualContacts.length > 8 && (
                              <div className="h-10 w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">
                                  +{user.mutualContacts.length - 8}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Mutual Groups */}
                    {user.mutualGroups.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Mutual Groups</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {user.mutualGroups.map((group) => (
                            <div key={group.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {group.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{group.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {group.memberCount} members
                                </p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Account Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Account Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Member since {formatDate(user.joinedAt)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Last active {formatLastSeen(user.lastSeen)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-muted-foreground">Role:</span>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="media" className="h-full mt-0">
                <ScrollArea className="h-full">
                  {images.length === 0 ? (
                    <div className="text-center py-8">
                      <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No shared media</p>
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
                      <p className="text-muted-foreground">No shared files</p>
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

              <TabsContent value="groups" className="h-full mt-0">
                <ScrollArea className="h-full">
                  {user.mutualGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No mutual groups</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {user.mutualGroups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {group.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.memberCount} members • Created {formatDate(group.createdAt)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
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
      </DialogContent>
    </Dialog>
  )
}