// UI Components Index
// This file exports all UI components for easier imports

// Basic UI Components
export { Button, buttonVariants } from './button'
export { Input } from './input'
export { Label } from './label'
export { Textarea } from './textarea'
export { Checkbox } from './checkbox'
export { Switch } from './switch'
export { Select } from './select'
export { Badge } from './badge'
export { Avatar, AvatarFallback, AvatarImage } from './avatar'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export { Progress } from './progress'
export { Separator } from './separator'
export { ScrollArea } from './scroll-area'
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form'
export { Command } from './command'
export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from './context-menu'
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu'
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
export { LazyImage } from './lazy-image'

// Navigation Components
export { ResponsiveNavigation } from './responsive-navigation'

// Loading States
export { default as LoadingSpinner, PageLoadingSpinner, InlineLoadingSpinner, ButtonLoadingSpinner } from './loading-spinner'
export { default as SkeletonLoader, SkeletonCard, SkeletonTable, SkeletonAvatar, SkeletonMessage, SkeletonConversationList, SkeletonChatHeader, SkeletonMessageList, SkeletonMessageInput, SkeletonSearchResults } from './skeleton-loader'
export { LoadingOverlay } from './loading-overlay'

// Error Handling
export { default as ErrorBoundary, ChatErrorBoundary, MessageErrorBoundary } from './error-boundary'

// Empty States
export { default as EmptyState, EmptyConversations, EmptyMessages, EmptyContacts, EmptySearchResults, EmptyNotifications, EmptyCallHistory, EmptyFiles, EmptyPendingUsers, EmptyAdminActivity, EmptyVoiceMessages, EmptyVideoMessages, EmptyOfflineMessages, EmptyBlockedUsers, EmptySettings } from './empty-state'

// Confirmation Dialogs
export { default as ConfirmDialog, DeleteConfirmDialog, LeaveGroupDialog, EndCallDialog, SuspendUserDialog, DeleteMessageDialog, RemoveContactDialog, BlockUserDialog, ArchiveConversationDialog, ClearChatHistoryDialog, DeleteAccountDialog, MuteNotificationsDialog, ReportContentDialog } from './confirm-dialog'

// Tooltips and Help Text
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, InfoTooltip, HelpTooltip, WarningTooltip, IconTooltip } from './tooltip'
export { default as HelpText, FormHelpText, ErrorHelpText, SuccessHelpText, KeyboardShortcutHelp, NewFeatureHelp, ProTipHelp, SecurityHelp } from './help-text'

// File Upload Progress
export { FileUploadProgress, FileUploadList } from './file-upload-progress'

// Accessibility Components
export {
  SkipLink,
  LiveRegion,
  VisuallyHidden,
  FocusTrap,
  useAnnouncer,
  useKeyboardNavigation,
  useAriaDescription,
  checkColorContrast,
  useScreenReaderDetection,
  AccessibleButton
} from './accessibility'

// Toast Notifications
export { Toaster } from './sonner'