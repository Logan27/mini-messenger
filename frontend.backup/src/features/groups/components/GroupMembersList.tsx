import React from 'react'
import { Crown, UserMinus, MoreVertical, Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { User } from '@/shared/lib/types'

interface GroupMembersListProps {
  members: User[]
  currentUserId: string
  isAdmin?: boolean
  onRemoveMember?: (userId: string) => void
  onPromoteToAdmin?: (userId: string) => void
  onStartDirectMessage?: (userId: string) => void
  onCallUser?: (userId: string, type: 'audio' | 'video') => void
  showOnlineStatus?: boolean
  className?: string
}

export const GroupMembersList: React.FC<GroupMembersListProps> = ({
  members,
  currentUserId,
  isAdmin = false,
  onRemoveMember,
  onPromoteToAdmin,
  onStartDirectMessage,
  onCallUser,
  showOnlineStatus = true,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-gray-700">
          Members ({members.length})
        </h3>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Online status indicator */}
                  {showOnlineStatus && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{member.name}</p>

                    {/* Role badges */}
                    <div className="flex items-center space-x-1">
                      {member.id === currentUserId && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          You
                        </Badge>
                      )}

                      {/* Admin badge would come from member role if we had it */}
                      {isAdmin && member.id !== currentUserId && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
              </div>

              {/* Member actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Direct message */}
                {member.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onStartDirectMessage?.(member.id)}
                    className="h-8 w-8 p-0"
                    title="Send direct message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}

                {/* Call buttons */}
                {member.id !== currentUserId && onCallUser && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCallUser(member.id, 'audio')}
                      className="h-8 w-8 p-0"
                      title="Voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Admin actions */}
                {isAdmin && member.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onPromoteToAdmin?.(member.id)}>
                        <Crown className="h-4 w-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onRemoveMember?.(member.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove from Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}