import React, { useState, useRef } from 'react'
import { Users, X, Plus, Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { User } from '@/shared/lib/types'
import { groupsApi, type CreateGroupData } from '../api/groupsApi'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: (group: any) => void
  availableUsers: User[]
  currentUserId: string
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  availableUsers,
  currentUserId
}) => {
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set([currentUserId]))
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter users based on search query
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        // Check if adding this user would exceed the maximum limit
        if (newSet.size >= 20) {
          toast.error("Maximum participants reached", {
            description: "A group can have a maximum of 20 participants."
          })
          return prev
        }
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Avatar must be smaller than 5MB."
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Invalid file type", {
        description: "Avatar must be an image file."
      })
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCreateGroup = async () => {
    // Validate form
    if (!groupName.trim()) {
      toast.error("Group name required", {
        description: "Please enter a group name."
      })
      return
    }

    if (groupName.trim().length < 3 || groupName.trim().length > 100) {
      toast.error("Invalid group name", {
        description: "Group name must be between 3 and 100 characters."
      })
      return
    }

    if (groupDescription.length > 500) {
      toast.error("Description too long", {
        description: "Description must be less than 500 characters."
      })
      return
    }

    if (selectedUsers.size < 2) {
      toast.error("Not enough participants", {
        description: "A group must have at least 2 participants."
      })
      return
    }

    if (selectedUsers.size > 20) {
      toast.error("Too many participants", {
        description: "A group can have a maximum of 20 participants."
      })
      return
    }

    setIsCreating(true)
    try {
      let avatarUrl = undefined

      // Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData()
        formData.append('file', avatarFile)
        formData.append('type', 'avatar')
        
        try {
          const uploadResponse = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload avatar')
          }
          
          const uploadResult = await uploadResponse.json()
          avatarUrl = uploadResult.data?.url
        } catch (error) {
          console.error('Avatar upload failed:', error)
          toast.warning("Avatar upload failed", {
            description: "Group will be created without an avatar."
          })
        }
      }

      // Prepare group data
      const groupData: CreateGroupData = {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        groupType: 'private',
        avatar: avatarUrl,
        initialMembers: Array.from(selectedUsers).filter(id => id !== currentUserId)
      }

      // Create group
      const newGroup = await groupsApi.createGroup(groupData)
      
      // Reset form
      setGroupName('')
      setGroupDescription('')
      setSelectedUsers(new Set([currentUserId]))
      setSearchQuery('')
      setAvatarPreview(null)
      setAvatarFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      onGroupCreated(newGroup)
      onClose()
      
      toast.success("Group created successfully", {
        description: `"${groupData.name}" has been created.`
      })
    } catch (error: any) {
      console.error('Failed to create group:', error)
      toast.error("Failed to create group", {
        description: error.response?.data?.error?.message || "An error occurred while creating the group."
      })
    } finally {
      setIsCreating(false)
    }
  }

  const selectedUserObjects = availableUsers.filter(user => selectedUsers.has(user.id))
  const isFormValid = groupName.trim().length >= 3 &&
                     groupName.trim().length <= 100 &&
                     selectedUsers.size >= 2 &&
                     selectedUsers.size <= 20

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Create New Group</span>
          </DialogTitle>
          <DialogDescription>
            Create a new group conversation with multiple participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group avatar */}
          <div className="space-y-2">
            <Label>Group Avatar (Optional)</Label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarPreview || ''} alt="Group avatar" />
                  <AvatarFallback>
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a group avatar (max 5MB, JPG/PNG)
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Group name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name (3-100 characters)..."
              maxLength={100}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              {groupName.length}/100 characters
            </p>
          </div>

          {/* Group description */}
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description (Optional)</Label>
            <Textarea
              id="groupDescription"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description..."
              maxLength={500}
              rows={3}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              {groupDescription.length}/500 characters
            </p>
          </div>

          {/* Selected users preview */}
          {selectedUserObjects.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Members ({selectedUserObjects.length}/20)</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUserObjects.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center space-x-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name}</span>
                    {user.id === currentUserId && (
                      <span className="text-xs opacity-75">(You)</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User search */}
          <div className="space-y-2">
            <Label>Add Members</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="mb-2"
              disabled={isCreating}
            />

            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50',
                      selectedUsers.has(user.id) && 'bg-blue-50',
                      isCreating && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !isCreating && handleUserToggle(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onChange={() => !isCreating && handleUserToggle(user.id)}
                      disabled={isCreating}
                    />

                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {user.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={!isFormValid || isCreating}
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}