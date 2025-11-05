import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { AuthStackParamList } from '../../types';

type NativeStackNavigationProp<T, K extends keyof T> = any;

type AccountPendingScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AccountPending'>;
  route: {
    params?: {
      email?: string;
      username?: string;
    };
  };
};

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export default function AccountPendingScreen({
  navigation,
  route,
}: AccountPendingScreenProps) {
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('pending');
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const logout = useAuthStore((state) => state.logout);

  const { email, username } = route.params || {};

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not available');
      return;
    }

    try {
      setIsChecking(true);

      const response = await api.get('/auth/account-status', {
        params: { email },
      });

      const status: AccountStatus = response.data.status;
      setAccountStatus(status);
      setLastChecked(new Date());

      if (status === 'rejected') {
        setRejectionReason(
          response.data.reason || 'Your account was not approved.'
        );
      }

      if (status === 'approved') {
        Alert.alert(
          'Account Approved!',
          'Your account has been approved. You can now log in.',
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Check account status error:', error);

      // If error is 401/403, account might be pending or doesn't exist
      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        setAccountStatus('pending');
      } else {
        Alert.alert(
          'Error',
          'Failed to check account status. Please try again.'
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You can come back later to check your account status.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            logout();
            navigation.navigate('Login');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'You can contact support at support@messenger.app or through our website.',
      [
        {
          text: 'OK',
        },
      ]
    );
  };

  const renderContent = () => {
    switch (accountStatus) {
      case 'pending':
        return (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isChecking}
                onRefresh={checkAccountStatus}
              />
            }
          >
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass-outline" size={64} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Account Pending Approval</Text>
            <Text style={styles.description}>
              Your account is currently being reviewed by our administrators.
              This typically takes 24-48 hours.
            </Text>

            {username && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Username:</Text>
                <Text style={styles.infoValue}>{username}</Text>
              </View>
            )}

            {email && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            )}

            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.statusText}>Registration Complete</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.statusText}>Email Verified</Text>
              </View>
              <View style={styles.statusItem}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={[styles.statusText, styles.pendingText]}>
                  Awaiting Admin Approval
                </Text>
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>What happens next?</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="mail" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  You'll receive an email notification when your account is
                  approved
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="time" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  Check back here to see your account status
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="refresh" size={20} color="#6b7280" />
                <Text style={styles.instructionText}>
                  Pull down to refresh your status
                </Text>
              </View>
            </View>

            {lastChecked && (
              <Text style={styles.lastCheckedText}>
                Last checked: {lastChecked.toLocaleTimeString()}
              </Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={checkAccountStatus}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Check Status</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleContactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.linkButton}>
              <Text style={styles.linkText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'rejected':
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <Ionicons name="close-circle" size={64} color="#ef4444" />
            </View>
            <Text style={styles.title}>Account Not Approved</Text>
            <Text style={styles.errorDescription}>
              Unfortunately, your account was not approved.
            </Text>

            {rejectionReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{rejectionReason}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.buttonText}>Register Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleContactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.linkButton}>
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        );

      case 'suspended':
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.warningIcon]}>
              <Ionicons name="warning" size={64} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Account Suspended</Text>
            <Text style={styles.errorDescription}>
              Your account has been suspended. Please contact support for more
              information.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleContactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.linkButton}>
              <Text style={styles.linkText}>Logout</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    backgroundColor: '#fee2e2',
  },
  warningIcon: {
    backgroundColor: '#fef3c7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  pendingText: {
    fontWeight: '600',
    color: '#f59e0b',
  },
  instructions: {
    width: '100%',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 15,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 15,
    color: '#7f1d1d',
    lineHeight: 22,
  },
  lastCheckedText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
});
