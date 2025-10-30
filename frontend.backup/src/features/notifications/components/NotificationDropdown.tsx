import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Check,
  CheckCheck,
  Archive,
  Trash2,
  Settings,
  Bell,
  BellOff,
  MoreHorizontal,
  MessageSquare,
  Phone,
  User,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react'
import { useNotifications, useNotificationActions } from '../model/useNotifications'
import { Notification } from '@/shared/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const NotificationDropdown: React.FC = () => {
  const [page] = useState(1)
  const { data: notificationsData, isLoading } = useNotifications(page, 10)
  const { markAsRead, markAllAsRead, archive, delete: deleteNotifications } = useNotificationActions()

  const notifications = notificationsData?.data || []

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'mention':
        return <User className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'security':
        return <AlertCircle className="h-4 w-4" />
      case 'system':
      case 'update':
        return <Info className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'urgent') return 'text-red-600'
    if (priority === 'high') return 'text-orange-600'

    switch (type) {
      case 'security':
        return 'text-red-600'
      case 'admin':
        return 'text-blue-600'
      case 'system':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPriorityBadge = (priority: Notification['priority']) => {
    if (priority === 'urgent') {
      return <Badge variant="destructive" className="text-xs">Urgent</Badge>
    }
    if (priority === 'high') {
      return <Badge variant="secondary" className="text-xs">High</Badge>
    }
    return null
  }

  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsRead(notificationIds)
  }

  const handleArchive = (notificationIds: string[]) => {
    archive(notificationIds)
  }

  const handleDelete = (notificationIds: string[]) => {
    deleteNotifications(notificationIds)
  }

  const unreadNotifications = notifications.filter(n => !n.isRead)
  const hasUnread = unreadNotifications.length > 0

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <div className="flex gap-1">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-6 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => console.log('Open notification settings')}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 hover:bg-gray-50 cursor-pointer transition-colors",
                  !notification.isRead && "bg-blue-50/50"
                )}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 mt-0.5",
                    getNotificationColor(notification.type, notification.priority)
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {getPriorityBadge(notification.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.isRead && (
                              <DropdownMenuItem onClick={() => handleMarkAsRead([notification.id])}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleArchive([notification.id])}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete([notification.id])}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {notification.actions.slice(0, 2).map((action, index) => (
                          <Button
                            key={action.id || index}
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => console.log('Notification action:', action)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={() => console.log('View all notifications')}
            >
              View All Notifications
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationDropdown