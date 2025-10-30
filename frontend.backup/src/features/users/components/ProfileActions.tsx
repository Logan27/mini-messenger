import React, { useState } from 'react'
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  MoreVertical,
  Phone,
  Video,
  Flag,
  Copy,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { UserProfile } from '@/shared/lib/types'

interface ProfileActionsProps {
  user: UserProfile
  currentUserId: string
  isExistingContact?: boolean
  isBlocked?: boolean
  onSendMessage?: (user: UserProfile) => void
  onAddContact?: (user: UserProfile) => void
  onRemoveContact?: (user: UserProfile) => void
  onBlockUser?: (user: UserProfile) => void
  onUnblockUser?: (user: UserProfile) => void
  onStartCall?: (user: UserProfile) => void
  onStartVideoCall?: (user: UserProfile) => void
  onReportUser?: (user: UserProfile) => void
  className?: string
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({
  user,
  currentUserId,
  isExistingContact = false,
  isBlocked = false,
  onSendMessage,
  onAddContact,
  onRemoveContact,
  onBlockUser,
  onUnblockUser,
  onStartCall,
  onStartVideoCall,
  onReportUser,
  className
}) => {
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)

  const isOwnProfile = user.id === currentUserId

  const handleCopyProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${user.id}`
    navigator.clipboard.writeText(profileUrl)
    toast.success('Profile link copied to clipboard')
  }

  const handleBlockConfirm = () => {
    if (onBlockUser) {
      onBlockUser(user)
      toast.success(`Blocked ${user.name}`)
    }
    setShowBlockDialog(false)
  }

  const handleRemoveConfirm = () => {
    if (onRemoveContact) {
      onRemoveContact(user)
      toast.success(`Removed ${user.name} from contacts`)
    }
    setShowRemoveDialog(false)
  }

  const handleReportConfirm = () => {
    if (onReportUser) {
      onReportUser(user)
      toast.success('User reported')
    }
    setShowReportDialog(false)
  }

  if (isOwnProfile) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button variant="outline" onClick={handleCopyProfile}>
          <Copy className="h-4 w-4 mr-2" />
          Share Profile
        </Button>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="destructive">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
        {onUnblockUser && (
          <Button variant="outline" onClick={() => onUnblockUser(user)}>
            Unblock
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Primary Actions */}
        <div className="flex items-center space-x-2">
          {onSendMessage && (
            <Button onClick={() => onSendMessage(user)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          )}

          {onStartCall && (
            <Button variant="outline" onClick={() => onStartCall(user)}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          )}

          {onStartVideoCall && (
            <Button variant="outline" onClick={() => onStartVideoCall(user)}>
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
          )}
        </div>

        {/* Contact Management */}
        {isExistingContact ? (
          <Button variant="outline" onClick={() => setShowRemoveDialog(true)}>
            <UserMinus className="h-4 w-4 mr-2" />
            Remove
          </Button>
        ) : (
          onAddContact && (
            <Button variant="outline" onClick={() => onAddContact(user)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyProfile}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Profile Link
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => window.open(`/profile/${user.id}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onReportUser && (
              <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive">
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
            )}

            {onBlockUser && (
              <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                <Shield className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent {user.name} from sending you messages, seeing your online status,
              and adding you to groups. You can unblock them later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockConfirm} className="bg-destructive text-destructive-foreground">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Contact Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {user.name} from contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {user.name} from your contacts list. You can add them back later
              by searching for their username.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveConfirm} className="bg-destructive text-destructive-foreground">
              Remove Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report User Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Help us keep our community safe by reporting inappropriate behavior.
              Our team will review this report and take appropriate action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReportConfirm} className="bg-destructive text-destructive-foreground">
              Report User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}