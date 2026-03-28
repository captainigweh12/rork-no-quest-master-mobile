import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, RefreshCcw, ShieldAlert } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string; redirect_to?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  const canVerify = useMemo(() => {
    return typeof params.token_hash === 'string' && params.token_hash.length > 0;
  }, [params.token_hash]);

  const startVerify = useCallback(async () => {
    if (!canVerify) return;
    setStatus('verifying');
    setErrorText(null);
    try {
      const type = (params.type as string) ?? 'signup';
      const tokenHash = params.token_hash as string;
      console.log('🔐 Verifying email with token_hash:', tokenHash.slice(0, 6) + '...');
      const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
      if (error) {
        console.error('❌ verifyOtp error', error);
        setErrorText(error.message ?? 'Verification failed');
        setStatus('error');
        return;
      }
      console.log('✅ Email verified');
      setStatus('success');
      const redirect = typeof params.redirect_to === 'string' ? params.redirect_to : null;
      if (redirect) {
        setTimeout(() => {
          router.replace(redirect as any);
        }, 800);
      }
    } catch (e: any) {
      console.error('💥 verify exception', e);
      setErrorText(e?.message ?? 'Unknown error');
      setStatus('error');
    }
  }, [canVerify, params.type, params.token_hash, params.redirect_to, router]);

  useEffect(() => {
    if (status === 'idle' && canVerify) {
      startVerify();
    }
  }, [canVerify, startVerify, status]);

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper} testID="verify-email-wrapper">
      <Stack.Screen options={{ title: 'Verify Email' }} />
      <View style={[styles.safe, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}> 
        <View style={styles.card}>
          {status === 'verifying' || status === 'idle' ? (
            <View style={styles.center} testID="verifying-state">
              <ActivityIndicator size="large" color="#FF6B2C" />
              <Text style={styles.title}>Verifying your email…</Text>
              <Text style={styles.subtitle}>This only takes a moment.</Text>
            </View>
          ) : null}

          {status === 'success' ? (
            <View style={styles.center} testID="success-state">
              <CheckCircle2 color="#22C55E" size={56} />
              <Text style={styles.title}>Email verified</Text>
              <Text style={styles.subtitle}>You can continue using the app.</Text>
              <Pressable
                onPress={() => router.replace('/')} 
                style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
                testID="go-home-button"
              >
                <Text style={styles.ctaText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'error' ? (
            <View style={styles.center} testID="error-state">
              <ShieldAlert color="#EF4444" size={56} />
              <Text style={styles.title}>Verification failed</Text>
              <Text style={styles.errorText}>{errorText ?? 'Something went wrong'}</Text>
              <Pressable
                onPress={startVerify}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
                testID="retry-button"
              >
                <RefreshCcw color="#111827" size={18} />
                <Text style={styles.secondaryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!canVerify && status === 'idle' ? (
            <View style={styles.center} testID="missing-token-state">
              <ShieldAlert color="#F59E0B" size={56} />
              <Text style={styles.title}>Missing token</Text>
              <Text style={styles.subtitle}>Open the link from your email on this device.</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.footerBg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0B1026' },
  safe: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  center: { alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' as const, color: '#111827', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' as const },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' as const },
  ctaButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: '100%' as const,
    alignItems: 'center' as const,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#FFFFFF', fontWeight: '700' as const, fontSize: 16 },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  secondaryPressed: { opacity: 0.9 },
  secondaryText: { color: '#111827', fontWeight: '600' as const, fontSize: 15 },
  footerBg: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: '#10163A',
    opacity: Platform.OS === 'web' ? 0.85 : 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});