import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';

const TwoFactorAuthScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'main' | 'setup' | 'verify' | 'backup'>('main');

  // Setup state
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    // TODO: Check if 2FA is already enabled for the user
    // setIsEnabled(user?.twoFactorEnabled || false);
  }, [user]);

  const handleEnable2FA = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to generate QR code and secret
      // const response = await authAPI.enable2FA();
      // setQrCode(response.data.qrCode);
      // setSecret(response.data.secret);

      // Mock data for demonstration
      setSecret('JBSWY3DPEHPK3PXP');
      setQrCode('mock-qr-code-url');
      setStep('setup');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to enable 2FA. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Verify the code with API
      // const response = await authAPI.verify2FASetup(verificationCode);
      // setBackupCodes(response.data.backupCodes);

      // Mock backup codes for demonstration
      setBackupCodes([
        'ABC123DEF',
        'GHI456JKL',
        'MNO789PQR',
        'STU012VWX',
        'YZA345BCD',
        'EFG678HIJ',
        'KLM901NOP',
        'QRS234TUV',
        'WXY567ZAB',
        'CDE890FGH',
      ]);
      setStep('backup');
      setIsEnabled(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Invalid code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = () => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable 2FA? This will make your account less secure.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // TODO: Call API to disable 2FA
              // await authAPI.disable2FA();
              setIsEnabled(false);
              Alert.alert('Success', '2FA has been disabled');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to disable 2FA.'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCopySecret = () => {
    Clipboard.setString(secret);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  const handleCopyBackupCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied', 'Backup code copied to clipboard');
  };

  const renderMainScreen = () => (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, isEnabled ? styles.statusBannerEnabled : styles.statusBannerDisabled]}>
        <Ionicons
          name={isEnabled ? "shield-checkmark" : "shield-outline"}
          size={24}
          color={isEnabled ? "#10b981" : "#6b7280"}
        />
        <Text style={[styles.statusText, isEnabled && styles.statusTextEnabled]}>
          Two-Factor Authentication is {isEnabled ? 'enabled' : 'disabled'}
        </Text>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What is 2FA?</Text>
        <Text style={styles.sectionText}>
          Two-Factor Authentication adds an extra layer of security to your account. When enabled, you'll need both your password and a verification code from your authenticator app to log in.
        </Text>
      </View>

      {/* Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benefits:</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.benefitText}>Protects against unauthorized access</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.benefitText}>Secures your personal data</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.benefitText}>Industry standard security practice</Text>
          </View>
        </View>
      </View>

      {/* Requirements */}
      {!isEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>You'll need:</Text>
          <View style={styles.requirementBox}>
            <Ionicons name="phone-portrait" size={20} color="#2563eb" />
            <Text style={styles.requirementText}>
              An authenticator app like Google Authenticator or Authy
            </Text>
          </View>
        </View>
      )}

      {/* Action Button */}
      {isEnabled ? (
        <TouchableOpacity
          style={[styles.dangerButton, isLoading && styles.dangerButtonDisabled]}
          onPress={handleDisable2FA}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-outline" size={20} color="#fff" />
              <Text style={styles.dangerButtonText}>Disable 2FA</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
          onPress={handleEnable2FA}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Enable 2FA</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderSetupScreen = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.setupIconContainer}>
        <Ionicons name="qr-code" size={60} color="#2563eb" />
      </View>

      <Text style={styles.setupTitle}>Scan QR Code</Text>
      <Text style={styles.setupSubtitle}>
        Open your authenticator app and scan this QR code
      </Text>

      {/* QR Code Placeholder */}
      <View style={styles.qrCodeContainer}>
        <View style={styles.qrCodePlaceholder}>
          <Ionicons name="qr-code" size={120} color="#d1d5db" />
          <Text style={styles.qrCodeLabel}>QR Code</Text>
        </View>
      </View>

      {/* Manual Entry */}
      <Text style={styles.manualEntryTitle}>Or enter this code manually:</Text>
      <View style={styles.secretContainer}>
        <Text style={styles.secretText}>{secret}</Text>
        <TouchableOpacity onPress={handleCopySecret} style={styles.copyButton}>
          <Ionicons name="copy" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('verify')}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setStep('main')}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderVerifyScreen = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.setupIconContainer}>
        <Ionicons name="key" size={60} color="#2563eb" />
      </View>

      <Text style={styles.setupTitle}>Enter Verification Code</Text>
      <Text style={styles.setupSubtitle}>
        Enter the 6-digit code from your authenticator app
      </Text>

      <TextInput
        style={styles.codeInput}
        placeholder="000000"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleVerify}
        disabled={isLoading || verificationCode.length !== 6}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify & Enable</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setStep('setup')}
      >
        <Text style={styles.cancelButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBackupCodesScreen = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.setupIconContainer}>
        <Ionicons name="checkmark-circle" size={60} color="#10b981" />
      </View>

      <Text style={styles.setupTitle}>2FA Enabled!</Text>
      <Text style={styles.setupSubtitle}>
        Save these backup codes in a secure place. You can use them to log in if you lose access to your authenticator app.
      </Text>

      <View style={styles.warningBox}>
        <Ionicons name="warning" size={20} color="#f59e0b" />
        <Text style={styles.warningText}>
          Each code can only be used once. Keep them safe!
        </Text>
      </View>

      <View style={styles.backupCodesContainer}>
        {backupCodes.map((code, index) => (
          <TouchableOpacity
            key={index}
            style={styles.backupCodeItem}
            onPress={() => handleCopyBackupCode(code)}
          >
            <Text style={styles.backupCodeText}>{code}</Text>
            <Ionicons name="copy" size={16} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          setStep('main');
          navigation.goBack();
        }}
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'main') {
              navigation.goBack();
            } else {
              setStep('main');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
        <View style={styles.headerSpacer} />
      </View>

      {step === 'main' && renderMainScreen()}
      {step === 'setup' && renderSetupScreen()}
      {step === 'verify' && renderVerifyScreen()}
      {step === 'backup' && renderBackupCodesScreen()}
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusBannerEnabled: {
    backgroundColor: '#d1fae5',
  },
  statusBannerDisabled: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusTextEnabled: {
    color: '#065f46',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#4b5563',
  },
  requirementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  requirementText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1e40af',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
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
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  dangerButtonDisabled: {
    opacity: 0.6,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  setupIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  qrCodeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  manualEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  secretContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  secretText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1f2937',
    fontWeight: '600',
  },
  copyButton: {
    padding: 8,
  },
  codeInput: {
    fontSize: 32,
    fontFamily: 'monospace',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 32,
    letterSpacing: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  backupCodesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  backupCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backupCodeText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1f2937',
    fontWeight: '600',
  },
});

export default TwoFactorAuthScreen;
