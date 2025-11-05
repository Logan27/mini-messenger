import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import type { AuthStackParamList } from '../../types';

type NativeStackNavigationProp<T, K extends keyof T> = any;

type EmailVerificationScreenProps = {
  navigation: NativeStackNavigationProp<
    AuthStackParamList,
    'EmailVerification'
  >;
  route: {
    params?: {
      email?: string;
      token?: string;
      autoVerify?: boolean;
    };
  };
};

export default function EmailVerificationScreen({
  navigation,
  route,
}: EmailVerificationScreenProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'success' | 'error'
  >('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const { email, token, autoVerify } = route.params || {};

  // Auto-verify if token is provided
  useEffect(() => {
    if (token && autoVerify) {
      verifyEmail(token);
    }
  }, [token, autoVerify]);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setIsVerifying(true);
      setErrorMessage('');

      await api.post('/auth/verify-email', {
        token: verificationToken,
      });

      setVerificationStatus('success');

      setTimeout(() => {
        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified. You can now log in.',
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }, 1500);
    } catch (error: any) {
      console.error('Email verification error:', error);

      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to verify email. The link may have expired.';

      setErrorMessage(message);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not provided');
      return;
    }

    try {
      setIsResending(true);
      setErrorMessage('');

      await api.post('/auth/resend-verification', {
        email,
      });

      Alert.alert(
        'Success',
        'Verification email has been resent. Please check your inbox.'
      );

      setCanResend(false);
      setResendTimer(60);
    } catch (error: any) {
      console.error('Resend verification error:', error);

      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to resend verification email.';

      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  const handleManualVerification = () => {
    Alert.prompt(
      'Enter Verification Code',
      'Please enter the verification code from your email',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Verify',
          onPress: (verificationToken) => {
            if (verificationToken) {
              verifyEmail(verificationToken);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderContent = () => {
    if (isVerifying) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.statusText}>Verifying your email...</Text>
        </View>
      );
    }

    if (verificationStatus === 'success') {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.iconContainer, styles.successIcon]}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.statusTitle}>Email Verified!</Text>
          <Text style={styles.statusText}>
            Your email has been successfully verified.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Continue to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (verificationStatus === 'error') {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.iconContainer, styles.errorIcon]}>
            <Ionicons name="close-circle" size={64} color="#ef4444" />
          </View>
          <Text style={styles.statusTitle}>Verification Failed</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleManualVerification}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          {email && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleResendVerification}
              disabled={isResending || !canResend}
            >
              {isResending ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {canResend
                    ? 'Resend Verification Email'
                    : `Resend in ${resendTimer}s`}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Pending state
    return (
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={64} color="#2563eb" />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.description}>
          We've sent a verification link to:
        </Text>
        <Text style={styles.email}>{email || 'your email address'}</Text>
        <Text style={styles.description}>
          Please check your inbox and click the verification link to activate
          your account.
        </Text>

        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <Ionicons name="mail" size={20} color="#6b7280" />
            <Text style={styles.instructionText}>
              Check your inbox (and spam folder)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="link" size={20} color="#6b7280" />
            <Text style={styles.instructionText}>
              Click the verification link
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-done" size={20} color="#6b7280" />
            <Text style={styles.instructionText}>
              Return here to log in
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleManualVerification}
        >
          <Text style={styles.buttonText}>Enter Verification Code</Text>
        </TouchableOpacity>

        {email && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleResendVerification}
            disabled={isResending || !canResend}
          >
            {isResending ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {canResend
                  ? 'Resend Verification Email'
                  : `Resend in ${resendTimer}s`}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIcon: {
    backgroundColor: '#d1fae5',
  },
  errorIcon: {
    backgroundColor: '#fee2e2',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  instructions: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginBottom: 32,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
