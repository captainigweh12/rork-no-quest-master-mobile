import React, { useEffect, useState } from 'react';
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
import Constants from 'expo-constants';

export default function AuthScreen() {
  const router = useRouter();
  const { session, signIn, signUp, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  // If already authenticated, skip this screen.
  useEffect(() => {
    if (session?.user) {
      router.replace('/(tabs)/(home)');
    }
  }, [session?.user, router]);

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
      console.log('🌐 Supabase URL:', (Constants.expoConfig as any)?.extra?.SUPABASE_URL);
      console.log('🔑 Key present:', Boolean((Constants.expoConfig as any)?.extra?.SUPABASE_ANON_KEY));

      if (mode === 'signin') {
        console.log('🔓 Attempting sign in...');
        const result = await signIn(email, password);

        if (result.error) {
          if (result.error.message?.toLowerCase().includes('invalid')) {
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
          if (result.error.message?.toLowerCase().includes('already')) {
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
                  },
                },
              ]
            );
          } else {
            Alert.alert('Sign Up Failed', result.error.message || 'Failed to sign up');
          }
        } else {
          console.log('✅ Sign up successful!');
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            router.replace('/(tabs)/(home)');
          }, 1200);
        }
      }
    } catch (error: any) {
      console.error('💥 Auth error:', error);
      let errorMessage = 'An error occurred';
      if (error?.message?.includes('Network request failed')) {
        errorMessage =
          'Cannot connect to server. Check your internet and try again. If the problem persists, navigate to /test-supabase-direct to diagnose.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      console.log('🔍 Starting Google Sign In flow...');
      const result = await signInWithGoogle();

      if (result?.error) {
        if (result.error.message === 'Sign in cancelled') {
          console.log('ℹ️ User cancelled Google sign in');
        } else {
          Alert.alert('Google Sign In Failed', result.error.message || 'Failed to sign in with Google');
        }
      } else {
        console.log('✅ Google sign in initiated/finished. Waiting for session...');
        // onAuthStateChange in AuthContext will set the session; the effect above will redirect.
        // For web (immediate redirect), we might already be reloading the app.
      }
    } catch (error: any) {
      console.error('💥 Google sign in error:', error);
      Alert.alert('Error', error?.message || 'An error occurred during Google sign in');
    } finally {
      setIsGoogleLoading(false);
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.logoContainer}>
                <Image
                  // PNG or JPG is safest for React Native <Image>. If you want SVG, use react-native-svg + SvgXml.
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/eohjbf0hanlb1q2xjc7pr' }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>

              {showSuccess ? (
                <View style={styles.successContainer}>
                  <CheckCircle size={80} color="#4caf50" strokeWidth={2} />
                  <Text style={styles.successText}>Welcome Hero!</Text>
                  <Text style={styles.successSubtext}>Your account is ready</Text>
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
                    <Pressable style={styles.checkboxContainer} onPress={() => setKeepLoggedIn(!keepLoggedIn)}>
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
                        <Text style={styles.submitText}>{mode === 'signin' ? 'Start Quest' : 'Join the Heroes'}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                    activeOpacity={0.8}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator color="#1a1f3a" />
                    ) : (
                      <>
                        <Image
                          source={{
                            uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg.png',
                          }}
                          style={styles.googleIcon}
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.switchModeContainer}>
                    <Text style={styles.switchModeText}>
                      {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
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
                      <Text style={styles.switchModeLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
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
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    justifyContent: 'center',
  },
  logoContainer: { alignItems: 'center', marginBottom: 80 },
  heroImage: { width: 240, height: 240 },
  formContainer: { width: '100%' },
  inputWrapper: { marginBottom: 20 },
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
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 4 },
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
  checkboxChecked: { backgroundColor: '#ff8a4c' },
  checkboxInner: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#fff' },
  checkboxLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' as const },
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
  submitButtonDisabled: { opacity: 0.6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  submitText: { fontSize: 18, fontWeight: '700' as const, color: '#fff' },
  switchModeContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  switchModeText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', fontWeight: '500' as const },
  switchModeLink: { fontSize: 14, color: '#5b8cde', fontWeight: '700' as const },
  successContainer: { alignItems: 'center', paddingVertical: 60 },
  successText: { fontSize: 28, fontWeight: '700' as const, color: '#fff', marginTop: 24, marginBottom: 8 },
  successSubtext: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' as const },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#1a1f3a' },
});
