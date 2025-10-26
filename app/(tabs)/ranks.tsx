import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  levelTitle: string;
  quests: number;
  tokens: number;
  isYou?: boolean;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    username: 'TopDawg',
    level: 3,
    levelTitle: 'Novice',
    quests: 29,
    tokens: 3058,
    isYou: true,
  },
  {
    rank: 2,
    username: 'Top2',
    level: 1,
    levelTitle: 'Noob',
    quests: 3,
    tokens: 175,
  },
  {
    rank: 3,
    username: 'broker',
    level: 1,
    levelTitle: 'Noob',
    quests: 3,
    tokens: 250,
  },
  {
    rank: 4,
    username: 'Julie',
    level: 1,
    levelTitle: 'Noob',
    quests: 3,
    tokens: 195,
  },
  {
    rank: 5,
    username: 'Rizn',
    level: 1,
    levelTitle: 'Noob',
    quests: 1,
    tokens: 150,
  },
];

export default function RanksScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Trophy size={24} color={theme.colors.warning} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Leaderboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Top rejection therapists
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {MOCK_LEADERBOARD.map((entry) => (
          <View
            key={entry.rank}
            style={[
              styles.entryCard,
              { backgroundColor: entry.isYou ? theme.colors.primary + '20' : theme.colors.card },
              entry.isYou && { borderWidth: 2, borderColor: theme.colors.primary },
            ]}
          >
            <View style={styles.entryLeft}>
              <View style={[styles.rankBadge, getRankBadgeStyle(entry.rank)]}>
                {entry.rank <= 3 ? (
                  <Text style={styles.rankEmoji}>{getRankEmoji(entry.rank)}</Text>
                ) : (
                  <Text style={[styles.rankNumber, { color: theme.colors.textSecondary }]}>
                    {entry.rank}
                  </Text>
                )}
              </View>

              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>{entry.username.charAt(0)}</Text>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.username, { color: theme.colors.text }]}>
                    {entry.username}
                    {entry.isYou && <Text style={[styles.youBadge, { color: theme.colors.primary }]}> (You)</Text>}
                  </Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '30' }]}>
                  <Text style={[styles.levelText, { color: theme.colors.primary }]}>
                    Lv {entry.level} {entry.levelTitle}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.entryRight}>
              <Text style={[styles.questCount, { color: theme.colors.text }]}>{entry.quests} Quests</Text>
              <View style={styles.tokenRow}>
                <Text style={[styles.tokenCount, { color: theme.colors.warning }]}>⚡ {entry.tokens}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '🏆';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
}

function getRankBadgeStyle(rank: number) {
  switch (rank) {
    case 1:
      return { backgroundColor: '#FFD70030' };
    case 2:
      return { backgroundColor: '#C0C0C030' };
    case 3:
      return { backgroundColor: '#CD7F3230' };
    default:
      return { backgroundColor: 'transparent' };
  }
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    entryCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
    },
    entryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    rankBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rankEmoji: {
      fontSize: 24,
    },
    rankNumber: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    userInfo: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    username: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    youBadge: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    levelBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    levelText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    entryRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    questCount: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenCount: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
  });
}
