import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@settings';

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showProfilePhoto: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  allowContactRequests: boolean;
  allowGroupInvites: boolean;
}

export interface NotificationSettings {
  enableNotifications: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  showPreview: boolean;
  enableGroupNotifications: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
}

interface SettingsState {
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updatePrivacy: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateNotifications: (settings: Partial<NotificationSettings>) => Promise<void>;
  updateAppearance: (settings: Partial<AppearanceSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultPrivacySettings: PrivacySettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  showProfilePhoto: true,
  showReadReceipts: true,
  showTypingIndicator: true,
  allowContactRequests: true,
  allowGroupInvites: true,
};

const defaultNotificationSettings: NotificationSettings = {
  enableNotifications: true,
  enableSound: true,
  enableVibration: true,
  showPreview: true,
  enableGroupNotifications: true,
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 'medium',
  language: 'en',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  privacy: defaultPrivacySettings,
  notifications: defaultNotificationSettings,
  appearance: defaultAppearanceSettings,
  isLoading: false,

  // Actions
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        set({
          privacy: { ...defaultPrivacySettings, ...settings.privacy },
          notifications: { ...defaultNotificationSettings, ...settings.notifications },
          appearance: { ...defaultAppearanceSettings, ...settings.appearance },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updatePrivacy: async (newSettings: Partial<PrivacySettings>) => {
    const updatedPrivacy = { ...get().privacy, ...newSettings };
    set({ privacy: updatedPrivacy });

    try {
      const currentState = get();
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          privacy: currentState.privacy,
          notifications: currentState.notifications,
          appearance: currentState.appearance,
        })
      );
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  },

  updateNotifications: async (newSettings: Partial<NotificationSettings>) => {
    const updatedNotifications = { ...get().notifications, ...newSettings };
    set({ notifications: updatedNotifications });

    try {
      const currentState = get();
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          privacy: currentState.privacy,
          notifications: currentState.notifications,
          appearance: currentState.appearance,
        })
      );
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  },

  updateAppearance: async (newSettings: Partial<AppearanceSettings>) => {
    const updatedAppearance = { ...get().appearance, ...newSettings };
    set({ appearance: updatedAppearance });

    try {
      const currentState = get();
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          privacy: currentState.privacy,
          notifications: currentState.notifications,
          appearance: currentState.appearance,
        })
      );
    } catch (error) {
      console.error('Failed to save appearance settings:', error);
    }
  },

  resetSettings: async () => {
    set({
      privacy: defaultPrivacySettings,
      notifications: defaultNotificationSettings,
      appearance: defaultAppearanceSettings,
    });

    try {
      await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  },
}));
