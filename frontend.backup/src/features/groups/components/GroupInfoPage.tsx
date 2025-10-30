import React, { useState } from 'react'
import {
  Users,
  Settings,
  UserPlus,
  UserMinus,
  Crown,
  MoreVertical,
  Edit3,
  Phone,
  Video,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Conversation, User } from '@/shared/lib/types'

interface GroupInfoPageProps {
  conversation: Conversation
  currentUserId: string
  onUpdateGroup: (updates: { name?: string; description?: string }) => Promise<void>
  onAddMembers: (userIds: string[]) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onLeaveGroup: () => Promise<void>
  onStartCall: (type: 'audio' | 'video') => void
  className?: string
}

export const GroupInfoPage: React.FC<GroupInfoPageProps> = ({
  conversation,
  currentUserId,
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onStartCall,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [groupName, setGroupName] = useState(conversation.name || '')
  const [groupDescription, setGroupDescription] = useState(conversation.description || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)

  // Mock data for available users to add (in real app, this would come from API)
  const availableUsers: User[] = []

  const isAdmin = conversation.participants.find(p => p.id === currentUserId)?.role === 'admin'
  const memberCount = conversation.participants.length

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) return

    setIsUpdating(true)
    try {
      await onUpdateGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update group:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLeaveGroup = async () => {
    try {
      await onLeaveGroup()
      setShowLeaveDialog(false)
    } catch (error) {
      console.error('Failed to leave group:', error)
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            ← Back
          </Button>
          <h1 className="text-lg font-semibold">Group Info</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Call buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStartCall('audio')}
            className="h-8 w-8 p-0"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStartCall('video')}
            className="h-8 w-8 p-0"
          >
            <Video className="h-4 w-4" />
          </Button>

          {/* Group settings menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddMembers(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setShowLeaveDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Group Avatar and Basic Info */}
          <div className="flex flex-col items-center space-y-4">
            {/* Group Avatar - composite from member avatars */}
            <div className="relative">
              <div className="flex -space-x-2">
                {conversation.participants.slice(0, 4).map((participant, index) => (
                  <Avatar key={participant.id} className="h-12 w-12 border-2 border-white">
                    <AvatarImage src={participant.avatar} alt={participant.name} />
                    <AvatarFallback>
                      {participant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {conversation.participants.length > 4 && (
                  <div className="h-12 w-12 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-sm font-medium">
                    +{conversation.participants.length - 4}
                  </div>
                )}
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Group Name and Description */}
            {isEditing ? (
              <div className="w-full max-w-sm space-y-3">
                <div>
                  <Label htmlFor="editGroupName">Group Name</Label>
                  <Input
                    id="editGroupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="editGroupDescription">Description</Label>
                  <Textarea
                    id="editGroupDescription"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleUpdateGroup} disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">{conversation.name}</h2>
                {conversation.description && (
                  <p className="text-gray-600 text-sm max-w-sm">{conversation.description}</p>
                )}
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{memberCount} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Info className="h-4 w-4" />
                    <span>Created {new Date(conversation.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Members ({memberCount})</h3>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMembers(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {conversation.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback>
                        {participant.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{participant.name}</p>
                        {participant.id === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                        {participant.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{participant.email}</p>
                    </div>
                  </div>

                  {/* Member actions */}
                  {isAdmin && participant.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onRemoveMember(participant.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Leave Group Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You'll need to be re-added to participate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}