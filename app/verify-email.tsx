import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
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
  const { resendConfirmationEmail } = useAuth();
  const insets = useSafeAreaInsets();

  const [email] = useState(params.email || '');
  const [isResending, setIsResending] = useState(false);

  const handleResend = useCallback(async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found');
      return;
    }

    setIsResending(true);

    try {
      const result = await resendConfirmationEmail(email);
      
      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to resend confirmation email');
      } else {
        Alert.alert(
          'Email Resent! 📧',
          'We\'ve sent another confirmation link to your email. Please check your inbox and spam folder.'
        );
      }
    } catch (error: any) {
      console.error('💥 Resend error:', error);
      Alert.alert('Error', error.message || 'Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  }, [email, resendConfirmationEmail]);

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
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Mail size={48} color="#5b8cde" strokeWidth={2} />
                </View>
              </View>

              <View style={styles.headerContainer}>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                  We&apos;ve sent a confirmation link to{'\n'}
                  <Text style={styles.emailText}>{email}</Text>
                </Text>
                <Text style={styles.instructionText}>
                  Click the link in the email to verify your account
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.infoBox}>
                  <CheckCircle size={24} color="#4caf50" strokeWidth={2} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>What to do next:</Text>
                    <Text style={styles.infoText}>
                      1. Open your email inbox{'\n'}
                      2. Look for an email from Rejection Hero{'\n'}
                      3. Click the confirmation link{'\n'}
                      4. Return here to sign in
                    </Text>
                  </View>
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    💡 <Text style={styles.tipBold}>Tip:</Text> Check your spam folder if you don&apos;t see the email
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.resendButton, isResending && styles.resendButtonDisabled]}
                  onPress={handleResend}
                  disabled={isResending}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#ff8a4c', '#5b8cde']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resendGradient}
                  >
                    {isResending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.resendButtonText}>Resend Confirmation Email</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.replace('/auth')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
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
  infoBox: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    flexDirection: 'row',
    gap: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4caf50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: 'rgba(255, 138, 76, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 76, 0.3)',
  },
  tipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: '700' as const,
    color: '#ff8a4c',
  },
  resendButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#ff8a4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600' as const,
  },
});
