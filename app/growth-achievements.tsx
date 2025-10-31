import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournals, type Skill } from '@/contexts/JournalsContext';
import { Stack } from 'expo-router';
import { LineChart, Trophy, Sparkles } from 'lucide-react-native';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageService } from '@/lib/localStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';

const skillMeta: Record<Skill, { label: string; color: string }> = {
  charisma: { label: 'Charisma', color: '#F59E0B' },
  intellect: { label: 'Intellect', color: '#3B82F6' },
  courage: { label: 'Courage', color: '#10B981' },
  empathy: { label: 'Empathy', color: '#EC4899' },
  creativity: { label: 'Creativity', color: '#8B5CF6' },
  discipline: { label: 'Discipline', color: '#22D3EE' },
};

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
  const rankTitles = ['Noob','Novice','Explorer','Adventurer','Warrior','Champion','Legend','Master','Grandmaster','God'];
  const index = Math.min(Math.floor((level - 1) / 5), rankTitles.length - 1);
  return rankTitles[index];
}

function calculateScore(tokens: number, quests: number): number {
  return tokens * 2 + quests * 100;
}

export default function GrowthAchievementsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { journals } = useJournals();
  const { user } = useAuth();
  const { profile, quests } = useGame();

  const stats = useMemo(() => {
    const counts: Record<Skill, number> = { charisma: 0, intellect: 0, courage: 0, empathy: 0, creativity: 0, discipline: 0 };
    for (const j of journals) { for (const s of j.skills) counts[s] += 1; }
    const total = journals.length;
    const bySkill = (Object.keys(counts) as Skill[]).map((s) => {
      const count = counts[s];
      const level = Math.floor(count / 5) + 1;
      const nextLevelAt = level * 5;
      const progress = Math.min(1, count / nextLevelAt);
      return { key: s, count, level, progress, nextLevelAt };
    }).sort((a, b) => b.count - a.count);
    return { counts, total, bySkill };
  }, [journals]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUsersStr = await localStorageService.getCurrentUser();
      const allUsersStr = await AsyncStorage.getItem('local_users');
      const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];
      const currentUserId = user?.id || storedUsersStr?.id;
      const completedQuests = quests.filter(q => q.completed).length;
      const currentUserTokens = profile.totalPoints;
      const leaderboardData: LeaderboardEntry[] = await Promise.all(
        allUsers.map(async (u: any) => {
          const userQuests = await localStorageService.getUserQuests(u.id);
          const userCompletedQuests = userQuests.filter((q:any) => q.completed).length;
          const tokens = u.id === currentUserId ? currentUserTokens : (u.totalPoints || 0);
          const questsCount = u.id === currentUserId ? completedQuests : userCompletedQuests;
          const level = u.id === currentUserId ? profile.level : (u.level || 1);
          return {
            userId: u.id,
            username: u.username || u.fullName || u.email.split('@')[0],
            level,
            levelTitle: getLevelTitle(level),
            quests: questsCount,
            tokens,
            totalRejections: u.id === currentUserId ? profile.totalRejections : (u.totalRejections || 0),
            isYou: u.id === currentUserId,
            rank: 0,
          };
        })
      );
      leaderboardData.sort((a, b) => calculateScore(b.tokens, b.quests) - calculateScore(a.tokens, a.quests));
      leaderboardData.forEach((e, i) => { e.rank = i + 1; });
      setLeaderboard(leaderboardData);
    } catch (e) {
      console.error('[GrowthAchievements] Leaderboard error', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, quests]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="growth-achievements-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[theme.colors.backgroundTertiary, theme.colors.background]} style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LineChart size={20} color={theme.colors.primary} />
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Growth & Achievements</Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary }}>{stats.total} journals logged</Text>
        </View>

        {stats.bySkill.map((s) => {
          const meta = skillMeta[s.key as Skill];
          return (
            <View key={s.key} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} testID={`growth-card-${s.key}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{meta.label}</Text>
                <View style={[styles.levelPill, { backgroundColor: meta.color + '20' }]}> 
                  <Trophy size={14} color={meta.color} />
                  <Text style={[styles.levelText, { color: meta.color }]}>Lvl {s.level}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.round(s.progress * 100)}%`, backgroundColor: meta.color }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.colors.textSecondary }}>{s.count} actions</Text>
                <Text style={{ color: theme.colors.textSecondary }}>{Math.floor(s.progress * 100)}% to L{s.level + 1}</Text>
              </View>
            </View>
          );
        })}

        <View style={[styles.tip, { backgroundColor: theme.colors.backgroundTertiary }]}>
          <Sparkles size={16} color={theme.colors.secondary} />
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>Tip: Log different skills to unlock balanced growth.</Text>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Leaderboard</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading rankings...</Text>
          </View>
        ) : (
          leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No rankings yet</Text>
            </View>
          ) : (
            leaderboard.map((entry) => (
              <View key={entry.rank} style={[styles.entryCard, { backgroundColor: entry.isYou ? theme.colors.primary + '20' : theme.colors.card }, entry.isYou && { borderWidth: 2, borderColor: theme.colors.primary }]}>
                <View style={styles.entryLeft}>
                  <View style={[styles.rankBadge, getRankBadgeStyle(entry.rank)]}>
                    {entry.rank <= 3 ? (
                      <Text style={styles.rankEmoji}>{getRankEmoji(entry.rank)}</Text>
                    ) : (
                      <Text style={[styles.rankNumber, { color: theme.colors.textSecondary }]}>{entry.rank}</Text>
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
                      <Text style={[styles.levelText, { color: theme.colors.primary }]}>Lv {entry.level} {entry.levelTitle}</Text>
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
          )
        )}
      </ScrollView>
    </View>
  );
}

function getRankEmoji(rank: number): string { if (rank===1) return '🏆'; if (rank===2) return '🥈'; if (rank===3) return '🥉'; return ''; }
function getRankBadgeStyle(rank: number) { if (rank===1) return { backgroundColor: '#FFD70030' }; if (rank===2) return { backgroundColor: '#C0C0C030' }; if (rank===3) return { backgroundColor: '#CD7F3230' }; return { backgroundColor: 'transparent' }; }

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    hero: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroTitle: { fontSize: 18, fontWeight: '800' as const },
    card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800' as const },
    progressBar: { height: 10, backgroundColor: '#FFFFFF20', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
    progressFill: { height: 10, borderRadius: 999 },
    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    levelText: { fontSize: 12, fontWeight: '800' as const },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    tip: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 8 },
    tipText: { fontSize: 12 },
    sectionHeader: { fontSize: 18, fontWeight: '800' as const, marginTop: 12, marginBottom: 8 },
    loadingContainer: { alignItems: 'center', gap: 8, paddingVertical: 20 },
    loadingText: { fontSize: 14 },
    emptyContainer: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { fontSize: 16 },
    entryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
    entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    rankBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    rankEmoji: { fontSize: 24 },
    rankNumber: { fontSize: 18, fontWeight: '700' as const },
    avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '700' as const, color: '#FFFFFF' },
    userInfo: { flex: 1, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    username: { fontSize: 16, fontWeight: '700' as const },
    youBadge: { fontSize: 14, fontWeight: '600' as const },
    levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    entryRight: { alignItems: 'flex-end', gap: 4 },
    questCount: { fontSize: 14, fontWeight: '600' as const },
    tokenRow: { flexDirection: 'row', alignItems: 'center' },
    tokenCount: { fontSize: 16, fontWeight: '700' as const },
  });
}
