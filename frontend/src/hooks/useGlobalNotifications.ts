import { useEffect, useState } from 'react';
import { socketService } from '@/services/socket.service';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

/**
 * Global notification handler for all incoming messages
 * Shows Windows/browser notifications regardless of which chat is open
 */
export function useGlobalNotifications() {
  const { user } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<unknown>(null);
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(new Set());

  // Track when notificationSettings state changes
  useEffect(() => {
  }, [notificationSettings]);

  // Load notification settings and muted conversations
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const response = await apiClient.get('/notification-settings');
        if (response.data?.data?.settings) {
          const newSettings = response.data.data.settings;
          setNotificationSettings(newSettings);
          console.log('✅ State update called with:', newSettings);
        }
      } catch (error) {
        console.error('❌ Failed to load notification settings:', error);
      }
    };

    const loadMutedConversations = async () => {
      try {
        const response = await apiClient.get('/messages/conversations');
        if (response.data?.data) {
          const muted = new Set<string>();
          response.data.data.forEach((conv: unknown) => {
            if (conv.isMuted) {
              // Store both userId and groupId for quick lookup
              if (conv.type === 'direct' && conv.user?.id) {
                muted.add(conv.user.id);
              } else if (conv.type === 'group' && conv.group?.id) {
                muted.add(conv.group.id);
              }
            }
          });
          setMutedConversations(muted);
        }
      } catch (error) {
        console.error('Failed to load muted conversations:', error);
      }
    };

    loadSettings();
    loadMutedConversations();

    // Listen for notification settings updates
    const unsubscribeSettings = socketService.on('notification-settings:updated', (data: unknown) => {
      loadSettings();
    });

    // Listen for contact updates (mute/unmute)
    const unsubscribeContactUpdated = socketService.on('contact.updated', () => {
      loadMutedConversations();
    });

    return () => {
      unsubscribeSettings();
      unsubscribeContactUpdated();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for contact requests
    const unsubscribeContactRequest = socketService.on('contact.request', (data: unknown) => {

      // Check notification settings
      if (notificationSettings) {
        // Check global notifications toggle (master switch)
        if (notificationSettings.inAppEnabled === false) {
          return;
        }

        // Check Do Not Disturb
        if (notificationSettings.doNotDisturb === true) {
          return;
        }

        // Check if push notifications are disabled (only affects browser/desktop notifications)
        if (notificationSettings.pushEnabled === false) {
          return;
        }
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('❌ Notifications API not supported in this browser');
        return;
      }

      // Check permission and show notification
      if (Notification.permission === 'granted') {
        try {
          const senderName = data.from?.username || 'Someone';
          const notification = new Notification(`New contact request from ${senderName}`, {
            body: `${senderName} wants to add you as a contact`,
            icon: data.from?.avatar || '/icon.png',
            tag: data.contactId,
            requireInteraction: true, // Keep notification until user interacts
            silent: false,
            badge: '/icon.png',
          });

          console.log('✅ Contact request notification created');

          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
            // Navigate to contacts page
            window.location.href = '/contacts';
          };
        } catch (error) {
          console.error('❌ Failed to create contact request notification:', error);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    // Listen for contact accepted
    const unsubscribeContactAccepted = socketService.on('contact.accepted', (data: unknown) => {
      console.log('✅ Contact request accepted via socket:', data);

      // Check notification settings
      if (notificationSettings) {
        if (notificationSettings.inAppEnabled === false) {
          return;
        }
        if (notificationSettings.doNotDisturb === true) {
          return;
        }
        if (notificationSettings.pushEnabled === false) {
          return;
        }
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const acceptorName = data.acceptedBy?.username || 'Someone';
          const notification = new Notification(`Contact request accepted`, {
            body: `${acceptorName} accepted your contact request`,
            icon: data.acceptedBy?.avatar || '/icon.png',
            tag: data.contactId,
            requireInteraction: false,
            silent: false,
            badge: '/icon.png',
          });

          setTimeout(() => notification.close(), 5000);
        } catch (error) {
          console.error('❌ Failed to create contact accepted notification:', error);
        }
      }
    });

    // Listen for incoming calls
    const unsubscribeCall = socketService.on('call.incoming', (data: unknown) => {

      // Check notification settings
      if (notificationSettings) {
        if (notificationSettings.inAppEnabled === false) {
          return;
        }
        if (notificationSettings.doNotDisturb === true) {
          return;
        }
        if (notificationSettings.pushEnabled === false) {
          return;
        }
        if (notificationSettings.callNotifications === false) {
          return;
        }
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const call = data.call;
          const callerName = call.caller?.username || call.callerUsername || 'Someone';
          const callType = call.callType === 'video' ? 'Video' : 'Audio';

          const notification = new Notification(`Incoming ${callType} Call`, {
            body: `${callerName} is calling you`,
            icon: call.caller?.avatar || '/icon.png',
            tag: call.id,
            requireInteraction: true, // Keep notification until user interacts
            silent: false,
            badge: '/icon.png',
          });

          console.log('✅ Call notification created');

          // Handle notification click - navigate to chat view to accept/reject call
          notification.onclick = () => {
            window.focus();
            notification.close();
            // Navigate to the conversation
            if (call.callerId) {
              window.location.href = `/chat/${call.callerId}`;
            }
          };
        } catch (error) {
          console.error('❌ Failed to create call notification:', error);
        }
      }
    });

    // Listen for ALL incoming messages
    const unsubscribe = socketService.on('message.new', (newMessage: unknown) => {
      // Don't notify for messages we sent
      if (newMessage.senderId === user.id) {
        return;
      }

      // Check if conversation is muted
      const conversationId = newMessage.groupId || newMessage.senderId;
      if (conversationId && mutedConversations.has(conversationId)) {
        return;
      }

      // Check notification settings
      if (notificationSettings) {

        // Check global notifications toggle first (master switch)
        if (notificationSettings.inAppEnabled === false) {
          return;
        }

        // Check Do Not Disturb (highest priority after global toggle)
        if (notificationSettings.doNotDisturb === true) {
          return;
        }

        // Check if push notifications are disabled (desktop/browser notifications)
        if (notificationSettings.pushEnabled === false) {
          return;
        }

        // Check if message notifications are disabled
        if (notificationSettings.messageNotifications === false) {
          return;
        }

        // Check quiet hours
        if (notificationSettings.quietHoursStart && notificationSettings.quietHoursEnd) {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          // Normalize time strings to HH:MM format (backend may return HH:MM:SS)
          const normalizeTime = (time: string) => time.substring(0, 5);
          const quietHoursStart = normalizeTime(notificationSettings.quietHoursStart);
          const quietHoursEnd = normalizeTime(notificationSettings.quietHoursEnd);

          // Handle overnight periods (e.g., 22:00 to 08:00)
          const isQuietTime = quietHoursStart > quietHoursEnd
            ? (currentTime >= quietHoursStart || currentTime <= quietHoursEnd)
            : (currentTime >= quietHoursStart && currentTime <= quietHoursEnd);

          if (isQuietTime) {
            return;
          } else {
            console.log('✅ Not in quiet hours - notification allowed');
          }
        }
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('❌ Notifications API not supported in this browser');
        return;
      }

      // Check permission status
      if (Notification.permission === 'denied') {
        console.warn('⚠️ Notification permission denied by user. Please enable in browser settings.');
        console.warn('⚠️ Chrome: Settings > Privacy and security > Site Settings > Notifications');
        return;
      }

      if (Notification.permission === 'default') {
        console.warn('⚠️ Notification permission not requested yet. Asking now...');
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('✅ Permission granted! Notifications will work for next message.');
          }
        });
        return;
      }

      // Show notification if permission granted
      if (Notification.permission === 'granted') {
        try {
          const senderName = newMessage.senderUsername || newMessage.sender?.username || 'Someone';
          const notificationBody = newMessage.content || 'You have a new message';

          const notification = new Notification(`New message from ${senderName}`, {
            body: notificationBody,
            icon: newMessage.senderAvatar || newMessage.sender?.avatar || '/icon.png',
            tag: newMessage.id, // Prevent duplicate notifications
            requireInteraction: false,
            silent: false,
            badge: '/icon.png',
          });

          console.log('✅ Notification object created:', notification);

          // Auto-close after 5 seconds
          setTimeout(() => {
            console.log('⏰ Auto-closing notification');
            notification.close();
          }, 5000);

          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
            // Could navigate to the conversation here
          };

          // Handle notification close
          notification.onclose = () => {
          };

          // Handle notification error
          notification.onerror = (error) => {
            console.error('❌ Notification error:', error);
          };

          console.log('✅ Notification created and event handlers attached');
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
          });
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeContactRequest();
      unsubscribeContactAccepted();
      unsubscribeCall();
    };
  }, [user, mutedConversations, notificationSettings]);
}
