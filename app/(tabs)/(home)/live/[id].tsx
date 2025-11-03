import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (id) {
      console.log('[LIVE] Redirecting to stream viewer for stream:', id);
      router.replace(`/stream?streamId=${id}&mode=viewer` as any);
    } else {
      console.warn('[LIVE] No stream ID provided, going back');
      router.back();
    }
  }, [id, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
