import React, { useState } from 'react'
import { UserPlus, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { cn } from '@/lib/utils'
import type { User } from '@/shared/lib/types'

interface AddMembersModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMembers: (userIds: string[]) => Promise<void>
  availableUsers: User[]
  currentMembers: User[]
  currentUserId: string
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  onAddMembers,
  availableUsers,
  currentMembers,
  currentUserId
}) => {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter out current members and get available users
  const currentMemberIds = new Set(currentMembers.map(member => member.id))
  const filteredUsers = availableUsers
    .filter(user => !currentMemberIds.has(user.id))
    .filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)))
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) return

    setIsAdding(true)
    try {
      await onAddMembers(Array.from(selectedUsers))
      setSelectedUsers(new Set())
      setSearchQuery('')
      onClose()
    } catch (error) {
      console.error('Failed to add members:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const selectedUserObjects = availableUsers.filter(user => selectedUsers.has(user.id))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Add Members</span>
          </DialogTitle>
          <DialogDescription>
            Select users to add to the group conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-10"
            />
          </div>

          {/* Selected users preview */}
          {selectedUserObjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selected ({selectedUserObjects.length})</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUsers(new Set())}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                {selectedUserObjects.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center space-x-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Users list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Available Users ({filteredUsers.length})</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50',
                      selectedUsers.has(user.id) && 'bg-blue-50'
                    )}
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleUserToggle(user.id)}
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
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    {searchQuery ? 'No users found' : 'No users available to add'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.size === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add {selectedUsers.size} Member{selectedUsers.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}