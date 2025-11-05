import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // Notification preferences state
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [contactRequestNotifications, setContactRequestNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [notificationPreviews, setNotificationPreviews] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  const sections = [
    {
      title: 'MESSAGE NOTIFICATIONS',
      items: [
        {
          label: 'Direct Messages',
          subtitle: 'Receive notifications for direct messages',
          value: messageNotifications,
          onValueChange: setMessageNotifications,
        },
        {
          label: 'Group Messages',
          subtitle: 'Receive notifications for group messages',
          value: groupNotifications,
          onValueChange: setGroupNotifications,
        },
        {
          label: 'Contact Requests',
          subtitle: 'Receive notifications for contact requests',
          value: contactRequestNotifications,
          onValueChange: setContactRequestNotifications,
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
          onValueChange: setSoundEnabled,
        },
        {
          label: 'Vibration',
          subtitle: 'Vibrate for notifications',
          value: vibrationEnabled,
          onValueChange: setVibrationEnabled,
        },
        {
          label: 'In-App Notifications',
          subtitle: 'Show notifications while using the app',
          value: inAppNotifications,
          onValueChange: setInAppNotifications,
        },
        {
          label: 'Message Previews',
          subtitle: 'Show message content in notifications',
          value: notificationPreviews,
          onValueChange: setNotificationPreviews,
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
          onValueChange: setDoNotDisturb,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <View
                  key={item.label}
                  style={[
                    styles.settingItem,
                    index === section.items.length - 1 && styles.settingItemLast,
                  ]}
                >
                  <View style={styles.settingItemLeft}>
                    <Text style={styles.settingItemLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.settingItemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
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
    backgroundColor: '#f5f5f5',
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
    color: '#666',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#000',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default NotificationSettingsScreen;
