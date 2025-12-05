import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const { appearance } = useSettingsStore();
  const theme = appearance.theme;

  // Resolve 'system' theme to actual light/dark
  const isDark = theme === 'dark' || (theme === 'system' && false);
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#3a3a3a' : '#f0f0f0',
    primary: '#007AFF',
    accent: isDark ? '#333333' : '#f0f8ff',
  };

  // Construct full name from user data
  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    return user.email || 'User';
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      disableBiometric();
      Alert.alert('Biometric Disabled', 'Biometric authentication has been disabled.');
    } else {
      const success = await enableBiometric();
      if (success) {
        Alert.alert('Biometric Enabled', 'Biometric authentication has been enabled.');
      } else {
        Alert.alert('Biometric Setup Failed', 'Could not enable biometric authentication.');
      }
    }
  };

  const settingsSections = [
    {
      title: 'ACCOUNT',
      items: [
        {
          icon: 'person-outline',
          label: 'Profile',
          subtitle: 'Edit your profile information',
          onPress: () => navigation.navigate('EditProfile'),
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy',
          subtitle: 'Manage your privacy settings',
          onPress: () => navigation.navigate('PrivacySettings'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Manage notification preferences',
          onPress: () => navigation.navigate('NotificationSettings'),
          showChevron: true,
        },
        {
          icon: 'color-palette-outline',
          label: 'Appearance',
          subtitle: 'Theme and display options',
          onPress: () => navigation.navigate('AppearanceSettings'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          icon: 'server-outline',
          label: 'Data & Storage',
          subtitle: 'Network usage and auto-download',
          onPress: () => navigation.navigate('DataStorageSettings'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        {
          icon: 'finger-print',
          label: 'Biometric Authentication',
          subtitle: biometricEnabled ? 'Enabled' : 'Disabled',
          onPress: () => { },
          showToggle: true,
          toggleValue: biometricEnabled,
          onToggle: handleBiometricToggle,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Security',
          subtitle: 'Password, 2FA, Sessions',
          onPress: () => navigation.navigate('SecuritySettings'),
          showChevron: true,
        },

        {
          icon: 'ban',
          label: 'Blocked Contacts',
          subtitle: 'Manage blocked users',
          onPress: () => navigation.navigate('BlockedContacts'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'PRIVACY & DATA',
      items: [
        {
          icon: 'document-text-outline',
          label: 'Consent Management',
          subtitle: 'Manage your privacy consents',
          onPress: () => navigation.navigate('ConsentManagement'),
          showChevron: true,
        },
        {
          icon: 'download-outline',
          label: 'Export My Data',
          subtitle: 'Download your personal data (GDPR)',
          onPress: () => navigation.navigate('DataExport'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'App Version',
          subtitle: 'v1.0.0',
          onPress: () => { },
          showChevron: false,
        },
      ],
    },
    {
      title: 'DANGER ZONE',
      items: [
        {
          icon: 'trash',
          label: 'Delete Account',
          subtitle: 'Permanently delete your account and data',
          onPress: () => navigation.navigate('AccountDeletion'),
          showChevron: true,
          isDanger: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, isLast: boolean) => {
    const isDanger = item.isDanger || false;
    return (
      <TouchableOpacity
        key={item.label}
        style={[
          styles.settingItem,
          { borderBottomColor: colors.border },
          isLast && styles.settingItemLast
        ]}
        onPress={item.onPress}
        activeOpacity={item.showToggle ? 1 : 0.7}
        disabled={item.showToggle}
      >
        <View style={styles.settingItemLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
            <Ionicons name={item.icon as any} size={24} color={isDanger ? "#ef4444" : colors.primary} />
          </View>
          <View style={styles.settingItemContent}>
            <Text style={[styles.settingItemLabel, { color: colors.text }, isDanger && styles.dangerText]}>{item.label}</Text>
            {item.subtitle && (
              <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        {item.showToggle ? (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : item.showChevron ? (
          <Ionicons name="chevron-forward" size={20} color={isDanger ? "#ef4444" : colors.textSecondary} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      {/* Settings List */}
      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={styles.userAvatar}>
            {user?.profilePicture || user?.avatar ? (
              <Image
                source={{
                  uri: (() => {
                    const avatarUrl = user.profilePicture || user.avatar;
                    if (!avatarUrl) return '';
                    return avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:4000${avatarUrl}`;
                  })()
                }}
                style={styles.avatarImage}
                onError={(error) => console.log('Settings avatar load error:', error.nativeEvent.error)}
              />
            ) : (
              <Text style={styles.avatarText}>
                {getDisplayName()
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{getDisplayName()}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
              {section.items.map((item, itemIndex) =>
                renderSettingItem(item, itemIndex === section.items.length - 1)
              )}
            </View>
          </View>
        ))}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 13,
  },
  dangerText: {
    color: '#ef4444',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default SettingsScreen;
