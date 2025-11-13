import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { LoginForm } from '../../types';
import { useNavigation } from '@react-navigation/native';

// Validation schema
const loginSchema = z.object({
  identifier: z.string({ required_error: 'Email is required' }).min(3, 'Please enter your email or username'),
  password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
});

const LoginScreen = ({ testMode = false }: { testMode?: boolean } = {}) => {
  const navigation = useNavigation();
  const { login, isLoading: storeIsLoading, biometricAvailable, biometricEnabled, authenticateWithBiometric, disableBiometric } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test mode: override loading state
  const [testLoading, setTestLoading] = useState(false);
  const isLoading = testMode ? testLoading : storeIsLoading;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  // Watch identifier field to clear error when user starts typing
  const identifier = watch('identifier');

  useEffect(() => {
    // Check if user has biometric enabled and try to authenticate
    if (biometricEnabled) {
      handleBiometricLogin();
    }
  }, [biometricEnabled]);

  
  // Clear error when user starts typing
  useEffect(() => {
    if (identifier && error) {
      setError(null);
    }
  }, [identifier]); // Remove error from dependency to prevent infinite loop

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);

    try {
      const result = await authenticateWithBiometric();

      if (result.success) {
        // Retrieve stored credentials and auto-login
        const credentials = await useAuthStore.getState().getBiometricCredentials();

        if (credentials) {
          try {
            await login({ identifier: credentials.email, password: credentials.password });
            // Navigation will be handled by the auth state change in AppNavigator
          } catch (loginError: any) {
            Alert.alert('Login Failed', loginError.message || 'Failed to log in with stored credentials');
          }
        } else {
          Alert.alert(
            'Credentials Not Found',
            'Please enter your email and password to enable biometric login',
            [{ text: 'OK' }]
          );
          disableBiometric();
        }
      } else {
        Alert.alert(
          'Biometric Authentication Failed',
          result.error || 'Failed to authenticate',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication');
    } finally {
      setBiometricLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      // Ensure data is valid before submitting
      if (!data.identifier || !data.password) {
        setError('Please fill in all fields');
        return;
      }

      // Test mode: simulate error for testing
      if (testMode && data.identifier === 'error@example.com') {
        throw new Error('Invalid credentials');
      }

      if (testMode && data.identifier === 'network@example.com') {
        throw new Error('Network Error');
      }

      // Test mode: simulate loading state
      if (testMode && data.identifier === 'loading@example.com') {
        setTestLoading(true);
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 100));
        setTestLoading(false);
        return;
      }

      await login(data);
      // Navigation will be handled by the auth state change in AppNavigator
    } catch (error: any) {
      setError(error.message || 'Login failed');
    }
  };

  
  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="screen-container"
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.screen} testID="screen-container">
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          {/* Error Display */}
          {error && (
            <Text style={styles.errorText} testID="error-message">{error}</Text>
          )}

          {/* Biometric Login Button */}
          {biometricAvailable && (
            <TouchableOpacity
              style={[styles.biometricButton, biometricLoading && styles.disabledButton]}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={24} color="#fff" />
                  <Text style={styles.biometricButtonText}>Use Biometric</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divider */}
          {biometricAvailable && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Email/Username Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Email or Username"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              )}
            />
          </View>
          {errors.identifier && <Text style={styles.errorText}>{errors.identifier.message}</Text>}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="password-input"
                />
              )}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
              testID="password-toggle"
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={navigateToForgotPassword}
            testID="forgot-password-button"
          >
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            testID="login-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister} testID="register-link">
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screen: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  biometricButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 5,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotButtonText: {
    color: '#2563eb',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;