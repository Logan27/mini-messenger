import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, PhoneOff, AtSign, Shield, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'message' | 'call' | 'missed_call' | 'mention' | 'admin' | 'system';
  title: string;
  body: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkRead: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4" />;
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'missed_call':
      return <PhoneOff className="h-4 w-4 text-destructive" />;
    case 'mention':
      return <AtSign className="h-4 w-4 text-primary" />;
    case 'admin':
      return <Shield className="h-4 w-4 text-amber-500" />;
    case 'system':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

export default function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer relative group',
        !notification.read && 'bg-accent/30'
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
      )}

      {/* Avatar or Icon */}
      {notification.senderAvatar || notification.senderName ? (
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.senderAvatar} />
          <AvatarFallback>
            {notification.senderName ? getInitials(notification.senderName) : '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          {getNotificationIcon(notification.type)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={cn('text-sm font-medium truncate', !notification.read && 'font-semibold')}>
            {notification.title}
          </p>
          <Badge variant="outline" className="h-5 text-xs shrink-0">
            {getNotificationIcon(notification.type)}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
          {notification.body}
        </p>

        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Mark as read button */}
      {!notification.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );
}
