import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, ShieldOff, UserMinus, Crown, MoreVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { groupsApi, type GroupMember } from '@/features/groups/api/groupsApi'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddMembersModal } from './AddMembersModal'
import { useAuthStore } from '@/app/stores/authStore'
import { useMessageStore } from '@/app/stores/messageStore'
import { api } from '@/shared/api'
import websocketService from '@/services/websocketService'
import type { User } from '@/shared/lib/types'

interface GroupMembersModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
}

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  type: 'info' | 'warning' | 'danger' | 'success'
  onConfirm: () => void
  userId?: string
  userName?: string
  action?: 'remove' | 'promote' | 'demote'
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName
}) => {
  const { user: currentUser } = useAuthStore()
  const { conversations, loadConversations } = useMessageStore()
  
  const [members, setMembers] = useState<GroupMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  })

  // Get current group from conversations
  const currentGroup = conversations.find(c => c.id === groupId && c.type === 'group')
  
  // Check if current user is admin or creator
  const currentUserMember = members.find(m => m.userId === currentUser?.id)
  const isAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'moderator'
  const isCreator = currentGroup?.participants.find(p => p.id === currentUser?.id)?.role === 'admin'

  // Load group members and available users
  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupMembers()
      loadAvailableUsers()
      
      // Set up WebSocket listeners for group events
      setupWebSocketListeners()
      
      return () => {
        // Clean up WebSocket listeners
        cleanupWebSocketListeners()
      }
    }
  }, [isOpen, groupId])

  const setupWebSocketListeners = () => {
    // Listen for group member events
    websocketService.on('group_member_added', handleMemberAdded)
    websocketService.on('group_member_removed', handleMemberRemoved)
    websocketService.on('group_member_role_updated', handleMemberRoleUpdated)
    websocketService.on('group_updated', handleGroupUpdated)
  }

  const cleanupWebSocketListeners = () => {
    websocketService.off('group_member_added', handleMemberAdded)
    websocketService.off('group_member_removed', handleMemberRemoved)
    websocketService.off('group_member_role_updated', handleMemberRoleUpdated)
    websocketService.off('group_updated', handleGroupUpdated)
  }

  const handleMemberAdded = (data: any) => {
    if (data.groupId === groupId) {
      loadGroupMembers()
      loadConversations()
    }
  }

  const handleMemberRemoved = (data: any) => {
    if (data.groupId === groupId) {
      loadGroupMembers()
      loadConversations()
    }
  }

  const handleMemberRoleUpdated = (data: any) => {
    if (data.groupId === groupId) {
      loadGroupMembers()
      loadConversations()
    }
  }

  const handleGroupUpdated = (data: any) => {
    if (data.groupId === groupId) {
      loadGroupMembers()
      loadConversations()
    }
  }

  const loadGroupMembers = async () => {
    setIsLoading(true)
    try {
      const groupData = await groupsApi.getGroup(groupId)
      setMembers(groupData.members || [])
    } catch (error) {
      console.error('Failed to load group members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const response = await api.get('/users', { params: { limit: 100 } })
      setAvailableUsers(response.data.data?.users || [])
    } catch (error) {
      console.error('Failed to load available users:', error)
    }
  }

  const handleAddMembers = async (userIds: string[]) => {
    try {
      for (const userId of userIds) {
        await groupsApi.addMember(groupId, userId, 'member')
      }
      await loadGroupMembers()
      await loadConversations() // Refresh conversations to update member list
    } catch (error) {
      console.error('Failed to add members:', error)
      throw error
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${userName} from ${groupName}? They will need to be re-invited to rejoin.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await groupsApi.removeMember(groupId, userId)
          await loadGroupMembers()
          await loadConversations() // Refresh conversations
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Failed to remove member:', error)
        }
      },
      userId,
      userName,
      action: 'remove'
    })
  }

  const handlePromoteMember = async (userId: string, userName: string, currentRole: string) => {
    const newRole = currentRole === 'member' ? 'moderator' : 'admin'
    setConfirmDialog({
      isOpen: true,
      title: 'Promote Member',
      message: `Are you sure you want to promote ${userName} to ${newRole}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await groupsApi.updateMemberRole(groupId, userId, newRole as 'admin' | 'moderator' | 'member')
          await loadGroupMembers()
          await loadConversations() // Refresh conversations
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Failed to promote member:', error)
        }
      },
      userId,
      userName,
      action: 'promote'
    })
  }

  const handleDemoteMember = async (userId: string, userName: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'moderator' : 'member'
    setConfirmDialog({
      isOpen: true,
      title: 'Demote Member',
      message: `Are you sure you want to demote ${userName} from ${currentRole} to ${newRole}?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await groupsApi.updateMemberRole(groupId, userId, newRole as 'admin' | 'moderator' | 'member')
          await loadGroupMembers()
          await loadConversations() // Refresh conversations
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Failed to demote member:', error)
        }
      },
      userId,
      userName,
      action: 'demote'
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'
      case 'moderator':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const canManageMember = (member: GroupMember) => {
    // Cannot manage themselves
    if (member.userId === currentUser?.id) return false
    
    // Only admins can manage members
    if (!isAdmin) return false
    
    // Creator cannot be removed or demoted
    if (member.user?.id === currentGroup?.participants.find(p => p.role === 'admin')?.id && 
        (member.role === 'admin' || member.user?.id === currentGroup?.participants[0]?.id)) {
      return false
    }
    
    return true
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Group Members</span>
            </DialogTitle>
            <DialogDescription>
              {groupName} • {members.length} member{members.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Members list */}
            <ScrollArea className="h-96 border rounded-md">
              <div className="p-2 space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.user?.avatar} alt={member.user?.name} />
                          <AvatarFallback>
                            {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium truncate">
                              {member.user?.name}
                            </p>
                            {getRoleIcon(member.role)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.user?.email}
                          </p>
                          <div className="flex items-center mt-1">
                            <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                              {member.role}
                            </Badge>
                            {member.user?.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs ml-1">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Member actions */}
                      {canManageMember(member) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'member' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handlePromoteMember(
                                    member.userId,
                                    member.user?.name || '',
                                    member.role
                                  )}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Promote to Moderator
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {member.role === 'moderator' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handlePromoteMember(
                                    member.userId,
                                    member.user?.name || '',
                                    member.role
                                  )}
                                >
                                  <Crown className="mr-2 h-4 w-4" />
                                  Promote to Admin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {member.role === 'admin' && member.user?.id !== currentGroup?.participants.find(p => p.role === 'admin')?.id && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDemoteMember(
                                    member.userId,
                                    member.user?.name || '',
                                    member.role
                                  )}
                                >
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Demote to Moderator
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {member.role === 'moderator' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDemoteMember(
                                    member.userId,
                                    member.user?.name || '',
                                    member.role
                                  )}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Demote to Member
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(
                                member.userId,
                                member.user?.name || ''
                              )}
                              className="text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setIsAddMembersModalOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Members</span>
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        onAddMembers={handleAddMembers}
        availableUsers={availableUsers}
        currentMembers={members.map(m => m.user).filter(Boolean) as User[]}
        currentUserId={currentUser?.id || ''}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmLabel={confirmDialog.action === 'remove' ? 'Remove' : 
                     confirmDialog.action === 'promote' ? 'Promote' : 'Demote'}
        variant={confirmDialog.action === 'remove' ? 'destructive' : 'default'}
      />
    </>
  )
}