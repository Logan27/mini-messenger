import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userAPI } from '../../services/api';

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
  grantedAt?: string;
}

const ConsentManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [consents, setConsents] = useState<ConsentItem[]>([
    {
      id: 'terms_of_service',
      title: 'Terms of Service',
      description: 'Agreement to our terms and conditions for using the application',
      required: true,
      granted: true,
      grantedAt: new Date().toISOString(),
    },
    {
      id: 'privacy_policy',
      title: 'Privacy Policy',
      description: 'Consent to our privacy policy and data processing practices',
      required: true,
      granted: true,
      grantedAt: new Date().toISOString(),
    },
    {
      id: 'data_processing',
      title: 'Data Processing',
      description: 'Allow processing of your personal data for app functionality',
      required: true,
      granted: true,
      grantedAt: new Date().toISOString(),
    },
    {
      id: 'marketing_emails',
      title: 'Marketing Communications',
      description: 'Receive promotional emails and product updates',
      required: false,
      granted: false,
    },
    {
      id: 'analytics',
      title: 'Analytics & Performance',
      description: 'Help us improve the app by collecting anonymous usage data',
      required: false,
      granted: true,
      grantedAt: new Date().toISOString(),
    },
    {
      id: 'third_party_sharing',
      title: 'Third-Party Services',
      description: 'Share data with trusted third-party services for enhanced features',
      required: false,
      granted: false,
    },
  ]);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    setIsLoading(true);
    try {
      // TODO: Load consents from API
      // const response = await userAPI.getConsents();
      // setConsents(response.data);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleConsent = async (consentId: string, newValue: boolean) => {
    const consent = consents.find(c => c.id === consentId);

    if (!consent) return;

    if (consent.required && !newValue) {
      Alert.alert(
        'Required Consent',
        'This consent is required to use the application. If you withdraw it, your account will be deactivated.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Withdraw & Deactivate',
            style: 'destructive',
            onPress: () => handleWithdrawRequiredConsent(consentId),
          },
        ]
      );
      return;
    }

    // Update local state
    setConsents(prev =>
      prev.map(c =>
        c.id === consentId
          ? {
              ...c,
              granted: newValue,
              grantedAt: newValue ? new Date().toISOString() : undefined,
            }
          : c
      )
    );

    // Save to backend
    setIsSaving(true);
    try {
      // TODO: Update consent on backend
      // await userAPI.updateConsent(consentId, newValue);
      await new Promise(resolve => setTimeout(resolve, 500));

      Alert.alert(
        'Success',
        newValue
          ? 'Consent granted successfully'
          : 'Consent withdrawn successfully'
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update consent'
      );
      // Revert change on error
      setConsents(prev =>
        prev.map(c =>
          c.id === consentId ? { ...c, granted: !newValue } : c
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdrawRequiredConsent = async (consentId: string) => {
    try {
      // TODO: Withdraw consent and deactivate account
      // await userAPI.withdrawRequiredConsent(consentId);
      Alert.alert(
        'Account Deactivated',
        'Your account has been deactivated. You will be logged out.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to auth screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to withdraw consent'
      );
    }
  };

  const handleViewDocument = (documentType: string) => {
    Alert.alert(
      documentType === 'terms_of_service' ? 'Terms of Service' : 'Privacy Policy',
      `Opening ${documentType === 'terms_of_service' ? 'Terms of Service' : 'Privacy Policy'} in browser...`
    );
    // TODO: Open document in WebView or external browser
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consent Management</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading consents...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Consent Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Your Privacy Rights</Text>
            <Text style={styles.infoBannerText}>
              Manage how your data is used. You can withdraw consent at any time.
            </Text>
          </View>
        </View>

        {/* Required Consents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Consents</Text>
          <Text style={styles.sectionSubtitle}>
            These consents are necessary to use the application
          </Text>
          {consents
            .filter(c => c.required)
            .map((consent, index) => (
              <View
                key={consent.id}
                style={[
                  styles.consentCard,
                  index === 0 && styles.consentCardFirst,
                ]}
              >
                <View style={styles.consentHeader}>
                  <View style={styles.consentTitleContainer}>
                    <Text style={styles.consentTitle}>{consent.title}</Text>
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  </View>
                  <Switch
                    value={consent.granted}
                    onValueChange={(value) =>
                      handleToggleConsent(consent.id, value)
                    }
                    trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
                    thumbColor="#fff"
                    disabled={isSaving}
                  />
                </View>
                <Text style={styles.consentDescription}>
                  {consent.description}
                </Text>
                {consent.grantedAt && (
                  <Text style={styles.consentGrantedAt}>
                    Granted on {new Date(consent.grantedAt).toLocaleDateString()}
                  </Text>
                )}
                {(consent.id === 'terms_of_service' || consent.id === 'privacy_policy') && (
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() => handleViewDocument(consent.id)}
                  >
                    <Ionicons name="document-text" size={16} color="#2563eb" />
                    <Text style={styles.viewDocButtonText}>View Document</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
        </View>

        {/* Optional Consents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Consents</Text>
          <Text style={styles.sectionSubtitle}>
            These consents can be withdrawn without affecting core functionality
          </Text>
          {consents
            .filter(c => !c.required)
            .map((consent, index) => (
              <View
                key={consent.id}
                style={[
                  styles.consentCard,
                  index === 0 && styles.consentCardFirst,
                ]}
              >
                <View style={styles.consentHeader}>
                  <Text style={styles.consentTitle}>{consent.title}</Text>
                  <Switch
                    value={consent.granted}
                    onValueChange={(value) =>
                      handleToggleConsent(consent.id, value)
                    }
                    trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
                    thumbColor="#fff"
                    disabled={isSaving}
                  />
                </View>
                <Text style={styles.consentDescription}>
                  {consent.description}
                </Text>
                {consent.grantedAt && (
                  <Text style={styles.consentGrantedAt}>
                    Granted on {new Date(consent.grantedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
        </View>

        {/* GDPR Info */}
        <View style={styles.gdprBox}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.gdprText}>
            All consent changes are logged in our audit trail as required by GDPR and other data protection regulations.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  consentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  consentCardFirst: {
    marginTop: 0,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  consentTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  consentDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  consentGrantedAt: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  viewDocButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 6,
  },
  gdprBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  gdprText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default ConsentManagementScreen;
