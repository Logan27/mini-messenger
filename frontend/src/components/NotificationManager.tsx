import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';

/**
 * Component that manages global notifications
 * Should be placed inside AuthProvider to access user context
 */
export const NotificationManager = () => {
  useGlobalNotifications();
  return null; // This component doesn't render anything
};

export default NotificationManager;
