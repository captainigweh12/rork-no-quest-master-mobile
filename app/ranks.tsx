import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageService } from '@/lib/localStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  levelTitle: string;
  quests: number;
  tokens: number;
  totalRejections: number;
  isYou?: boolean;
}

function getLevelTitle(level: number): string {
  const rankTitles = [
    'Noob',
    'Novice',
    'Explorer',
    'Adventurer',
    'Warrior',
    'Champion',
    'Legend',
    'Master',
    'Grandmaster',
    'God',
  ];
  const index = Math.min(Math.floor((level - 1) / 5), rankTitles.length - 1);
  return rankTitles[index];
}

function calculateScore(tokens: number, quests: number): number {
  return tokens * 2 + quests * 100;
}

export default function RanksScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, quests } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[Leaderboard] Loading user data...');
      
      const storedUsersStr = await localStorageService.getCurrentUser();
      const allUsersStr = await AsyncStorage.getItem('local_users');
      const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];
      
      const currentUserId = user?.id || storedUsersStr?.id;
      console.log('[Leaderboard] Found', allUsers.length, 'users');

      const completedQuests = quests.filter(q => q.completed).length;
      const currentUserTokens = profile.totalPoints;

      const leaderboardData: LeaderboardEntry[] = await Promise.all(
        allUsers.map(async (u: any) => {
          const userQuests = await localStorageService.getUserQuests(u.id);
          const userCompletedQuests = userQuests.filter(q => q.completed).length;
          
          const tokens = u.id === currentUserId ? currentUserTokens : (u.totalPoints || 0);
          const quests = u.id === currentUserId ? completedQuests : userCompletedQuests;
          
          return {
            userId: u.id,
            username: u.username || u.fullName || u.email.split('@')[0],
            level: u.id === currentUserId ? profile.level : (u.level || 1),
            levelTitle: getLevelTitle(u.id === currentUserId ? profile.level : (u.level || 1)),
            quests,
            tokens,
            totalRejections: u.id === currentUserId ? profile.totalRejections : (u.totalRejections || 0),
            isYou: u.id === currentUserId,
            rank: 0,
          };
        })
      );

      leaderboardData.sort((a, b) => {
        const scoreA = calculateScore(a.tokens, a.quests);
        const scoreB = calculateScore(b.tokens, b.quests);
        return scoreB - scoreA;
      });

      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      console.log('[Leaderboard] Loaded', leaderboardData.length, 'entries');
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('[Leaderboard] Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, quests]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading rankings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No rankings yet</Text>
            </View>
          ) : (
            leaderboard.map((entry) => (
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
            ))
          )}
        </ScrollView>
      )}
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
    },
  });
}
