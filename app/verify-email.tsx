import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const insets = useSafeAreaInsets();

  const [email] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email not found');
      return;
    }

    setIsLoading(true);

    try {
      await verifyEmail(email, code);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        Alert.alert(
          'Email Verified!',
          'Your email has been verified successfully. You can now sign in.',
          [{ text: 'Sign In', onPress: () => router.replace('/auth') }]
        );
      }, 2000);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found');
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerificationCode(email);
      console.log('New verification code:', result.data?.verificationCode);
      Alert.alert('Code Resent', 'A new verification code has been sent. Check the console for the code.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#1a1f3a', '#2d3561']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {showSuccess ? (
                <View style={styles.successContainer}>
                  <CheckCircle size={80} color="#4caf50" strokeWidth={2} />
                  <Text style={styles.successText}>Email Verified!</Text>
                  <Text style={styles.successSubtext}>
                    Redirecting to sign in...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                      <Mail size={48} color="#5b8cde" strokeWidth={2} />
                    </View>
                  </View>

                  <View style={styles.headerContainer}>
                    <Text style={styles.title}>Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                      We&apos;ve sent a 6-digit code to{'\n'}
                      <Text style={styles.emailText}>{email}</Text>
                    </Text>
                    <Text style={styles.instructionText}>
                      Check the console logs for your verification code
                    </Text>
                  </View>

                  <View style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Verification Code</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                        keyboardType="default"
                        maxLength={6}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                      onPress={handleVerify}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#ff8a4c', '#5b8cde']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradient}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitText}>Verify Email</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.resendContainer}>
                      <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
                      <TouchableOpacity
                        onPress={handleResend}
                        disabled={isResending}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.resendLink, isResending && styles.resendLinkDisabled]}>
                          {isResending ? 'Resending...' : 'Resend'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => router.replace('/auth')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backButtonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(91, 140, 222, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(91, 140, 222, 0.3)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '700' as const,
    color: '#5b8cde',
  },
  instructionText: {
    fontSize: 14,
    color: '#ff8a4c',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ff8a4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500' as const,
  },
  resendLink: {
    fontSize: 14,
    color: '#5b8cde',
    fontWeight: '700' as const,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600' as const,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  successText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
