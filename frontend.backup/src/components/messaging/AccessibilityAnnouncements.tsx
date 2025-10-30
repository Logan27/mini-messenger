import React from 'react';

interface AccessibilityAnnouncementsProps {
  newMessageCount?: number;
  typingUsers?: string[];
  isOnline?: boolean;
}

/**
 * Component for screen reader announcements
 * Hidden visually but announced to screen readers
 */
export const AccessibilityAnnouncements: React.FC<AccessibilityAnnouncementsProps> = ({
  newMessageCount = 0,
  typingUsers = [],
  isOnline = false,
}) => {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {/* New messages announcement */}
      {newMessageCount > 0 && (
        <div>
          {newMessageCount === 1
            ? 'You have received a new message'
            : `You have received ${newMessageCount} new messages`
          }
        </div>
      )}

      {/* Typing announcement */}
      {typingUsers.length > 0 && (
        <div>
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing`
            : typingUsers.length === 2
            ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
            : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`
          }
        </div>
      )}

      {/* Online status change announcement */}
      {isOnline !== undefined && (
        <div>
          Contact is now {isOnline ? 'online' : 'offline'}
        </div>
      )}
    </div>
  );
};

// Utility for announcing custom messages
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.className = 'sr-only';
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Custom hook for managing announcements
export const useAccessibilityAnnouncements = () => {
  const announceMessage = (message: string) => {
    announceToScreenReader(message);
  };

  const announceNewMessage = (sender: string, content: string) => {
    announceToScreenReader(`New message from ${sender}: ${content}`);
  };

  const announceStatusChange = (status: 'sent' | 'delivered' | 'read' | 'failed') => {
    const statusMessages = {
      sent: 'Message sent',
      delivered: 'Message delivered',
      read: 'Message read',
      failed: 'Message failed to send'
    };
    announceToScreenReader(statusMessages[status]);
  };

  const announceError = (error: string) => {
    announceToScreenReader(`Error: ${error}`);
  };

  return {
    announceMessage,
    announceNewMessage,
    announceStatusChange,
    announceError,
  };
};