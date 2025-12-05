import React, { useState } from 'react';
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

const DataStorageSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { appearance } = useSettingsStore();

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

  // Storage preferences state
  const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(true);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
  const [autoDownloadFiles, setAutoDownloadFiles] = useState(false);
  const [autoDownloadOnWiFi, setAutoDownloadOnWiFi] = useState(true);
  const [compressMedia, setCompressMedia] = useState(true);
  const [saveToGallery, setSaveToGallery] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will free up space by removing temporary files. Your messages and media will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => Alert.alert('Success', 'Cache cleared successfully!'),
        },
      ]
    );
  };

  const handleManageStorage = () => {
    Alert.alert('Storage Management', 'Detailed storage management coming soon!');
  };

  const sections = [
    {
      title: 'AUTO-DOWNLOAD',
      items: [
        {
          label: 'Photos',
          subtitle: 'Automatically download photos',
          value: autoDownloadPhotos,
          onValueChange: setAutoDownloadPhotos,
        },
        {
          label: 'Videos',
          subtitle: 'Automatically download videos',
          value: autoDownloadVideos,
          onValueChange: setAutoDownloadVideos,
        },
        {
          label: 'Files',
          subtitle: 'Automatically download files',
          value: autoDownloadFiles,
          onValueChange: setAutoDownloadFiles,
        },
        {
          label: 'Only on Wi-Fi',
          subtitle: 'Download media only when connected to Wi-Fi',
          value: autoDownloadOnWiFi,
          onValueChange: setAutoDownloadOnWiFi,
        },
      ],
    },
    {
      title: 'MEDIA SETTINGS',
      items: [
        {
          label: 'Compress Media',
          subtitle: 'Reduce file sizes to save data',
          value: compressMedia,
          onValueChange: setCompressMedia,
        },
        {
          label: 'Save to Gallery',
          subtitle: 'Save downloaded media to device gallery',
          value: saveToGallery,
          onValueChange: setSaveToGallery,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STORAGE USAGE</Text>
          <View style={[styles.storageCard, { backgroundColor: colors.card }]}>
            <View style={styles.storageRow}>
              <View style={styles.storageItem}>
                <Ionicons name="image-outline" size={24} color={colors.primary} />
                <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>Photos</Text>
                <Text style={[styles.storageValue, { color: colors.text }]}>245 MB</Text>
              </View>
              <View style={styles.storageItem}>
                <Ionicons name="videocam-outline" size={24} color={colors.primary} />
                <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>Videos</Text>
                <Text style={[styles.storageValue, { color: colors.text }]}>1.2 GB</Text>
              </View>
              <View style={styles.storageItem}>
                <Ionicons name="document-outline" size={24} color={colors.primary} />
                <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>Files</Text>
                <Text style={[styles.storageValue, { color: colors.text }]}>87 MB</Text>
              </View>
            </View>
            <View style={[styles.storageTotalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.storageTotalLabel, { color: colors.text }]}>Total Storage Used</Text>
              <Text style={[styles.storageTotalValue, { color: colors.primary }]}>1.5 GB</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
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

        {/* Storage Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STORAGE MANAGEMENT</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={handleManageStorage}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name="folder-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.actionItemLabel, { color: colors.text }]}>Manage Storage</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }, styles.settingItemLast]}
              onPress={handleClearCache}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? '#4a1a1a' : '#fff0f0' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </View>
                <View style={styles.actionItemContent}>
                  <Text style={[styles.actionItemLabel, { color: colors.text }]}>Clear Cache</Text>
                  <Text style={[styles.actionItemSubtitle, { color: colors.textSecondary }]}>Free up 142 MB</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Network Usage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NETWORK USAGE</Text>
          <View style={[styles.networkCard, { backgroundColor: colors.card }]}>
            <View style={[styles.networkRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Data Used (30 days)</Text>
              <Text style={[styles.networkValue, { color: colors.text }]}>487 MB</Text>
            </View>
            <View style={[styles.networkRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Messages Sent</Text>
              <Text style={[styles.networkValue, { color: colors.text }]}>1,234</Text>
            </View>
            <View style={[styles.networkRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.networkLabel, { color: colors.textSecondary }]}>Messages Received</Text>
              <Text style={[styles.networkValue, { color: colors.text }]}>2,456</Text>
            </View>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.accent }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Storage and network usage data is approximate and updates periodically.
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
  storageCard: {
    padding: 16,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  storageItem: {
    alignItems: 'center',
  },
  storageLabel: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  storageTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  storageTotalLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  storageTotalValue: {
    fontSize: 18,
    fontWeight: '700',
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
  actionItemContent: {
    flex: 1,
  },
  actionItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  networkCard: {
    padding: 16,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  networkLabel: {
    fontSize: 15,
  },
  networkValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    lineHeight: 18,
  },
});

export default DataStorageSettingsScreen;
