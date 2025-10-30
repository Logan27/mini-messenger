import React, { useState, useRef, useEffect } from 'react'
import {
  MoreVertical,
  Edit3,
  Trash2,
  Reply,
  Forward,
  Copy,
  Smile
} from 'lucide-react'
import { Message } from '@/shared/lib/types'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  message: Message
  isOwn: boolean
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string, deleteForEveryone?: boolean) => void
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onReact?: (messageId: string, emoji: string) => void
  className?: string
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onReact,
  className
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteForEveryone, setDeleteForEveryone] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Common emoji reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉']

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditing])

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim())
    }
    setIsEditing(false)
    setEditContent(message.content)
  }

  const handleDelete = () => {
    onDelete?.(message.id, deleteForEveryone)
    setShowDeleteDialog(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleReaction = (emoji: string) => {
    onReact?.(message.id, emoji)
  }

  // Don't show actions for system messages
  if (message.type === 'system') {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
              className
            )}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Reply action - available for all messages */}
          <DropdownMenuItem onClick={() => onReply?.(message)}>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </DropdownMenuItem>

          {/* Forward action - available for all messages */}
          <DropdownMenuItem onClick={() => onForward?.(message)}>
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </DropdownMenuItem>

          {/* Copy action - available for text messages */}
          {message.type === 'text' && (
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
          )}

          {/* Separator */}
          <DropdownMenuSeparator />

          {/* Reaction picker */}
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">React</div>
            <div className="flex flex-wrap gap-1">
              {reactions.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-sm"
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {/* Separator for own messages */}
          {isOwn && <DropdownMenuSeparator />}

          {/* Edit action - only for own text messages */}
          {isOwn && message.type === 'text' && (
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}

          {/* Delete action - only for own messages */}
          {isOwn && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Option to delete for everyone (only show if message is recent) */}
          {isOwn && (
            <div className="flex items-center space-x-2 py-2">
              <input
                type="checkbox"
                id="deleteForEveryone"
                checked={deleteForEveryone}
                onChange={(e) => setDeleteForEveryone(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="deleteForEveryone" className="text-sm">
                Delete for everyone
              </label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}