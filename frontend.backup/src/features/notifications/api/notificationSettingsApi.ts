import { apiClient } from '@/services/apiClient';

export interface NotificationSettings {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  doNotDisturb: boolean;
  messageNotifications: boolean;
  callNotifications: boolean;
  mentionNotifications: boolean;
  adminNotifications: boolean;
  systemNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettingsUpdate {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  doNotDisturb?: boolean;
  messageNotifications?: boolean;
  callNotifications?: boolean;
  mentionNotifications?: boolean;
  adminNotifications?: boolean;
  systemNotifications?: boolean;
}

export interface NotificationPreview {
  notificationType: string;
  channel: string;
  wouldReceive: boolean;
  isInQuietHours: boolean;
  doNotDisturb: boolean;
  currentSettings: Record<string, any>;
  reason: string;
}

export interface PreviewResponse {
  currentSettings: {
    notificationType: string;
    channel: string;
    wouldReceive: boolean;
    isInQuietHours: boolean;
    doNotDisturb: boolean;
  };
  preview: Array<{
    scenario: string;
    time: string;
    inQuietHours: boolean;
    doNotDisturb: boolean;
    wouldReceive: boolean;
    reason: string;
  }>;
  settings: NotificationSettings;
}

/**
 * Get user's notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await apiClient.get('/notification-settings');
  return response.data.data.settings;
};

/**
 * Update user's notification settings
 */
export const updateNotificationSettings = async (
  settings: NotificationSettingsUpdate
): Promise<NotificationSettings> => {
  const response = await apiClient.put('/notification-settings', settings);
  return response.data.data.settings;
};

/**
 * Reset notification settings to defaults
 */
export const resetNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await apiClient.post('/notification-settings/reset');
  return response.data.data.settings;
};

/**
 * Preview how current settings would affect notifications
 */
export const previewNotificationSettings = async (
  notificationType: string,
  channel: string = 'inApp'
): Promise<PreviewResponse> => {
  const response = await apiClient.get('/notification-settings/preview', {
    params: {
      notificationType,
      channel,
    },
  });
  return response.data.data;
};