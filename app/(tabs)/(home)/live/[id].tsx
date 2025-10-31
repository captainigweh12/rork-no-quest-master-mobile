import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeImage } from '@/components/SafeImage';
import { Radio, Share2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(theme.colors);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Live Quest', headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={[styles.player, { backgroundColor: theme.colors.glass, borderColor: theme.colors.border }]}
          testID="live-player"
        >
          <SafeImage
            uri={`https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1600&auto=format&fit=crop`}
            style={{ width: '100%', height: '100%' }}
            testID="live-player-thumb"
          />
          <View style={[styles.liveBadge, { backgroundColor: '#EF4444' }]}
            testID="live-player-badge"
          >
            <Radio size={12} color="#fff" />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={{ marginTop: 16, gap: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.text }} numberOfLines={2}>Streaming Quest #{id}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>
            Real-time quest streaming. We will upgrade this to HLS when streaming backend is connected.
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable style={[styles.cta, { backgroundColor: theme.colors.primary }]} testID="follow-live">
              <Text style={styles.ctaText}>Follow</Text>
            </Pressable>
            <Pressable style={[styles.ctaOutline, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundTertiary }]} testID="share-live">
              <Share2 size={18} color={theme.colors.text} />
              <Text style={[styles.ctaTextOutline, { color: theme.colors.text }]}>Share</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    player: {
      width: width - 40,
      height: (width - 40) * 0.56,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
    },
    liveBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    cta: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    ctaText: { color: '#fff', fontWeight: '900' },
    ctaOutline: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ctaTextOutline: { fontWeight: '800' },
  });
}
