import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { userAPI } from '../../services/api';

const DataExportScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  const dataCategories = [
    {
      icon: 'person',
      title: 'Profile Information',
      description: 'Username, email, bio, profile picture, phone number',
      color: '#2563eb',
    },
    {
      icon: 'chatbubbles',
      title: 'Messages',
      description: 'All your sent and received messages in conversations',
      color: '#8b5cf6',
    },
    {
      icon: 'document',
      title: 'Files',
      description: 'All uploaded files, images, and media',
      color: '#10b981',
    },
    {
      icon: 'call',
      title: 'Call History',
      description: 'Video and voice call logs, duration, timestamps',
      color: '#f59e0b',
    },
    {
      icon: 'people',
      title: 'Contacts',
      description: 'Your contact list and relationship data',
      color: '#ec4899',
    },
    {
      icon: 'settings',
      title: 'Settings & Preferences',
      description: 'Notification settings, privacy preferences, app settings',
      color: '#6b7280',
    },
  ];

  const handleRequestExport = async () => {
    Alert.alert(
      'Request Data Export',
      'Your data will be compiled and made available for download within 24 hours. You\'ll receive an email with a secure download link (valid for 7 days).',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Export',
          onPress: async () => {
            setIsRequesting(true);
            try {
              // TODO: Call API to request data export
              // await userAPI.requestDataExport();

              // Mock successful request
              await new Promise(resolve => setTimeout(resolve, 1500));
              setExportRequested(true);

              Alert.alert(
                'Export Requested',
                `We'll send an email to ${user?.email} when your data is ready to download.`
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to request data export. Please try again.'
              );
            } finally {
              setIsRequesting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export My Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>GDPR Data Portability</Text>
            <Text style={styles.infoBannerText}>
              You have the right to receive a copy of your personal data in a structured, commonly used format.
            </Text>
          </View>
        </View>

        {/* What's Included Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's included in your export:</Text>
          <View style={styles.categoriesContainer}>
            {dataCategories.map((category, index) => (
              <View key={index} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <Ionicons name={category.icon as any} size={24} color={category.color} />
                </View>
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Process Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works:</Text>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Ionicons name="checkbox-outline" size={24} color="#10b981" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Request Export</Text>
                <Text style={styles.timelineText}>Click the button below to start the process</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Ionicons name="sync" size={24} color="#f59e0b" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Data Preparation</Text>
                <Text style={styles.timelineText}>We compile your data (within 24 hours)</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Ionicons name="mail" size={24} color="#2563eb" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Email Notification</Text>
                <Text style={styles.timelineText}>You'll receive a secure download link</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Ionicons name="download" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Download</Text>
                <Text style={styles.timelineText}>Link valid for 7 days, encrypted JSON format</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.securityText}>
            Your export will be encrypted and requires your account password to access.
          </Text>
        </View>

        {/* Action Button */}
        {exportRequested ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.successTitle}>Export Requested</Text>
            <Text style={styles.successText}>
              Check your email ({user?.email}) for the download link when ready.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRequestExport}
            >
              <Text style={styles.secondaryButtonText}>Request Another Export</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, isRequesting && styles.primaryButtonDisabled]}
            onPress={handleRequestExport}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Request Data Export</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            This export is logged in our audit trail as required by data protection regulations.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    padding: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconContainer: {
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  timelineText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 11,
    marginVertical: 4,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  privacyNote: {
    alignItems: 'center',
  },
  privacyNoteText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default DataExportScreen;
