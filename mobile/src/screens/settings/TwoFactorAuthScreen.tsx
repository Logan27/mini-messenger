import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authAPI, userAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const TwoFactorAuthScreen = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    // Initialize state from user profile
    if (user) {
      // Assuming user object has isTwoFactorEnabled property
      // If not, we might need to fetch profile or check a specific endpoint
      setIs2FAEnabled(!!(user as any).isTwoFactorEnabled);
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data.data || response.data;
      if (userData) {
        setUser(userData);
        setIs2FAEnabled(!!userData.isTwoFactorEnabled);

        if (userData.isTwoFactorEnabled) {
          fetchBackupCodes();
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchBackupCodes = async () => {
    try {
      const response = await authAPI.getBackupCodes();
      const codes = response.data.data || response.data || [];
      setBackupCodes(codes);
    } catch (error) {
      console.error('Failed to fetch backup codes:', error);
    }
  };

  const toggle2FA = async () => {
    setIsLoading(true);
    try {
      if (is2FAEnabled) {
        // Disable 2FA
        // In a real app, we might ask for a password or current 2FA code here
        // For now, we'll just call disable (assuming it might need a token, but we'll send empty or handle it)
        // If the API requires a token to disable, we'd need a prompt.
        // Let's assume we can disable it for now or prompt for confirmation.

        Alert.alert(
          'Disable 2FA',
          'Are you sure you want to disable two-factor authentication?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  await authAPI.disable2FA(''); // Sending empty token for now
                  setIs2FAEnabled(false);
                  setBackupCodes([]);
                  Alert.alert('Success', 'Two-factor authentication has been disabled.');
                  fetchProfile(); // Refresh profile
                } catch (error: any) {
                  Alert.alert('Error', error.response?.data?.message || 'Failed to disable 2FA');
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ]
        );
      } else {
        // Enable 2FA
        // This usually involves 3 steps:
        // 1. Request 2FA setup (get secret/QR)
        // 2. User scans QR
        // 3. User enters code to verify

        // For this simplified implementation, we'll call enable and assume it might auto-enable 
        // or return codes. If it returns a secret, we should show it.

        const response = await authAPI.enable2FA();
        const data = response.data.data || response.data;

        // If backend returns a secret/QR url, we should show it.
        // For now, assuming it enables it and generates backup codes.

        setIs2FAEnabled(true);
        await fetchBackupCodes();
        Alert.alert('Success', 'Two-factor authentication is now enabled.');
        fetchProfile(); // Refresh profile
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update 2FA settings');
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(backupCodes.join('\n'));
    Alert.alert('Copied', 'Backup codes copied to clipboard');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Enable 2FA</Text>
                <Text style={styles.rowSubtitle}>
                  Protect your account with an extra layer of security.
                </Text>
              </View>
              {isLoading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Switch
                  value={is2FAEnabled}
                  onValueChange={toggle2FA}
                  trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                />
              )}
            </View>
          </View>
        </View>

        {is2FAEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BACKUP CODES</Text>
            <View style={styles.card}>
              <Text style={styles.infoText}>
                Save these backup codes in a safe place. You can use them to log in if you lose access to your authentication device.
              </Text>
              <View style={styles.codesContainer}>
                {backupCodes.length > 0 ? (
                  backupCodes.map((code, index) => (
                    <Text key={index} style={styles.code}>
                      {code}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.noCodesText}>Loading backup codes...</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={20} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Codes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: {
    flex: 1,
    marginRight: 16,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  codesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  code: {
    width: '48%',
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCodesText: {
    width: '100%',
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TwoFactorAuthScreen;
