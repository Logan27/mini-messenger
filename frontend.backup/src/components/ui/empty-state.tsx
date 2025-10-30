import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
  illustration?: React.ReactNode
  animated?: boolean
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm'
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-xl',
    description: 'text-base'
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-lg'
  }
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  illustration,
  animated = true
}) => {
  const sizeClass = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClass.container,
        animated && 'animate-fade-in',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <div className="mb-6">
          {illustration}
        </div>
      ) : Icon && (
        <div className={cn(
          'mb-4 text-muted-foreground',
          animated && 'animate-bounce-slow'
        )}>
          <Icon className={sizeClass.icon} />
        </div>
      )}
      
      <h3 className={cn('font-semibold text-foreground mb-2', sizeClass.title)}>
        {title}
      </h3>
      
      <p className={cn('text-muted-foreground mb-6 max-w-md', sizeClass.description)}>
        {description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className="min-w-[140px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="min-w-[140px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Import icons properly
import {
  MessageSquare,
  MessageCircle,
  Users,
  Search,
  Bell,
  Phone,
  File,
  Clock,
  Activity,
  UserPlus,
  Inbox,
  MicOff,
  VideoOff,
  WifiOff,
  Shield,
  Settings
} from 'lucide-react'

// Specific empty state components for common scenarios
export const EmptyConversations: React.FC<{
  onStartChat?: () => void
  onInviteContacts?: () => void
  className?: string
}> = ({ onStartChat, onInviteContacts, className }) => (
  <EmptyState
    icon={MessageSquare}
    title="No conversations yet"
    description="Start a new conversation to begin messaging with your contacts."
    action={onStartChat ? {
      label: "Start New Chat",
      onClick: onStartChat
    } : undefined}
    secondaryAction={onInviteContacts ? {
      label: "Invite Contacts",
      onClick: onInviteContacts
    } : undefined}
    className={className}
  />
)

export const EmptyMessages: React.FC<{
  onComposeMessage?: () => void
  onSendMedia?: () => void
  className?: string
}> = ({ onComposeMessage, onSendMedia, className }) => (
  <EmptyState
    icon={MessageCircle}
    title="No messages in this conversation"
    description="This conversation is empty. Send the first message to get started."
    action={onComposeMessage ? {
      label: "Send Message",
      onClick: onComposeMessage
    } : undefined}
    secondaryAction={onSendMedia ? {
      label: "Share Media",
      onClick: onSendMedia
    } : undefined}
    className={className}
  />
)

export const EmptyContacts: React.FC<{
  onAddContact?: () => void
  onImportContacts?: () => void
  onFindContacts?: () => void
  className?: string
}> = ({ onAddContact, onImportContacts, onFindContacts, className }) => (
  <EmptyState
    icon={Users}
    title="No contacts yet"
    description="Add contacts to start messaging and calling your friends and colleagues."
    action={onAddContact ? {
      label: "Add Contact",
      onClick: onAddContact
    } : undefined}
    secondaryAction={onImportContacts ? {
      label: "Import Contacts",
      onClick: onImportContacts
    } : undefined}
    className={className}
  />
)

export const EmptySearchResults: React.FC<{
  query: string
  onClearSearch?: () => void
  onAdvancedSearch?: () => void
  className?: string
}> = ({
  query,
  onClearSearch,
  onAdvancedSearch,
  className
}) => (
  <EmptyState
    icon={Search}
    title={`No results for "${query}"`}
    description="Try adjusting your search terms or filters to find what you're looking for."
    action={onClearSearch ? {
      label: "Clear Search",
      onClick: onClearSearch
    } : undefined}
    secondaryAction={onAdvancedSearch ? {
      label: "Advanced Search",
      onClick: onAdvancedSearch
    } : undefined}
    className={className}
  />
)

export const EmptyNotifications: React.FC<{
  onViewSettings?: () => void
  onCheckHistory?: () => void
  className?: string
}> = ({ onViewSettings, onCheckHistory, className }) => (
  <EmptyState
    icon={Bell}
    title="No notifications"
    description="You're all caught up! We'll notify you when there's something new."
    action={onViewSettings ? {
      label: "Notification Settings",
      onClick: onViewSettings
    } : undefined}
    secondaryAction={onCheckHistory ? {
      label: "View History",
      onClick: onCheckHistory
    } : undefined}
    className={className}
  />
)

export const EmptyCallHistory: React.FC<{
  onStartCall?: () => void
  onViewContacts?: () => void
  className?: string
}> = ({ onStartCall, onViewContacts, className }) => (
  <EmptyState
    icon={Phone}
    title="No call history"
    description="Your call history will appear here once you start making calls."
    action={onStartCall ? {
      label: "Start Call",
      onClick: onStartCall
    } : undefined}
    secondaryAction={onViewContacts ? {
      label: "View Contacts",
      onClick: onViewContacts
    } : undefined}
    className={className}
  />
)

export const EmptyFiles: React.FC<{
  onUploadFile?: () => void
  onBrowseFiles?: () => void
  className?: string
}> = ({ onUploadFile, onBrowseFiles, className }) => (
  <EmptyState
    icon={File}
    title="No files shared"
    description="Files and media shared in this conversation will appear here."
    action={onUploadFile ? {
      label: "Share File",
      onClick: onUploadFile
    } : undefined}
    secondaryAction={onBrowseFiles ? {
      label: "Browse Files",
      onClick: onBrowseFiles
    } : undefined}
    className={className}
  />
)

export const EmptyPendingUsers: React.FC<{
  onInviteUsers?: () => void
  className?: string
}> = ({ onInviteUsers, className }) => (
  <EmptyState
    icon={Clock}
    title="No pending users"
    description="All user registration requests have been processed."
    action={onInviteUsers ? {
      label: "Invite Users",
      onClick: onInviteUsers
    } : undefined}
    size="sm"
    className={className}
  />
)

export const EmptyAdminActivity: React.FC<{
  onViewLogs?: () => void
  className?: string
}> = ({ onViewLogs, className }) => (
  <EmptyState
    icon={Activity}
    title="No recent activity"
    description="Administrative actions and system events will appear here."
    action={onViewLogs ? {
      label: "View Logs",
      onClick: onViewLogs
    } : undefined}
    size="sm"
    className={className}
  />
)

// Additional messenger-specific empty states
export const EmptyVoiceMessages: React.FC<{
  onRecordVoice?: () => void
  className?: string
}> = ({ onRecordVoice, className }) => (
  <EmptyState
    icon={MicOff}
    title="No voice messages"
    description="Voice messages sent and received will appear here."
    action={onRecordVoice ? {
      label: "Record Voice",
      onClick: onRecordVoice
    } : undefined}
    className={className}
  />
)

export const EmptyVideoMessages: React.FC<{
  onRecordVideo?: () => void
  className?: string
}> = ({ onRecordVideo, className }) => (
  <EmptyState
    icon={VideoOff}
    title="No video messages"
    description="Video messages sent and received will appear here."
    action={onRecordVideo ? {
      label: "Record Video",
      onClick: onRecordVideo
    } : undefined}
    className={className}
  />
)

export const EmptyOfflineMessages: React.FC<{
  onCheckConnection?: () => void
  className?: string
}> = ({ onCheckConnection, className }) => (
  <EmptyState
    icon={WifiOff}
    title="No offline messages"
    description="Messages sent while you were offline will appear here."
    action={onCheckConnection ? {
      label: "Check Connection",
      onClick: onCheckConnection
    } : undefined}
    className={className}
  />
)

export const EmptyBlockedUsers: React.FC<{
  onManageBlocked?: () => void
  className?: string
}> = ({ onManageBlocked, className }) => (
  <EmptyState
    icon={Shield}
    title="No blocked users"
    description="Users you block will appear here for management."
    action={onManageBlocked ? {
      label: "Manage Blocked",
      onClick: onManageBlocked
    } : undefined}
    className={className}
  />
)

export const EmptySettings: React.FC<{
  onConfigureSettings?: () => void
  className?: string
}> = ({ onConfigureSettings, className }) => (
  <EmptyState
    icon={Settings}
    title="No custom settings"
    description="Customize your preferences to personalize your experience."
    action={onConfigureSettings ? {
      label: "Configure Settings",
      onClick: onConfigureSettings
    } : undefined}
    className={className}
  />
)

export default EmptyState