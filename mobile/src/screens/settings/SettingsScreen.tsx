import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../stores/authStore';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();

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
          label: 'Privacy & Security',
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
        {
          icon: 'language-outline',
          label: 'Language',
          subtitle: 'English',
          onPress: () => Alert.alert('Language', 'Language selection coming soon!'),
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
        {
          icon: 'download-outline',
          label: 'Media Auto-Download',
          subtitle: 'Manage auto-download settings',
          onPress: () => Alert.alert('Auto-Download', 'Media auto-download settings coming soon!'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        {
          icon: 'shield-checkmark',
          label: 'Two-Factor Authentication',
          subtitle: 'Add extra security to your account',
          onPress: () => navigation.navigate('TwoFactorAuth'),
          showChevron: true,
        },
        {
          icon: 'finger-print',
          label: 'Biometric Authentication',
          subtitle: biometricEnabled ? 'Enabled' : 'Disabled',
          onPress: () => {},
          showToggle: true,
          toggleValue: biometricEnabled,
          onToggle: handleBiometricToggle,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change Password',
          subtitle: 'Update your account password',
          onPress: () => Alert.alert('Change Password', 'Password change coming soon!'),
          showChevron: true,
        },
        {
          icon: 'log-out-outline',
          label: 'Active Sessions',
          subtitle: 'Manage logged-in devices',
          onPress: () => Alert.alert('Sessions', 'Session management coming soon!'),
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
      title: 'SUPPORT',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          subtitle: 'FAQs and contact support',
          onPress: () => Alert.alert('Help', 'Help center coming soon!'),
          showChevron: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          subtitle: 'Read our terms',
          onPress: () => Alert.alert('Terms', 'Terms of service coming soon!'),
          showChevron: true,
        },
        {
          icon: 'shield-outline',
          label: 'Privacy Policy',
          subtitle: 'Read our privacy policy',
          onPress: () => Alert.alert('Privacy', 'Privacy policy coming soon!'),
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
          onPress: () => {},
          showChevron: false,
        },
        {
          icon: 'bug-outline',
          label: 'Report a Bug',
          subtitle: 'Help us improve',
          onPress: () => Alert.alert('Report Bug', 'Bug reporting coming soon!'),
          showChevron: true,
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
        style={[styles.settingItem, isLast && styles.settingItemLast]}
        onPress={item.onPress}
        activeOpacity={item.showToggle ? 1 : 0.7}
        disabled={item.showToggle}
      >
        <View style={styles.settingItemLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as any} size={24} color={isDanger ? "#ef4444" : "#007AFF"} />
          </View>
          <View style={styles.settingItemContent}>
            <Text style={[styles.settingItemLabel, isDanger && styles.dangerText]}>{item.label}</Text>
            {item.subtitle && (
              <Text style={styles.settingItemSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        {item.showToggle ? (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggle}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor="#fff"
          />
        ) : item.showChevron ? (
          <Ionicons name="chevron-forward" size={20} color={isDanger ? "#ef4444" : "#ccc"} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            {user?.avatar ? (
              <Text style={styles.avatarText}>
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            ) : (
              <Ionicons name="person" size={32} color="#fff" />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
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
    color: '#000',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  dangerText: {
    color: '#ef4444',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default SettingsScreen;
