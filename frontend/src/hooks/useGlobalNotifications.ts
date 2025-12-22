import { useEffect, useState } from 'react';
import { getAvatarUrl } from "@/lib/avatar-utils";
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
            icon: data.from?.avatar || '/favicon.ico',
            tag: data.contactId,
            requireInteraction: true, // Keep notification until user interacts
            silent: false,
            badge: '/favicon.ico',
          });

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
            icon: data.acceptedBy?.avatar || '/favicon.ico',
            tag: data.contactId,
            requireInteraction: false,
            silent: false,
            badge: '/favicon.ico',
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
            icon: call.caller?.avatar || '/favicon.ico',
            tag: call.id,
            requireInteraction: true, // Keep notification until user interacts
            silent: false,
            badge: '/favicon.ico',
          });

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
    const unsubscribe = socketService.on('message.new', async (newMessage: any) => {

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
        // ... (checks kept identical for brevity in thought process, but I must include them in replacement)
        // Check global notifications toggle first (master switch)
        if ((notificationSettings as any).inAppEnabled === false) return; // Cast to any to avoid Unknown type error

        // Check Do Not Disturb
        if ((notificationSettings as any).doNotDisturb === true) return;

        // Check if push notifications are disabled
        if ((notificationSettings as any).pushEnabled === false) return;

        // Check if message notifications are disabled
        if ((notificationSettings as any).messageNotifications === false) return;

        // Check quiet hours
        if ((notificationSettings as any).quietHoursStart && (notificationSettings as any).quietHoursEnd) {
          // ... logic ...
          // I'll copy the logic from original file to be safe
          const ns = notificationSettings as any;
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const normalizeTime = (time: string) => time.substring(0, 5);
          const quietHoursStart = normalizeTime(ns.quietHoursStart);
          const quietHoursEnd = normalizeTime(ns.quietHoursEnd);
          const isQuietTime = quietHoursStart > quietHoursEnd
            ? (currentTime >= quietHoursStart || currentTime <= quietHoursEnd)
            : (currentTime >= quietHoursStart && currentTime <= quietHoursEnd);
          if (isQuietTime) return;
        }
      }

      // Check if notifications are supported
      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        try {
          const senderName = newMessage.senderUsername || newMessage.sender?.username || 'Someone';
          let notificationBody = newMessage.content || 'You have a new message';

          // Decrypt if needed
          if (newMessage.isEncrypted && newMessage.encryptedContent && newMessage.encryptionMetadata?.nonce) {
            try {
              // Dynamically import encryption service to avoid circular dependencies if any?
              // No, top level import is fine usually.
              const { encryptionService } = await import('@/services/encryptionService');
              const { encryptionAPI } = await import('@/lib/api-client');

              const myKeys = encryptionService.loadKeys();
              if (myKeys) {
                const senderId = newMessage.senderId;
                let senderKey = localStorage.getItem(`public_key_${senderId}`);

                if (!senderKey) {
                  try {
                    const res = await encryptionAPI.getPublicKey(senderId);
                    if (res?.data?.data?.publicKey) {
                      senderKey = res.data.data.publicKey;
                      localStorage.setItem(`public_key_${senderId}`, senderKey);
                    }
                  } catch (e) { console.error('Failed to fetch key for notification', e); }
                }

                if (senderKey) {
                  const decrypted = await encryptionService.decrypt(
                    newMessage.encryptedContent,
                    newMessage.encryptionMetadata.nonce,
                    senderKey
                  );
                  if (decrypted) notificationBody = decrypted;
                }
              }
            } catch (e) {
              console.error('Notification decryption failed', e);
            }
          }

          const notification = new Notification(`New message from ${senderName}`, {
            body: notificationBody,
            icon: getAvatarUrl(newMessage.senderAvatar || newMessage.sender?.avatar) || '/icon.svg',
            tag: newMessage.id,
            requireInteraction: false,
            silent: false,
            badge: '/icon.svg',
          });

          setTimeout(() => notification.close(), 5000);

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (error) {
          console.error('❌ Failed to create notification:', error);
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
