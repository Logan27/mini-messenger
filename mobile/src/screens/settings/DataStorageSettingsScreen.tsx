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

const DataStorageSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data & Storage</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE USAGE</Text>
          <View style={styles.storageCard}>
            <View style={styles.storageRow}>
              <View style={styles.storageItem}>
                <Ionicons name="image-outline" size={24} color="#007AFF" />
                <Text style={styles.storageLabel}>Photos</Text>
                <Text style={styles.storageValue}>245 MB</Text>
              </View>
              <View style={styles.storageItem}>
                <Ionicons name="videocam-outline" size={24} color="#007AFF" />
                <Text style={styles.storageLabel}>Videos</Text>
                <Text style={styles.storageValue}>1.2 GB</Text>
              </View>
              <View style={styles.storageItem}>
                <Ionicons name="document-outline" size={24} color="#007AFF" />
                <Text style={styles.storageLabel}>Files</Text>
                <Text style={styles.storageValue}>87 MB</Text>
              </View>
            </View>
            <View style={styles.storageTotalRow}>
              <Text style={styles.storageTotalLabel}>Total Storage Used</Text>
              <Text style={styles.storageTotalValue}>1.5 GB</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
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

        {/* Storage Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE MANAGEMENT</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleManageStorage}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#f0f8ff' }]}>
                  <Ionicons name="folder-outline" size={20} color="#007AFF" />
                </View>
                <Text style={styles.actionItemLabel}>Manage Storage</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, styles.settingItemLast]}
              onPress={handleClearCache}
            >
              <View style={styles.actionItemLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#fff0f0' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </View>
                <View style={styles.actionItemContent}>
                  <Text style={styles.actionItemLabel}>Clear Cache</Text>
                  <Text style={styles.actionItemSubtitle}>Free up 142 MB</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Network Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NETWORK USAGE</Text>
          <View style={styles.networkCard}>
            <View style={styles.networkRow}>
              <Text style={styles.networkLabel}>Data Used (30 days)</Text>
              <Text style={styles.networkValue}>487 MB</Text>
            </View>
            <View style={styles.networkRow}>
              <Text style={styles.networkLabel}>Messages Sent</Text>
              <Text style={styles.networkValue}>1,234</Text>
            </View>
            <View style={styles.networkRow}>
              <Text style={styles.networkLabel}>Messages Received</Text>
              <Text style={styles.networkValue}>2,456</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
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
  storageCard: {
    backgroundColor: '#fff',
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
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  storageTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  storageTotalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  storageTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
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
  actionItemContent: {
    flex: 1,
  },
  actionItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  actionItemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  networkCard: {
    backgroundColor: '#fff',
    padding: 16,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  networkLabel: {
    fontSize: 15,
    color: '#666',
  },
  networkValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
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

export default DataStorageSettingsScreen;
