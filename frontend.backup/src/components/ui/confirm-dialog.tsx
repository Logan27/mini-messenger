import React, { useEffect, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  UserMinus,
  LogOut,
  Ban,
  Archive,
  Download,
  Upload,
  Mic,
  Video,
  Phone,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'info' | 'warning' | 'danger' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  children?: React.ReactNode
  keyboardShortcuts?: {
    confirm?: string
    cancel?: string
  }
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  children,
  keyboardShortcuts = { confirm: 'Enter', cancel: 'Escape' }
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-orange-600" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getIconBgColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-100'
      case 'warning':
        return 'bg-orange-100'
      case 'success':
        return 'bg-green-100'
      case 'info':
      default:
        return 'bg-blue-100'
    }
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || loading) return

    if (event.key === keyboardShortcuts.confirm?.toLowerCase()) {
      event.preventDefault()
      onConfirm()
    } else if (event.key === keyboardShortcuts.cancel?.toLowerCase()) {
      event.preventDefault()
      onClose()
    }
  }, [isOpen, loading, onConfirm, onClose, keyboardShortcuts])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', getIconBgColor())}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="pl-11">
            {message}
          </AlertDialogDescription>
          {children && (
            <div className="pl-11 mt-4">
              {children}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              variant === 'destructive' && 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
            )}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Specialized confirmation dialogs for common use cases
export const DeleteConfirmDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  itemName?: string
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message,
  itemName,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title={title}
    message={message || `Are you sure you want to delete ${itemName || 'this item'}? This action cannot be undone.`}
    type="danger"
    confirmLabel="Delete"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const LeaveGroupDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  groupName?: string
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  groupName,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Leave Group"
    message={`Are you sure you want to leave ${groupName || 'this group'}? You'll need to be re-invited to rejoin.`}
    type="warning"
    confirmLabel="Leave Group"
    cancelLabel="Stay"
    variant="destructive"
    loading={loading}
  />
)

export const EndCallDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  callType?: 'audio' | 'video'
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  callType = 'audio',
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title={`End ${callType === 'video' ? 'Video' : 'Audio'} Call`}
    message={`Are you sure you want to end this ${callType} call?`}
    type="warning"
    confirmLabel="End Call"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const SuspendUserDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: (duration: number, reason: string) => void
  userName?: string
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  loading = false
}) => {
  const [duration, setDuration] = React.useState(24)
  const [reason, setReason] = React.useState('')

  const handleConfirm = () => {
    onConfirm(duration, reason)
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Suspend User"
      message={`Suspend ${userName || 'this user'}'s account. They will not be able to log in or use the platform during the suspension period.`}
      type="warning"
      confirmLabel="Suspend User"
      cancelLabel="Cancel"
      variant="destructive"
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Suspension Duration (hours)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>1 day</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
            <option value={720}>1 month</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension..."
            className="w-full mt-1 p-2 border rounded-md resize-none"
            rows={3}
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}

// Additional messenger-specific confirmation dialogs
export const DeleteMessageDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  messageCount?: number
  isGroupChat?: boolean
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  messageCount = 1,
  isGroupChat = false,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Delete Message"
    message={
      messageCount > 1
        ? `Are you sure you want to delete ${messageCount} messages? This action cannot be undone.`
        : `Are you sure you want to delete this message? This action cannot be undone.`
    }
    type="danger"
    confirmLabel="Delete"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const RemoveContactDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  contactName?: string
  willBlock?: boolean
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  contactName,
  willBlock = false,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Remove Contact"
    message={
      willBlock
        ? `Are you sure you want to remove ${contactName || 'this contact'} and block them? You won't receive messages from them anymore.`
        : `Are you sure you want to remove ${contactName || 'this contact'} from your contacts?`
    }
    type="warning"
    confirmLabel={willBlock ? "Remove & Block" : "Remove Contact"}
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const BlockUserDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName?: string
  blockMessages?: boolean
  blockCalls?: boolean
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  blockMessages = true,
  blockCalls = true,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Block User"
    message={
      `Are you sure you want to block ${userName || 'this user'}? ${
        blockMessages && blockCalls
          ? 'You won\'t receive messages or calls from them.'
          : blockMessages
          ? 'You won\'t receive messages from them.'
          : 'You won\'t receive calls from them.'
      }`
    }
    type="warning"
    confirmLabel="Block User"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const ArchiveConversationDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  conversationName?: string
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  conversationName,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Archive Conversation"
    message={`Are you sure you want to archive the conversation with ${conversationName || 'this user'}? You can find it in your archived conversations.`}
    type="info"
    confirmLabel="Archive"
    cancelLabel="Cancel"
    loading={loading}
  />
)

export const ClearChatHistoryDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  conversationName?: string
  messageCount?: number
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  conversationName,
  messageCount,
  loading = false
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Clear Chat History"
    message={
      messageCount
        ? `Are you sure you want to clear all ${messageCount} messages in this conversation? This action cannot be undone.`
        : `Are you sure you want to clear all messages in this conversation with ${conversationName || 'this user'}? This action cannot be undone.`
    }
    type="danger"
    confirmLabel="Clear History"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
  />
)

export const DeleteAccountDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const handleConfirm = () => {
    onConfirm(password)
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Delete Account"
      message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
      type="danger"
      confirmLabel="Delete Account"
      cancelLabel="Cancel"
      variant="destructive"
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Enter your password to confirm</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full mt-1 p-2 border rounded-md"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showPassword"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showPassword" className="text-sm">
            Show password
          </label>
        </div>
      </div>
    </ConfirmDialog>
  )
}

export const MuteNotificationsDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: (duration: number) => void
  conversationName?: string
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  conversationName,
  loading = false
}) => {
  const [duration, setDuration] = React.useState(8) // 8 hours default

  const handleConfirm = () => {
    onConfirm(duration)
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Mute Notifications"
      message={`Mute notifications from ${conversationName || 'this conversation'} for a specific period.`}
      type="info"
      confirmLabel="Mute"
      cancelLabel="Cancel"
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Mute for</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value={1}>1 hour</option>
            <option value={8}>8 hours</option>
            <option value={24}>1 day</option>
            <option value={168}>1 week</option>
            <option value={0}>Until I unmute</option>
          </select>
        </div>
      </div>
    </ConfirmDialog>
  )
}

export const ReportContentDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, description: string) => void
  contentType?: 'message' | 'user' | 'group'
  loading?: boolean
}> = ({
  isOpen,
  onClose,
  onConfirm,
  contentType = 'message',
  loading = false
}) => {
  const [reason, setReason] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleConfirm = () => {
    onConfirm(reason, description)
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={`Report ${contentType}`}
      message={`Help us understand what's wrong with this ${contentType}.`}
      type="warning"
      confirmLabel="Report"
      cancelLabel="Cancel"
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="">Select a reason</option>
            <option value="spam">Spam</option>
            <option value="inappropriate">Inappropriate content</option>
            <option value="harassment">Harassment</option>
            <option value="violence">Violence or threats</option>
            <option value="copyright">Copyright violation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details..."
            className="w-full mt-1 p-2 border rounded-md resize-none"
            rows={3}
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}

export { ConfirmDialog }
export default ConfirmDialog