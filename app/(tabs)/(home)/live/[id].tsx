import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (hasRedirected) return;
    
    if (authLoading) {
      console.log('[LIVE] Waiting for auth...');
      return;
    }

    if (!user) {
      console.warn('[LIVE] User not authenticated, going back');
      setHasRedirected(true);
      router.back();
      return;
    }

    if (id) {
      console.log('[LIVE] Redirecting to stream viewer for stream:', id);
      setHasRedirected(true);
      router.replace(`/stream?streamId=${id}&mode=viewer` as any);
    } else {
      console.warn('[LIVE] No stream ID provided, going back');
      setHasRedirected(true);
      router.back();
    }
  }, [id, router, user, authLoading, hasRedirected]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {authLoading && (
        <Text style={{ color: theme.colors.textSecondary, marginTop: 16, fontSize: 14, fontWeight: '600' as const }}>Loading...</Text>
      )}
    </View>
  );
}
