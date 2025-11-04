import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Platform, PanResponder, Modal, Alert, ActivityIndicator, ScrollView, TextInput, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Bell, Trophy, Flame, ArrowRight, ArrowLeft, Plus, Clock, Menu, Users, Radio, Zap, TrendingUp, Gift, Award } from 'lucide-react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Quest } from '@/types';
import SideMenu from '@/components/SideMenu';
import { useCategories, type AppCategory } from '@/contexts/CategoriesContext';
import { SafeImage } from '@/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import { useYouTube } from '@/contexts/YouTubeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useStream } from '@/contexts/StreamContext';
import { useQuery } from '@tanstack/react-query';
import { getUserTeams, type Team } from '@/services/supabase/teams';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');



export default function HomeScreen() {
  const { theme } = useTheme();
  const { profile, quests, progressMap, recordQuestOutcome, addAIQuest } = useGame();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { selected, isLoading: catsLoading } = useCategories();
  const { user } = useAuth();
  const { hasFeature } = useSubscription();
  const { liveStreams } = useStream();
  const [search, setSearch] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [showWinsModal, setShowWinsModal] = useState<boolean>(false);
  const [showPointsModal, setShowPointsModal] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<{ quest: Quest; newStreak: number; leaderboardRank: number } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isGeneratingQuest, setIsGeneratingQuest] = useState<boolean>(false);
  const [questMode, setQuestMode] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const teamsQuery = useQuery({
    queryKey: ['teams-mini', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      return getUserTeams();
    },
    enabled: !!user?.id && hasFeature('teamDashboard'),
  });

  const activeQuests = quests.filter(q => !q.completed);
  const startedQuests = activeQuests.filter(q => q.timerEndAt);

  useEffect(() => {
    const shouldFocus = params?.focus === '1' || params?.focus === 'true';
    if (shouldFocus && activeQuests.length > 0) {
      console.log('Focus param detected, entering quest mode');
      setQuestMode(true);
      setCurrentIndex(0);
    }
  }, [params?.focus, activeQuests.length]);

  const styles = createStyles(theme.colors);
  const categoriesHorizontal = useMemo(() => (catsLoading ? [] : selected).slice(0, 12), [catsLoading, selected]);
  const { isConnected: ytConnected, live: ytLive, goLive } = useYouTube();
  
  const allLiveStreams = useMemo(() => {
    const streams = liveStreams.map((stream) => ({
      id: stream.id,
      title: stream.title,
      streamerName: stream.streamerName,
      viewers: stream.viewerCount,
      thumbnail: stream.thumbnailUrl ?? 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1200&auto=format&fit=crop',
      questTitle: stream.questTitle,
      isWebRTC: true,
    }));

    if (ytConnected && ytLive?.isLive && ytLive.videoId) {
      streams.push({
        id: ytLive.videoId,
        title: ytLive.liveTitle ?? 'Live Now',
        streamerName: 'You',
        viewers: typeof ytLive.concurrentViewers === 'number' ? ytLive.concurrentViewers : 0,
        thumbnail: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1200&auto=format&fit=crop',
        questTitle: undefined,
        isWebRTC: false,
      });
    }

    return streams;
  }, [liveStreams, ytConnected, ytLive]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={theme.mode === 'dark' ? ['#0F1419', '#1A1F2E', '#242938'] : ['#F5F7FA', '#E8ECF0', '#FAFBFC']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/profile' as any)}
          style={[styles.profileButton, {
            backgroundColor: theme.colors.glass,
            borderWidth: 0,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          }]}
          testID="profile-avatar-button"
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setShowStreakModal(true);
            }}
            style={({ pressed }) => [{
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }]
            }]}
            testID="stat-streak-badge"
          >
            <View style={[
              styles.statBadge,
              {
                backgroundColor: theme.colors.glass,
                borderWidth: 0,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }
            ]}>
              <Text style={[styles.statValue, { color: theme.colors.error }]}>🔥 {profile.streak}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setShowWinsModal(true);
            }}
            style={({ pressed }) => [{
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }]
            }]}
            testID="stat-wins-badge"
          >
            <View style={[
              styles.statBadge,
              {
                backgroundColor: theme.colors.glass,
                borderWidth: 0,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }
            ]}>
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>🏆 {profile.totalRejections}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setShowPointsModal(true);
            }}
            style={({ pressed }) => [{
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }]
            }]}
            testID="stat-points-badge"
          >
            <View style={[
              styles.statBadge,
              {
                backgroundColor: theme.colors.glass,
                borderWidth: 0,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }
            ]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>💎 {profile.totalPoints}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.glass,
                borderWidth: 0,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }
            ]}
            onPress={() => router.push('/notifications' as any)}
          >
            <Bell size={20} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.glass,
                borderWidth: 0,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }
            ]}
            onPress={() => setMenuOpen(true)}
            testID="hamburger-button"
          >
            <Menu size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <SideMenu 
        visible={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        theme={theme.colors} 
      />

      {!questMode ? (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.colors.text }}>Watch Live</Text>

            <DailyAITaskBanner theme={theme} onPress={() => setQuestMode(true)} />
            <View style={[styles.searchBar, { borderColor: theme.colors.border, backgroundColor: theme.colors.glass }]}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search live channels or streamers"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.searchInput}
                testID="live-search"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, gap: 12 }}
              testID="categories-horizontal"
            >
              {categoriesHorizontal.map((c: AppCategory) => {
                return (
                  <Pressable
                    key={`hcat-${c.id}`}
                    onPress={() => router.push(`/(tabs)/(home)/category/${c.id}` as any)}
                    style={({ pressed }) => [styles.gamePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, opacity: pressed ? 0.8 : 1 }]}
                    testID={`hcat-${c.id}`}
                  >
                    <View style={[styles.gameIconWrap, { borderColor: theme.colors.border }]}> 
                      <SafeImage uri={c.image} style={styles.gameIcon} testID={`hcat-icon-${c.id}`} />
                    </View>
                    <Text style={[styles.gameLabel, { color: theme.colors.text }]} numberOfLines={1}>{c.title}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {allLiveStreams.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                testID="live-now-scroll"
              >
                {allLiveStreams.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      if (s.isWebRTC) {
                        router.push(`/stream?streamId=${s.id}&mode=viewer` as any);
                      } else {
                        Linking.openURL(`https://www.youtube.com/watch?v=${s.id}`);
                      }
                    }}
                    style={({ pressed }) => [styles.liveCard, { backgroundColor: theme.colors.glass, borderColor: theme.colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                    testID={`live-${s.id}`}
                  >
                    <View style={styles.liveThumbWrap}>
                      <SafeImage uri={s.thumbnail} style={styles.liveThumb} testID={`live-thumb-${s.id}`} />
                      <View style={[styles.liveBadge, { backgroundColor: '#EF4444' }]}>
                        <Radio size={12} color="#fff" />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                      <View style={[styles.viewerBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.viewerText}>{Intl.NumberFormat().format(s.viewers)}</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={[styles.liveTitle, { color: theme.colors.text }]} numberOfLines={1}>{s.title}</Text>
                      <Text style={[{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 }]} numberOfLines={1}>{s.streamerName}</Text>
                      {s.questTitle && (
                        <Text style={[{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }]} numberOfLines={1}>Quest: {s.questTitle}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.liveEmptyCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.glass }]} testID="live-empty">
                <Text style={[styles.liveEmptyTitle, { color: theme.colors.text }]}>No channels are live</Text>
                <Text style={[styles.liveEmptySubtitle, { color: theme.colors.textSecondary }]}>Start a stream or connect your YouTube to go live</Text>
                <Pressable
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                    router.push('/stream-videosdk' as any);
                  }}
                  style={({ pressed }) => [styles.livePrimaryBtn, { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  testID="btn-start-live"
                >
                  <Text style={styles.livePrimaryBtnText}>Go Live (VideoSDK)</Text>
                </Pressable>
                {ytConnected && (
                  <Pressable
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                      goLive();
                    }}
                    style={({ pressed }) => [styles.liveSecondaryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundTertiary, opacity: pressed ? 0.9 : 1 }]}
                    testID="btn-start-youtube-live"
                  >
                    <Text style={[styles.liveSecondaryBtnText, { color: theme.colors.text }]}>Start YouTube Live</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={{ gap: 12, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '900' as const, color: theme.colors.text }}>Groups</Text>
              <Pressable onPress={() => router.push('/teams' as any)} testID="see-all-groups" style={({pressed})=>[{opacity: pressed?0.7:1}]}> 
                <Text style={{ color: theme.colors.primary, fontWeight: '800' as const }}>See all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              testID="groups-horizontal"
            >
              {(teamsQuery.data as Team[] | undefined)?.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push('/teams' as any)}
                  style={({ pressed }) => [
                    styles.groupPill,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.9 : 1 },
                  ]}
                  testID={`group-${t.id}`}
                >
                  <View style={[styles.groupAvatar, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.border }]}> 
                    <Users size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.groupLabel, { color: theme.colors.text }]} numberOfLines={1}>{t.name}</Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => router.push(hasFeature('teamDashboard') ? '/teams' as any : '/subscription' as any)}
                style={({ pressed }) => [
                  styles.groupPill,
                  { backgroundColor: theme.colors.glass, borderColor: theme.colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
                testID="create-group-pill"
              >
                <View style={[styles.groupAvatar, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                  <Plus size={18} color="#fff" />
                </View>
                <Text style={[styles.groupLabel, { color: theme.colors.text }]}>Create Group</Text>
              </Pressable>
            </ScrollView>
          </View>

          <View style={[styles.heroBanner, { display: 'none', 
            backgroundColor: theme.colors.glass,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Complete 3 Quests today</Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>Earn bonus XP and keep your streak alive</Text>
            </View>
            <View style={{
              backgroundColor: theme.colors.primary,
              padding: 12,
              borderRadius: 16,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <Users size={28} color="#fff" />
            </View>
          </View>



          {startedQuests.length > 0 && (
            <View style={{ marginTop: 24, gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Active Quests</Text>
              {startedQuests.map((q, idx) => {
                const remaining = q.timerEndAt ? Math.max(0, new Date(q.timerEndAt).getTime() - Date.now()) : null;
                const prog = progressMap[q.id] ?? { noCount: 0, yesCount: 0 };
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      const originalIndex = activeQuests.findIndex(aq => aq.id === q.id);
                      setQuestMode(true);
                      setCurrentIndex(originalIndex);
                    }}
                    style={({ pressed }) => [
                      styles.activeQuestItem,
                      {
                        borderWidth: 0,
                        backgroundColor: theme.colors.glass,
                        shadowColor: theme.colors.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 4,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      }
                    ]}
                    testID={`active-quest-${q.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text }}>{q.title}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }} numberOfLines={1}>
                        NOs: {prog.noCount}{typeof q.minNoRequired === 'number' ? `/${q.minNoRequired}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.activeQuestPill, { borderColor: theme.colors.border }]}>
                      <Clock size={14} color={theme.colors.textSecondary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
                        {remaining !== null ? formatTime(remaining) : 'Not started'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : null}

      {questMode && (isGeneratingQuest || activeQuests.length > 0) && (
        <View style={styles.cardsContainer} testID="home-cards-container">
          {isGeneratingQuest ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>Generating Your Next Quest...</Text>
              <Text style={[styles.loadingSubtitle, { color: theme.colors.textSecondary }]}>Creating a personalized challenge just for you</Text>
            </View>
          ) : (
            activeQuests
              .filter((_, index) => index >= currentIndex)
              .map((quest, filteredIndex) => {
                const index = currentIndex + filteredIndex;
                return (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    index={index}
                    currentIndex={currentIndex}
                    onSwipeLeft={() => {
                      recordQuestOutcome(quest.id, 'yes');
                      return false;
                    }}
                    onSwipeRight={() => {
                      const prog = progressMap[quest.id] ?? { noCount: 0, yesCount: 0 };
                      const nextNo = prog.noCount + 1;
                      const minNo = typeof quest.minNoRequired === 'number' ? quest.minNoRequired : 0;
                      recordQuestOutcome(quest.id, 'no');
                      const shouldAdvance = minNo > 0 && nextNo >= minNo;
                      if (shouldAdvance) {
                        setCurrentIndex((i) => i + 1);
                        setTimeout(() => {
                          const rank = Math.floor(Math.random() * 100) + 1;
                          setCompletionData({ quest, newStreak: profile.streak + 1, leaderboardRank: rank });
                          setShowCompletionModal(true);
                        }, 500);
                      }
                      return shouldAdvance;
                    }}
                    onTimerExpire={(penalty) => {
                      setCurrentIndex((i) => i + 1);
                      setTimeout(() => {
                        Alert.alert(
                          'Quest Failed',
                          `Time's up! You lost ${penalty.xp} XP and ${penalty.points} points. Your streak was reduced by 1.`,
                          [{ text: 'OK' }]
                        );
                      }, 100);
                    }}
                    onBackToMain={() => setQuestMode(false)}
                    theme={theme}
                  />
                );
              })
              .reverse()
          )}
        </View>
      )}

      {questMode && activeQuests.length > 0 && (
        <View style={[styles.instructions, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
            Complete your quests in order • Friend quests can be done anytime
          </Text>
          <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
            Max 2 active quests • Extra quests go to queue
          </Text>
        </View>
      )}

      <QuestCompletionModal
        visible={showCompletionModal}
        quest={completionData?.quest}
        newStreak={completionData?.newStreak ?? 0}
        leaderboardRank={completionData?.leaderboardRank ?? 0}
        onClose={() => setShowCompletionModal(false)}
        onNextQuest={async () => {
          setIsGeneratingQuest(true);
          try {
            console.log('Generating new AI quest based on completed quest...');
            const completedQuest = completionData?.quest;
            const currentDifficulty = completedQuest?.difficulty ?? 'easy';
            const difficultyProgression: Record<string, 'easy' | 'medium' | 'hard' | 'extreme'> = {
              easy: 'easy',
              medium: 'medium',
              hard: 'hard',
              extreme: 'extreme',
            };
            const nextDifficulty = difficultyProgression[currentDifficulty] ?? 'medium';
            const categoryId = completedQuest?.category as any;
            console.log('[QUEST] AI STAYING ON CATEGORY:', categoryId, 'from quest:', completedQuest?.title);
            const newQuest = await addAIQuest(nextDifficulty, false, completedQuest, categoryId);
            console.log('[QUEST] New quest generated in category:', newQuest.category, '| Quest:', newQuest.title);
            
            setShowCompletionModal(false);
            setCompletionData(null);
            setCurrentIndex(0);
          } catch (error) {
            console.error('Failed to generate quest:', error);
            Alert.alert('Error', 'Failed to generate quest. Please try again.');
          } finally {
            setIsGeneratingQuest(false);
          }
        }}
        onCreateCustom={() => {
          setShowCompletionModal(false);
          router.push('/create-quest' as any);
        }}
        isGeneratingQuest={isGeneratingQuest}
        theme={theme}
      />

      <StatsModal
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        type="streak"
        value={profile.streak}
        theme={theme}
        quests={quests}
      />

      <StatsModal
        visible={showWinsModal}
        onClose={() => setShowWinsModal(false)}
        type="wins"
        value={profile.totalRejections}
        theme={theme}
        quests={quests}
      />

      <StatsModal
        visible={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        type="points"
        value={profile.totalPoints}
        theme={theme}
        quests={quests}
      />
    </View>
  );
}

function DailyAITaskBanner({ theme, onPress }: { theme: any; onPress: () => void }) {
  const dailyTasks = [
    "Ask a stranger for feedback on your idea",
    "Request a ridiculous discount at a coffee shop",
    "Cold email a CEO you admire",
    "Start a conversation with someone intimidating",
    "Pitch your idea to 3 strangers today",
  ];
  const [task] = useState(() => dailyTasks[new Date().getDate() % dailyTasks.length]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 2,
        backgroundColor: theme.mode === 'dark' ? '#1a103d' : '#f0e7ff',
        borderColor: theme.colors.primary,
      }}
      testID="daily-task-banner"
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Zap size={18} color={theme.colors.primary} fill={theme.colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '900' as const, letterSpacing: 0.5, color: theme.colors.primary }}>Today&apos;s Fearless Task</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600' as const, lineHeight: 18, color: theme.colors.text }} numberOfLines={2}>
          {task}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
          onPress();
        }}
        style={({ pressed }) => [{
          backgroundColor: theme.colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 12,
          opacity: pressed ? 0.85 : 1,
        }]}
        testID="daily-task-start"
      >
        <Text style={{ color: '#fff', fontWeight: '900' as const, fontSize: 13 }}>Start Now</Text>
      </Pressable>
    </View>
  );
}

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'streak' | 'wins' | 'points';
  value: number;
  theme: any;
  quests: Quest[];
}

function StatsModal({ visible, onClose, type, value, theme, quests }: StatsModalProps) {
  const completedQuests = quests.filter(q => q.completed);
  const colors = theme.colors;

  const modalConfig = {
    streak: {
      icon: Flame,
      color: '#EF4444',
      title: 'Streak History',
      subtitle: `${value} day streak`,
      description: 'Keep completing quests daily to maintain your streak!',
    },
    wins: {
      icon: Trophy,
      color: '#F59E0B',
      title: 'Completed Challenges',
      subtitle: `${value} total rejections collected`,
      description: 'Every NO is a step forward. Keep pushing!',
    },
    points: {
      icon: Gift,
      color: colors.primary,
      title: 'Points & Rewards',
      subtitle: `${value} points earned`,
      description: 'Use your points to unlock exclusive rewards and badges.',
    },
  };

  const config = modalConfig[type];
  const Icon = config.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={statsModalStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            statsModalStyles.container,
            { backgroundColor: colors.card, maxHeight: '80%' },
          ]}
        >
          <View style={[statsModalStyles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: `${config.color}20` }}>
                <Icon size={24} color={config.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[statsModalStyles.modalTitle, { color: colors.text }]}>{config.title}</Text>
                <Text style={[statsModalStyles.modalSubtitle, { color: colors.textSecondary }]}>{config.subtitle}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} testID="close-modal">
              <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundTertiary }}>
                <Text style={{ fontSize: 18, color: colors.textSecondary }}>×</Text>
              </View>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>
              {config.description}
            </Text>

            {type === 'wins' && completedQuests.length > 0 && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800' as const, marginTop: 8, color: colors.text }}>Recent Completions</Text>
                {completedQuests.slice(0, 10).map((q) => (
                  <View
                    key={q.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: colors.backgroundTertiary,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700' as const, color: colors.text }}>{q.title}</Text>
                      <Text style={{ fontSize: 12, marginTop: 2, color: colors.textSecondary }}>
                        {q.completedAt ? new Date(q.completedAt).toLocaleDateString() : 'Recently'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${colors.primary}20` }}>
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: colors.primary }}>+{q.xp} XP</Text>
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${config.color}20` }}>
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: config.color }}>+{q.points} pts</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {type === 'points' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800' as const, marginTop: 8, color: colors.text }}>Available Rewards</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, backgroundColor: colors.backgroundTertiary, borderColor: colors.border }}>
                  <Award size={32} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800' as const, color: colors.text }}>Legendary Badge</Text>
                    <Text style={{ fontSize: 12, marginTop: 2, color: colors.textSecondary }}>500 points</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700' as const, color: value >= 500 ? '#10B981' : colors.textSecondary }}>
                    {value >= 500 ? 'Available' : 'Locked'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, backgroundColor: colors.backgroundTertiary, borderColor: colors.border }}>
                  <TrendingUp size={32} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800' as const, color: colors.text }}>XP Booster</Text>
                    <Text style={{ fontSize: 12, marginTop: 2, color: colors.textSecondary }}>300 points</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700' as const, color: value >= 300 ? '#10B981' : colors.textSecondary }}>
                    {value >= 300 ? 'Available' : 'Locked'}
                  </Text>
                </View>
              </View>
            )}

            {type === 'streak' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800' as const, marginTop: 8, color: colors.text }}>Streak Milestones</Text>
                <View style={{ gap: 8 }}>
                  {[7, 14, 30, 60, 100].map((milestone) => (
                    <View
                      key={milestone}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        backgroundColor: colors.backgroundTertiary,
                        borderColor: value >= milestone ? config.color : colors.border,
                      }}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: value >= milestone ? config.color : colors.border }}>
                        {value >= milestone && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700' as const, color: colors.text }}>
                        {milestone} Day Streak
                      </Text>
                      {value >= milestone && (
                        <Text style={{ fontSize: 12, fontWeight: '800' as const, color: '#10B981' }}>Unlocked</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface QuestCardProps {
  quest: Quest;
  index: number;
  currentIndex: number;
  onSwipeLeft: () => boolean;
  onSwipeRight: () => boolean;
  onTimerExpire: (penalty: { xp: number; points: number }) => void;
  theme: any;
  onBackToMain: () => void;
}

function QuestCard({ quest, index, currentIndex, onSwipeLeft, onSwipeRight, onTimerExpire, theme, onBackToMain }: QuestCardProps) {
  const { progressMap, failQuest } = useGame();
  const progress = progressMap[quest.id] ?? { noCount: 0, yesCount: 0 } as { noCount: number; yesCount: number };
  const minNo = quest.minNoRequired ?? 0;
  const colors = theme.colors;
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => index === currentIndex,
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (index !== currentIndex) return false;
        return Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8;
      },
      onPanResponderGrant: () => {
        if (index !== currentIndex) return;
        pan.setOffset({ x: (pan.x as any)._value ?? 0, y: (pan.y as any)._value ?? 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_evt, gesture) => {
        if (index !== currentIndex) return;
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (index !== currentIndex) return;
        pan.flattenOffset();
        const threshold = SCREEN_WIDTH * 0.25;
        if (gesture.dx > threshold) {
          handleSwipe('right');
        } else if (gesture.dx < -threshold) {
          handleSwipe('left');
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (index !== currentIndex) return;
        pan.flattenOffset();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(index === currentIndex ? 1 : 0.95)).current;
  const [expanded, setExpanded] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState<boolean>(false);

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const yesOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  const noOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!quest.timerEndAt || index !== currentIndex) return;

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(quest.timerEndAt!).getTime();
      const remaining = Math.max(0, end - now);
      setTimeRemaining(remaining);

      if (remaining === 0 && !timerExpired) {
        setTimerExpired(true);
        const result = failQuest(quest.id);
        if (result) {
          onTimerExpire(result.penalty);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quest.timerEndAt, quest.id, index, currentIndex, timerExpired, failQuest, onTimerExpire]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const toValue = direction === 'right' ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2;

    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: toValue, y: 0 },
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const advance = direction === 'right' ? onSwipeRight() : onSwipeLeft();
      if (!advance) {
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
      }
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [pan, opacity, onSwipeRight, onSwipeLeft]);

  const difficultyColors = {
    easy: '#10B981',
    medium: '#F59E0B',
    hard: '#EF4444',
    extreme: '#8B5CF6',
  };

  const categoryColors: Record<string, string> = {
    business: '#3787ff',
    'door-knocking': '#FF6B35',
    'cold-calling': '#004E89',
    marketing: '#F77F00',
    dating: '#ff5d8f',
    adventure: '#ff8a30',
    fitness: '#27c37b',
    creativity: '#9b5cff',
    wealth: '#20b2aa',
    mindset: '#ffb020',
    relationships: '#ff6b6b',
    community: '#00bcd4',
  };

  const categoryLabels: Record<string, string> = {
    business: 'Business',
    'door-knocking': 'Door Knocking',
    'cold-calling': 'Cold Calling',
    marketing: 'Marketing',
    dating: 'Dating',
    adventure: 'Adventure',
    fitness: 'Fitness',
    creativity: 'Creativity',
    wealth: 'Wealth',
    mindset: 'Mindset',
    relationships: 'Relationships',
    community: 'Community',
  };

  const styles = createCardStyles(colors);

  const isTopCard = index === currentIndex;

  return (
    <Animated.View
      testID={`quest-card-${quest.id}`}
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          transform: [
            { translateX: isTopCard ? pan.x : 0 },
            { translateY: isTopCard ? pan.y : 0 },
            { rotate: isTopCard ? rotate : '0deg' },
            { scale },
          ],
          opacity,
          zIndex: 1000 - index,
          pointerEvents: isTopCard ? 'auto' : 'none',
        },
      ]}
    >
      <View
        style={[
          styles.cardGradient,
          {
            backgroundColor: colors.glassHeavy,
            borderWidth: theme.mode === 'dark' ? 1 : 0,
            borderColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }
        ]}
      >
        <Pressable
          onPress={onBackToMain}
          style={({ pressed }) => [{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 5,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)',
            opacity: pressed ? 0.9 : 1
          }]}
          testID={`back-to-main-${quest.id}`}
        >
          <ArrowLeft size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' as const }}>Main</Text>
        </Pressable>
        <Animated.View style={[styles.overlay, styles.yesOverlay, { opacity: Animated.multiply(noOpacity, new Animated.Value(0.6)) }]}>
          <View style={styles.overlayBadge}>
            <Text style={styles.overlayTextBig}>YES</Text>
            <Text style={[styles.overlaySubText, { color: '#EF4444' }]}>Try Again</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.noOverlay, { opacity: Animated.multiply(yesOpacity, new Animated.Value(0.6)) }]}>
          <View style={styles.overlayBadge}>
            <Text style={styles.overlayTextBig}>NO</Text>
            <Text style={[styles.overlaySubText, { color: '#10B981' }]}>Success!</Text>
          </View>
        </Animated.View>

        <View style={styles.cardContent}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {quest.category && (
              <View style={[styles.difficultyBadge, { backgroundColor: `${categoryColors[quest.category]}20` }]}>
                <Text style={[styles.difficultyText, { color: categoryColors[quest.category] }]}>
                  {categoryLabels[quest.category]?.toUpperCase() ?? quest.category.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyColors[quest.difficulty]}20` }]}>
              <Text style={[styles.difficultyText, { color: difficultyColors[quest.difficulty] }]}>
                {quest.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={[styles.questTitle, { color: colors.text }]}>{quest.title}</Text>
          <Text style={[styles.questDescription, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
            {quest.description}
          </Text>

          {quest.minNoRequired && (
            <View style={[styles.noRequirementBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
              <Text style={[styles.noRequirementText, { color: '#10B981' }]}>
                Goal: Collect {quest.minNoRequired} NO{quest.minNoRequired > 1 ? "'s" : ''}
              </Text>
            </View>
          )}

          {quest.timerEndAt && timeRemaining !== null ? (
            <View style={[styles.timerContainer, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
              <Clock size={20} color="#F59E0B" />
              <Text style={[styles.timerText, { color: '#F59E0B' }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          ) : (
            <View style={styles.rewardsRow}>
              <View style={styles.rewardBadge}>
                <Text style={[styles.rewardText, { color: colors.text }]}>+{quest.xp} XP</Text>
              </View>
              <View style={styles.rewardBadge}>
                <Text style={[styles.rewardText, { color: colors.text }]}>+{quest.points} pts</Text>
              </View>
            </View>
          )}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.rewardBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.rewardText, { color: '#10B981' }]}>NOs: {progress.noCount}{minNo > 0 ? `/${minNo}` : ''}</Text>
              </View>
              <View style={[styles.rewardBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.rewardText, { color: '#EF4444' }]}>YES: {progress.yesCount}</Text>
              </View>
            </View>
            {minNo > 0 && (
              <View style={{ height: 10, backgroundColor: '#ffffff30', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, Math.round((progress.noCount / minNo) * 100))}%`, backgroundColor: '#10B981', height: 10 }} />
              </View>
            )}
          </View>
          <Pressable 
            onPress={() => {
              console.log(`[QuestCard] See more/less pressed for quest ${quest.id}, current expanded: ${expanded}`);
              setExpanded(!expanded);
            }} 
            testID={`see-more-${quest.id}`} 
            style={({ pressed }) => [{ 
              alignSelf: 'flex-start',
              paddingVertical: 8,
              paddingHorizontal: 4,
              opacity: pressed ? 0.7 : 1 
            }]}
          >
            <Text style={{ color: '#7DD3FC', fontWeight: '700' as const, fontSize: 14 }}>{expanded ? 'See less' : 'See more'}</Text>
          </Pressable>
          </View>

        {isTopCard && (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.yesButton,
                { opacity: pressed ? 0.7 : 0.9 }
              ]}
              testID={`quest-yes-${quest.id}`}
              onPress={() => {
                console.log(`[QuestCard] YES button pressed for quest ${quest.id}`);
                handleSwipe('left');
              }}
            >
              <Text style={styles.actionButtonText}>YES</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.noButton,
                { opacity: pressed ? 0.7 : 0.9 }
              ]}
              testID={`quest-no-${quest.id}`}
              onPress={() => {
                console.log(`[QuestCard] NO button pressed for quest ${quest.id}`);
                handleSwipe('right');
              }}
            >
              <Text style={styles.actionButtonText}>NO</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

interface QuestCompletionModalProps {
  visible: boolean;
  quest?: Quest;
  newStreak: number;
  leaderboardRank: number;
  onClose: () => void;
  onNextQuest: () => void;
  onCreateCustom: () => void;
  theme: any;
  isGeneratingQuest?: boolean;
}

function QuestCompletionModal({
  visible,
  quest,
  newStreak,
  leaderboardRank,
  onClose,
  onNextQuest,
  onCreateCustom,
  theme,
  isGeneratingQuest = false,
}: QuestCompletionModalProps) {
  const modalScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const colors = theme.colors;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(confettiOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalScale.setValue(0);
      confettiOpacity.setValue(0);
    }
  }, [visible, modalScale, confettiOpacity]);

  if (!quest) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <Animated.View
          style={[
            modalStyles.container,
            { backgroundColor: colors.card, transform: [{ scale: modalScale }] },
          ]}
        >
          <LinearGradient
            colors={['#10B98140', colors.card]}
            style={modalStyles.gradient}
          >
            <View style={modalStyles.header}>
              <Trophy size={64} color="#10B981" />
              <Text style={[modalStyles.title, { color: colors.text }]}>Quest Complete!</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
                {quest.title}
              </Text>
            </View>

            <View style={modalStyles.stats}>
              <View style={[modalStyles.statCard, { backgroundColor: '#10B98120' }]}>
                <Flame size={32} color="#EF4444" />
                <Text style={[modalStyles.statValue, { color: '#EF4444' }]}>{newStreak}</Text>
                <Text style={[modalStyles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
              </View>

              <View style={[modalStyles.statCard, { backgroundColor: '#F59E0B20' }]}>
                <Trophy size={32} color="#F59E0B" />
                <Text style={[modalStyles.statValue, { color: '#F59E0B' }]}>#{leaderboardRank}</Text>
                <Text style={[modalStyles.statLabel, { color: colors.textSecondary }]}>Rank</Text>
              </View>
            </View>

            <View style={modalStyles.rewards}>
              <View style={[modalStyles.rewardItem, { backgroundColor: colors.backgroundTertiary }]}>
                <Text style={[modalStyles.rewardText, { color: colors.text }]}>+{quest.xp} XP</Text>
              </View>
              <View style={[modalStyles.rewardItem, { backgroundColor: colors.backgroundTertiary }]}>
                <Text style={[modalStyles.rewardText, { color: colors.text }]}>+{quest.points} Points</Text>
              </View>
            </View>

            <View style={modalStyles.actions}>
              <Pressable
                style={[modalStyles.actionButton, { backgroundColor: colors.primary, opacity: isGeneratingQuest ? 0.6 : 1 }]}
                onPress={onNextQuest}
                disabled={isGeneratingQuest}
              >
                {isGeneratingQuest ? (
                  <Text style={modalStyles.actionButtonText}>Generating Quest...</Text>
                ) : (
                  <>
                    <Text style={modalStyles.actionButtonText}>Continue</Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </Pressable>

              <Pressable
                style={[modalStyles.actionButtonSecondary, { borderColor: colors.border, backgroundColor: colors.backgroundTertiary }]}
                onPress={onCreateCustom}
              >
                <Plus size={20} color={colors.text} />
                <Text style={[modalStyles.actionButtonTextSecondary, { color: colors.text }]}>Custom Quest</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

function truncateToWords(text: string, maxWords?: number) {
  if (!maxWords) return text;
  const parts = text.split(/\s+/);
  if (parts.length <= maxWords) return text;
  return parts.slice(0, maxWords).join(' ') + '…';
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
      justifyContent: 'center',
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      marginRight: 12,
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
      marginLeft: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
    },
    heroTitle: { fontSize: 18, fontWeight: '900' as const },
    heroSubtitle: { fontSize: 12, fontWeight: '600' as const },
    groupPill: {
      width: 140,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    groupAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    groupLabel: { fontSize: 12, fontWeight: '800' as const, flexShrink: 1 },
    categoryCard: {
      width: 180,
      height: 100,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
    },
    categoryCardVertical: {
      width: '100%',
      height: 100,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
    },
    categoryTitle: { fontSize: 16, fontWeight: '800' as const },
    pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    pillText: { color: '#fff', fontWeight: '800' as const, fontSize: 12 },
    cardsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    loadingState: {
      alignItems: 'center',
      padding: 40,
      gap: 16,
    },
    loadingTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingSubtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    instructions: {
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 4,
    },
    searchBar: {
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    searchInput: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    gamePill: {
      width: 84,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
    },
    gameIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      marginBottom: 6,
    },
    gameIcon: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
    },
    gameLabel: { fontSize: 11, fontWeight: '800' as const },
    liveEmptyCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    liveEmptyTitle: { fontSize: 16, fontWeight: '900' as const },
    liveEmptySubtitle: { fontSize: 12, fontWeight: '600' as const },
    livePrimaryBtn: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    livePrimaryBtnText: { color: '#fff', fontWeight: '900' as const },
    liveSecondaryBtn: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
    liveSecondaryBtnText: { fontWeight: '800' as const },
    liveCard: {
      width: SCREEN_WIDTH * 0.74,
      borderRadius: 16,
      padding: 10,
      borderWidth: 1,
    },
    liveThumbWrap: { width: '100%', height: 140, borderRadius: 12, overflow: 'hidden' },
    liveThumb: { width: '100%', height: '100%' },
    liveBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveBadgeText: { color: '#fff', fontWeight: '900' as const, fontSize: 11 },
    viewerBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    viewerText: { color: '#fff', fontWeight: '800' as const, fontSize: 11 },
    liveTitle: { fontSize: 14, fontWeight: '800' as const, marginTop: 8 },
    activeQuestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    activeQuestPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    instructionsText: {
      fontSize: 12,
      textAlign: 'center',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700' as const,
    },
  });
}

function createCardStyles(colors: any) {
  return StyleSheet.create({
    card: {
      position: 'absolute',
      width: SCREEN_WIDTH - 40,
      height: SCREEN_HEIGHT * 0.7,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    cardGradient: {
      flex: 1,
      borderRadius: 24,
      padding: 20,
      justifyContent: 'space-between',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 2,
    },
    yesOverlay: {
      borderColor: '#EF4444',
      backgroundColor: '#EF444418',
    },
    noOverlay: {
      borderColor: '#10B981',
      backgroundColor: '#10B98118',
    },
    overlayBadge: {
      alignItems: 'center',
      gap: 12,
    },
    overlayText: {
      fontSize: 48,
      fontWeight: '900' as const,
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    overlayTextBig: {
      fontSize: 48,
      fontWeight: '900' as const,
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    overlaySubText: {
      fontSize: 24,
      fontWeight: '700' as const,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    noRequirementBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 2,
      alignSelf: 'flex-start',
    },
    noRequirementText: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    cardContent: {
      flex: 1,
      justifyContent: 'center',
      gap: 16,
    },
    difficultyBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    difficultyText: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    questTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      lineHeight: 36,
    },
    questDescription: {
      fontSize: 16,
      lineHeight: 24,
    },
    rewardsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    rewardBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    timerContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 2,
      alignSelf: 'flex-start' as const,
    },
    timerText: {
      fontSize: 24,
      fontWeight: '800' as const,
      letterSpacing: 1,
    },
    rewardText: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 16,
      paddingHorizontal: 0,
      gap: 16,
    },
    actionButton: {
      flex: 1,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    noButton: {
      backgroundColor: '#10B981',
      opacity: 0.9,
    },
    yesButton: {
      backgroundColor: '#EF4444',
      opacity: 0.9,
    },
    actionButtonText: {
      fontSize: 20,
      fontWeight: '900' as const,
      color: '#FFFFFF',
    },
  });
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    padding: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900' as const,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    justifyContent: 'center',
  },
  rewardItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

const statsModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 2,
  },
});
