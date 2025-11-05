import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { userAPI } from '../../services/api';

const AccountDeletionScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');

  const handleContinue = () => {
    setStep('confirmation');
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password to confirm deletion');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This action cannot be undone. Your account and all associated data will be permanently deleted within 30 days.\n\nAre you absolutely sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // TODO: Implement account deletion API endpoint
              // await userAPI.deleteAccount(password);

              Alert.alert(
                'Account Deletion Requested',
                'Your account has been marked for deletion and will be permanently removed within 30 days. You have been logged out.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await logout();
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
                error.response?.data?.message || 'Failed to delete account. Please try again.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (step === 'warning') {
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
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Warning Icon */}
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={80} color="#ef4444" />
          </View>

          <Text style={styles.warningTitle}>Warning: Permanent Action</Text>
          <Text style={styles.warningSubtitle}>
            Please read carefully before proceeding
          </Text>

          {/* What will be deleted */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What will be deleted:</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.infoText}>Your profile and account information</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.infoText}>All your messages and conversations</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.infoText}>Uploaded files and media</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.infoText}>Contact list and relationships</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text style={styles.infoText}>Call history and logs</Text>
              </View>
            </View>
          </View>

          {/* What happens next */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What happens next:</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  Account marked for deletion (30-day processing period)
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="mail" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  Confirmation email sent to {user?.email}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="person-remove" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  You'll appear as "Deleted User" in existing conversations
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="lock-closed" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  Personal data anonymized/deleted per GDPR requirements
                </Text>
              </View>
            </View>
          </View>

          {/* Alternatives */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consider these alternatives:</Text>
            <TouchableOpacity style={styles.alternativeButton}>
              <Ionicons name="log-out-outline" size={20} color="#2563eb" />
              <Text style={styles.alternativeButtonText}>Just log out for now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alternativeButton}>
              <Ionicons name="people-outline" size={20} color="#2563eb" />
              <Text style={styles.alternativeButtonText}>Remove specific contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleContinue}
          >
            <Text style={styles.dangerButtonText}>I Understand, Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Confirmation step
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('warning')}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Deletion</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.confirmationIcon}>
          <Ionicons name="key" size={60} color="#ef4444" />
        </View>

        <Text style={styles.confirmationTitle}>Enter Your Password</Text>
        <Text style={styles.confirmationSubtitle}>
          Please confirm your identity by entering your password
        </Text>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            editable={!isDeleting}
          />
        </View>

        {/* Final Warning */}
        <View style={styles.finalWarningBox}>
          <Ionicons name="warning" size={24} color="#ef4444" />
          <Text style={styles.finalWarningText}>
            This action is irreversible. Your account and all data will be permanently deleted within 30 days.
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setStep('warning')}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
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
  warningIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  warningTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alternativeButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationIcon: {
    alignItems: 'center',
    marginVertical: 24,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  finalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  finalWarningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AccountDeletionScreen;
