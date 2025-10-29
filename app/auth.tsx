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
  Pressable,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  const handleSubmit = async () => {
    if (!email || !password || (mode === 'signup' && !username)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Starting auth process...');
      console.log('📍 Mode:', mode);
      console.log('📧 Email:', email);
      console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('🔑 Key present:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      
      if (mode === 'signin') {
        console.log('🔓 Attempting sign in...');
        const result = await signIn(email, password);
        
        if (result.error) {
          if (result.error.message.includes('Invalid login credentials')) {
            Alert.alert('Sign In Failed', 'Invalid email or password. Please try again.');
          } else {
            Alert.alert('Sign In Failed', result.error.message || 'Failed to sign in');
          }
        } else {
          console.log('✅ Sign in successful, redirecting to home...');
          router.replace('/(tabs)/(home)');
        }
      } else {
        console.log('📝 Attempting sign up...');
        const result = await signUp(email, password, username);
        
        if (result.error) {
          if (result.error.message?.includes('User already registered')) {
            Alert.alert(
              'Account Exists',
              'An account with this email already exists. Please sign in instead.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Go to Sign In', 
                  onPress: () => {
                    setMode('signin');
                    setPassword('');
                  }
                }
              ]
            );
          } else {
            Alert.alert('Sign Up Failed', result.error.message || 'Failed to sign up');
          }
        } else {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            if (result.data?.session) {
              router.replace('/(tabs)/(home)');
            } else {
              Alert.alert(
                'Account Created',
                'You can now sign in with your email and password.',
                [
                  {
                    text: 'OK',
                    onPress: () => setMode('signin'),
                  },
                ]
              );
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('💥 Auth error:', error);
      console.error('💥 Error type:', typeof error);
      console.error('💥 Error name:', error?.name);
      console.error('💥 Error message:', error?.message);
      console.error('💥 Error toString:', error?.toString?.());
      console.error('💥 Full error:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'An error occurred';
      if (error?.message?.includes('Network request failed')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again. If the problem persists, navigate to /test-supabase-direct to diagnose the issue.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
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
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/eohjbf0hanlb1q2xjc7pr' }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>

              {showSuccess ? (
                <View style={styles.successContainer}>
                  <CheckCircle size={80} color="#4caf50" strokeWidth={2} />
                  <Text style={styles.successText}>Account Created!</Text>
                  <Text style={styles.successSubtext}>
                    Check your email for confirmation
                  </Text>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  {mode === 'signup' && (
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Username</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Choose a username"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                    />
                  </View>

                  {mode === 'signin' && (
                    <Pressable 
                      style={styles.checkboxContainer}
                      onPress={() => setKeepLoggedIn(!keepLoggedIn)}
                    >
                      <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
                        {keepLoggedIn && <View style={styles.checkboxInner} />}
                      </View>
                      <Text style={styles.checkboxLabel}>Keep me logged in</Text>
                    </Pressable>
                  )}

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
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
                        <Text style={styles.submitText}>
                          {mode === 'signin' ? 'Start Quest' : 'Join the Heroes'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.switchModeContainer}>
                    <Text style={styles.switchModeText}>
                      {mode === 'signin' 
                        ? "Don't have an account? " 
                        : "Already have an account? "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setMode(mode === 'signin' ? 'signup' : 'signin');
                        setUsername('');
                        setEmail('');
                        setPassword('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchModeLink}>
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  heroImage: {
    width: 240,
    height: 240,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
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
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ff8a4c',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ff8a4c',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  checkboxLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500' as const,
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
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchModeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500' as const,
  },
  switchModeLink: {
    fontSize: 14,
    color: '#5b8cde',
    fontWeight: '700' as const,
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
