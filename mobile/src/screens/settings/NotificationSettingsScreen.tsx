import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI } from '../../services/api';
import { useSettingsStore } from '../../stores/settingsStore';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { appearance } = useSettingsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Resolve 'system' theme to actual light/dark
  const isDark = appearance.theme === 'dark' || (appearance.theme === 'system' && false);
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#3a3a3a' : '#f0f0f0',
    primary: '#007AFF',
    accent: isDark ? '#333333' : '#f0f8ff',
  };

  // Notification preferences state
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [contactRequestNotifications, setContactRequestNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [notificationPreviews, setNotificationPreviews] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  // Load settings from backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await notificationAPI.getSettings();
      const settings = response.data.data || response.data;

      // Update state with backend settings
      setMessageNotifications(settings.messageNotifications ?? true);
      setGroupNotifications(settings.groupNotifications ?? true);
      setContactRequestNotifications(settings.contactRequestNotifications ?? true);
      setSoundEnabled(settings.soundEnabled ?? true);
      setVibrationEnabled(settings.vibrationEnabled ?? true);
      setInAppNotifications(settings.inAppNotifications ?? true);
      setNotificationPreviews(settings.notificationPreviews ?? true);
      setDoNotDisturb(settings.doNotDisturb ?? false);
    } catch (error: any) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      setIsSaving(true);
      const settings = {
        messageNotifications,
        groupNotifications,
        contactRequestNotifications,
        soundEnabled,
        vibrationEnabled,
        inAppNotifications,
        notificationPreviews,
        doNotDisturb,
        ...updates,
      };

      await notificationAPI.updateSettings(settings);
    } catch (error: any) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const createToggleHandler = (setter: (value: boolean) => void, key: string) => async (value: boolean) => {
    setter(value);
    await saveSettings({ [key]: value });
  };

  const sections = [
    {
      title: 'MESSAGE NOTIFICATIONS',
      items: [
        {
          label: 'Direct Messages',
          subtitle: 'Receive notifications for direct messages',
          value: messageNotifications,
          onValueChange: createToggleHandler(setMessageNotifications, 'messageNotifications'),
        },
        {
          label: 'Group Messages',
          subtitle: 'Receive notifications for group messages',
          value: groupNotifications,
          onValueChange: createToggleHandler(setGroupNotifications, 'groupNotifications'),
        },
        {
          label: 'Contact Requests',
          subtitle: 'Receive notifications for contact requests',
          value: contactRequestNotifications,
          onValueChange: createToggleHandler(setContactRequestNotifications, 'contactRequestNotifications'),
        },
      ],
    },
    {
      title: 'NOTIFICATION STYLE',
      items: [
        {
          label: 'Sound',
          subtitle: 'Play sound for notifications',
          value: soundEnabled,
          onValueChange: createToggleHandler(setSoundEnabled, 'soundEnabled'),
        },
        {
          label: 'Vibration',
          subtitle: 'Vibrate for notifications',
          value: vibrationEnabled,
          onValueChange: createToggleHandler(setVibrationEnabled, 'vibrationEnabled'),
        },
        {
          label: 'In-App Notifications',
          subtitle: 'Show notifications while using the app',
          value: inAppNotifications,
          onValueChange: createToggleHandler(setInAppNotifications, 'inAppNotifications'),
        },
        {
          label: 'Message Previews',
          subtitle: 'Show message content in notifications',
          value: notificationPreviews,
          onValueChange: createToggleHandler(setNotificationPreviews, 'notificationPreviews'),
        },
      ],
    },
    {
      title: 'DO NOT DISTURB',
      items: [
        {
          label: 'Enable Do Not Disturb',
          subtitle: 'Mute all notifications',
          value: doNotDisturb,
          onValueChange: createToggleHandler(setDoNotDisturb, 'doNotDisturb'),
        },
      ],
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
              {section.items.map((item, index) => (
                <View
                  key={item.label}
                  style={[
                    styles.settingItem,
                    { borderBottomColor: colors.border },
                    index === section.items.length - 1 && styles.settingItemLast,
                  ]}
                >
                  <View style={styles.settingItemLeft}>
                    <Text style={[styles.settingItemLabel, { color: colors.text }]}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    )}
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.infoBox, { backgroundColor: colors.accent }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            System notification settings can be managed in your device settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    minWidth: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionContent: {
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingItemLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 13,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default NotificationSettingsScreen;
