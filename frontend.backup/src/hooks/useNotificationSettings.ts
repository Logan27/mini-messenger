import { useState, useEffect, useCallback } from 'react';
import {
  getNotificationSettings,
  updateNotificationSettings,
  resetNotificationSettings,
  previewNotificationSettings,
  type NotificationSettings,
  type NotificationSettingsUpdate,
  type PreviewResponse,
} from '@/features/notifications/api/notificationSettingsApi';

interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: NotificationSettingsUpdate) => Promise<void>;
  resetSettings: () => Promise<void>;
  previewSettings: (notificationType: string, channel?: string) => Promise<PreviewResponse>;
  refreshSettings: () => Promise<void>;
}

export const useNotificationSettings = (): UseNotificationSettingsReturn => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notification settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch notification settings');
      console.error('Error fetching notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update notification settings
  const updateSettingsHandler = useCallback(async (updates: NotificationSettingsUpdate) => {
    try {
      setError(null);
      const updatedSettings = await updateNotificationSettings(updates);
      setSettings(updatedSettings);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update notification settings');
      console.error('Error updating notification settings:', err);
      throw err; // Re-throw to allow component-level error handling
    }
  }, []);

  // Reset notification settings
  const resetSettingsHandler = useCallback(async () => {
    try {
      setError(null);
      const defaultSettings = await resetNotificationSettings();
      setSettings(defaultSettings);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset notification settings');
      console.error('Error resetting notification settings:', err);
      throw err; // Re-throw to allow component-level error handling
    }
  }, []);

  // Preview notification settings
  const previewSettingsHandler = useCallback(async (
    notificationType: string,
    channel: string = 'inApp'
  ): Promise<PreviewResponse> => {
    try {
      return await previewNotificationSettings(notificationType, channel);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to preview notification settings');
      console.error('Error previewing notification settings:', err);
      throw err;
    }
  }, []);

  // Refresh settings
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings: updateSettingsHandler,
    resetSettings: resetSettingsHandler,
    previewSettings: previewSettingsHandler,
    refreshSettings,
  };
};