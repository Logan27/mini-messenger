import { useSettingsStore } from '../settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('settingsStore', () => {
  const defaultPrivacy = {
    showOnlineStatus: true,
    showLastSeen: true,
    showProfilePhoto: true,
    showReadReceipts: true,
    showTypingIndicator: true,
    allowContactRequests: true,
    allowGroupInvites: true,
  };

  const defaultNotifications = {
    enableNotifications: true,
    enableSound: true,
    enableVibration: true,
    showPreview: true,
    enableGroupNotifications: true,
  };

  const defaultAppearance = {
    theme: 'system' as const,
    fontSize: 'medium' as const,
    language: 'en',
  };

  beforeEach(() => {
    // Reset store state to defaults
    useSettingsStore.setState({
      privacy: defaultPrivacy,
      notifications: defaultNotifications,
      appearance: defaultAppearance,
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct default state', () => {
      const state = useSettingsStore.getState();

      expect(state.privacy).toEqual(defaultPrivacy);
      expect(state.notifications).toEqual(defaultNotifications);
      expect(state.appearance).toEqual(defaultAppearance);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('loads settings from AsyncStorage successfully', async () => {
      const storedSettings = {
        privacy: {
          ...defaultPrivacy,
          showOnlineStatus: false,
          showLastSeen: false,
        },
        notifications: {
          ...defaultNotifications,
          enableSound: false,
        },
        appearance: {
          ...defaultAppearance,
          theme: 'dark' as const,
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(storedSettings)
      );

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy.showOnlineStatus).toBe(false);
      expect(state.privacy.showLastSeen).toBe(false);
      expect(state.notifications.enableSound).toBe(false);
      expect(state.appearance.theme).toBe('dark');
      expect(state.isLoading).toBe(false);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@settings');
    });

    it('uses defaults when no stored settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy).toEqual(defaultPrivacy);
      expect(state.notifications).toEqual(defaultNotifications);
      expect(state.appearance).toEqual(defaultAppearance);
    });

    it('merges stored settings with defaults', async () => {
      const partialSettings = {
        privacy: { showOnlineStatus: false },
        notifications: {},
        appearance: { theme: 'light' as const },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(partialSettings)
      );

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy.showOnlineStatus).toBe(false);
      expect(state.privacy.showLastSeen).toBe(true); // Default
      expect(state.appearance.theme).toBe('light');
      expect(state.appearance.fontSize).toBe('medium'); // Default
    });

    it('handles AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await useSettingsStore.getState().loadSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy).toEqual(defaultPrivacy);
      expect(state.isLoading).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('sets loading state during load', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(promise);

      const loadPromise = useSettingsStore.getState().loadSettings();

      expect(useSettingsStore.getState().isLoading).toBe(true);

      resolvePromise!(null);
      await loadPromise;

      expect(useSettingsStore.getState().isLoading).toBe(false);
    });
  });

  describe('updatePrivacy', () => {
    it('updates privacy settings', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updatePrivacy({
        showOnlineStatus: false,
        showLastSeen: false,
      });

      const state = useSettingsStore.getState();
      expect(state.privacy.showOnlineStatus).toBe(false);
      expect(state.privacy.showLastSeen).toBe(false);
      expect(state.privacy.showProfilePhoto).toBe(true); // Unchanged
    });

    it('persists settings to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updatePrivacy({
        showOnlineStatus: false,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@settings',
        expect.stringContaining('"showOnlineStatus":false')
      );
    });

    it('persists all settings categories', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updatePrivacy({
        showOnlineStatus: false,
      });

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(savedData);

      expect(parsed).toHaveProperty('privacy');
      expect(parsed).toHaveProperty('notifications');
      expect(parsed).toHaveProperty('appearance');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      await useSettingsStore.getState().updatePrivacy({
        showOnlineStatus: false,
      });

      const state = useSettingsStore.getState();
      expect(state.privacy.showOnlineStatus).toBe(false); // Still updated in memory
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save privacy settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('updateNotifications', () => {
    it('updates notification settings', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateNotifications({
        enableSound: false,
        enableVibration: false,
      });

      const state = useSettingsStore.getState();
      expect(state.notifications.enableSound).toBe(false);
      expect(state.notifications.enableVibration).toBe(false);
      expect(state.notifications.enableNotifications).toBe(true); // Unchanged
    });

    it('persists settings to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateNotifications({
        enableSound: false,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@settings',
        expect.stringContaining('"enableSound":false')
      );
    });

    it('handles AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      await useSettingsStore.getState().updateNotifications({
        enableSound: false,
      });

      const state = useSettingsStore.getState();
      expect(state.notifications.enableSound).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save notification settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('updateAppearance', () => {
    it('updates appearance settings', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateAppearance({
        theme: 'dark',
        fontSize: 'large',
      });

      const state = useSettingsStore.getState();
      expect(state.appearance.theme).toBe('dark');
      expect(state.appearance.fontSize).toBe('large');
      expect(state.appearance.language).toBe('en'); // Unchanged
    });

    it('updates theme only', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateAppearance({
        theme: 'light',
      });

      const state = useSettingsStore.getState();
      expect(state.appearance.theme).toBe('light');
      expect(state.appearance.fontSize).toBe('medium');
    });

    it('updates font size only', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateAppearance({
        fontSize: 'small',
      });

      const state = useSettingsStore.getState();
      expect(state.appearance.fontSize).toBe('small');
      expect(state.appearance.theme).toBe('system');
    });

    it('updates language', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateAppearance({
        language: 'es',
      });

      const state = useSettingsStore.getState();
      expect(state.appearance.language).toBe('es');
    });

    it('persists settings to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().updateAppearance({
        theme: 'dark',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@settings',
        expect.stringContaining('"theme":"dark"')
      );
    });

    it('handles AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      await useSettingsStore.getState().updateAppearance({
        theme: 'dark',
      });

      const state = useSettingsStore.getState();
      expect(state.appearance.theme).toBe('dark');
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save appearance settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('resetSettings', () => {
    it('resets all settings to defaults', async () => {
      // First, change some settings
      useSettingsStore.setState({
        privacy: { ...defaultPrivacy, showOnlineStatus: false },
        notifications: { ...defaultNotifications, enableSound: false },
        appearance: { ...defaultAppearance, theme: 'dark' },
      });

      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy).toEqual(defaultPrivacy);
      expect(state.notifications).toEqual(defaultNotifications);
      expect(state.appearance).toEqual(defaultAppearance);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@settings');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Remove error'));

      await useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.privacy).toEqual(defaultPrivacy); // Still reset in memory
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to reset settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Settings Integration', () => {
    it('updates multiple settings categories independently', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await useSettingsStore.getState().updatePrivacy({ showOnlineStatus: false });
      await useSettingsStore.getState().updateNotifications({ enableSound: false });
      await useSettingsStore.getState().updateAppearance({ theme: 'dark' });

      const state = useSettingsStore.getState();
      expect(state.privacy.showOnlineStatus).toBe(false);
      expect(state.notifications.enableSound).toBe(false);
      expect(state.appearance.theme).toBe('dark');
    });

    it('preserves unrelated settings when updating one category', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Update privacy
      await useSettingsStore.getState().updatePrivacy({ showOnlineStatus: false });

      const state = useSettingsStore.getState();
      // Privacy changed
      expect(state.privacy.showOnlineStatus).toBe(false);
      // Notifications unchanged
      expect(state.notifications).toEqual(defaultNotifications);
      // Appearance unchanged
      expect(state.appearance).toEqual(defaultAppearance);
    });
  });
});
