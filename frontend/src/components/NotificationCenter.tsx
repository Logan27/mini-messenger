import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import NotificationItem, { type Notification } from '@/components/NotificationItem';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api-client';

// Remove /api from paths since VITE_API_URL already includes it
const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, unknown> | null>(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiClient.get('/notification-settings');
        if (response.data?.data?.settings) {
          setNotificationSettings(response.data.data.settings);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // WebSocket integration (if available)
  useEffect(() => {
    // Listen for notification events from WebSocket
    const handleNotification = (event: CustomEvent) => {
      const newNotification = event.detail as Notification;
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Check if in-app notifications are enabled before showing toast
      if (notificationSettings) {
        // Check global toggle
        if (notificationSettings.inAppEnabled === false) {
          return;
        }

        // Check Do Not Disturb
        if (notificationSettings.doNotDisturb) {
          return;
        }

        // Check quiet hours
        if (notificationSettings.quietHoursStart && notificationSettings.quietHoursEnd) {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const { quietHoursStart, quietHoursEnd } = notificationSettings;

          const isQuietTime = quietHoursStart > quietHoursEnd
            ? (currentTime >= quietHoursStart || currentTime <= quietHoursEnd)
            : (currentTime >= quietHoursStart && currentTime <= quietHoursEnd);

          if (isQuietTime) {
            return;
          }
        }
      }

      // Show toast for new notification
      toast.info(newNotification.title, {
        description: newNotification.body,
      });
    };

    const handleWSNotification = (data: any) => {
      const { notification } = data;
      if (!notification) return;

      const mappedNotification: Notification = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.content,
        senderId: notification.senderId,
        senderName: notification.senderName,
        senderAvatar: notification.senderAvatar,
        createdAt: notification.createdAt,
        read: false
      };

      setNotifications((prev) => [mappedNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.info(mappedNotification.title, {
        description: mappedNotification.body,
      });
    };

    const unsubscribe = socketService.on('notification:new', handleWSNotification);

    window.addEventListener('notification' as keyof WindowEventMap, handleNotification as EventListener);
    return () => {
      window.removeEventListener('notification' as keyof WindowEventMap, handleNotification as EventListener);
      unsubscribe();
    };
  }, [notificationSettings]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.patch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.post(
        `${API_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.delete(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let group = '';
    if (date.toDateString() === today.toDateString()) {
      group = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'Yesterday';
    } else {
      group = formatDistanceToNow(date, { addSuffix: true });
    }

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAll}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Clear all</span>
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see new messages, calls, and updates here
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground">{group}</p>
                  </div>
                  {groupNotifications.map((notification, index) => (
                    <div key={notification.id}>
                      <NotificationItem
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkRead={() => markAsRead(notification.id)}
                      />
                      {index < groupNotifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
