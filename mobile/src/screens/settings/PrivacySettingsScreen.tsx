import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../../stores/settingsStore';

const PrivacySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { privacy, loadSettings, updatePrivacy } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const handleBlockedContacts = () => {
    Alert.alert('Blocked Contacts', 'Blocked contacts management coming soon!');
  };

  const handleDataDownload = () => {
    Alert.alert(
      'Download Your Data',
      'You can request a copy of your data. This may take a few minutes to prepare.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request', onPress: () => Alert.alert('Requested', 'Your data will be ready soon.') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Account Deletion', 'Account deletion coming soon!'),
        },
      ]
    );
  };

  const sections = [
    {
      title: 'VISIBILITY',
      items: [
        {
          label: 'Online Status',
          subtitle: 'Show when you\'re online',
          value: privacy.showOnlineStatus,
          onValueChange: (value: boolean) => updatePrivacy({ showOnlineStatus: value }),
        },
        {
          label: 'Last Seen',
          subtitle: 'Show when you were last active',
          value: privacy.showLastSeen,
          onValueChange: (value: boolean) => updatePrivacy({ showLastSeen: value }),
        },
        {
          label: 'Profile Photo',
          subtitle: 'Who can see your profile photo',
          value: privacy.showProfilePhoto,
          onValueChange: (value: boolean) => updatePrivacy({ showProfilePhoto: value }),
        },
      ],
    },
    {
      title: 'MESSAGING',
      items: [
        {
          label: 'Read Receipts',
          subtitle: 'Show when you\'ve read messages',
          value: privacy.showReadReceipts,
          onValueChange: (value: boolean) => updatePrivacy({ showReadReceipts: value }),
        },
        {
          label: 'Typing Indicator',
          subtitle: 'Show when you\'re typing',
          value: privacy.showTypingIndicator,
          onValueChange: (value: boolean) => updatePrivacy({ showTypingIndicator: value }),
        },
      ],
    },
    {
      title: 'CONTACTS & GROUPS',
      items: [
        {
          label: 'Allow Contact Requests',
          subtitle: 'Let others send you contact requests',
          value: privacy.allowContactRequests,
          onValueChange: (value: boolean) => updatePrivacy({ allowContactRequests: value }),
        },
        {
          label: 'Allow Group Invites',
          subtitle: 'Let others add you to groups',
          value: privacy.allowGroupInvites,
          onValueChange: (value: boolean) => updatePrivacy({ allowGroupInvites: value }),
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
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

        {/* Blocked Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLOCKED USERS</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleBlockedContacts}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#fff0f0' }]}>
                  <Ionicons name="ban" size={20} color="#ff3b30" />
                </View>
                <Text style={styles.actionItemLabel}>Blocked Contacts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT DATA</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDataDownload}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#f0f8ff' }]}>
                  <Ionicons name="download-outline" size={20} color="#007AFF" />
                </View>
                <Text style={styles.actionItemLabel}>Download Your Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, styles.settingItemLast]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#fff0f0' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </View>
                <Text style={[styles.actionItemLabel, styles.dangerText]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Some privacy settings may affect your ability to use certain features.
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  dangerText: {
    color: '#ff3b30',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
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

export default PrivacySettingsScreen;
