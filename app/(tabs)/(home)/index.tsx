import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Platform, PanResponder, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Bell, Trophy, Flame, ArrowRight, ArrowLeft, Plus, Clock, Menu, Sparkles } from 'lucide-react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Quest } from '@/types';
import SideMenu from '@/components/SideMenu';
import { useCategories } from '@/contexts/CategoriesContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_CARDS: { id: string; title: string; color: string; image: string; }[] = [];

export default function HomeScreen() {
  const { theme } = useTheme();
  const { profile, quests, progressMap, recordQuestOutcome, addAIQuest } = useGame();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { selected, isLoading: catsLoading } = useCategories();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completionData, setCompletionData] = useState<{ quest: Quest; newStreak: number; leaderboardRank: number } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isGeneratingQuest, setIsGeneratingQuest] = useState<boolean>(false);
  const [questMode, setQuestMode] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={theme.mode === 'dark' ? ['#0F1419', '#1A1F2E', '#242938'] : ['#F5F7FA', '#E8ECF0', '#FAFBFC']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <View style={styles.statsRow}>
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
          <View style={[styles.heroBanner, { 
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
              <Sparkles size={28} color="#fff" />
            </View>
          </View>

          <View style={{ gap: 16, marginTop: 16 }}>
            {(catsLoading ? [] : selected).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/(tabs)/(home)/category/${c.id}` as any)}
                style={({ pressed }) => [
                  styles.categoryCardVertical,
                  {
                    backgroundColor: theme.colors.glass,
                    borderWidth: 0,
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.12,
                    shadowRadius: 16,
                    elevation: 6,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }
                ]}
                testID={`category-${c.id}`}
              >
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text, fontSize: 18, fontWeight: '800' }]}>{c.title}</Text>
                  <View style={[
                    styles.pill,
                    {
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }
                  ]}>
                    <Text style={styles.pillText}>Get Quest</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/manage-categories' as any)}
              style={({ pressed }) => [
                styles.categoryCardVertical,
                {
                  borderColor: theme.colors.border,
                  borderWidth: 2,
                  backgroundColor: 'transparent',
                  opacity: pressed ? 0.7 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderStyle: 'dashed',
                }
              ]}
              testID="manage-categories"
            >
              <Plus size={24} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '700' }]}>Add or remove categories</Text>
            </Pressable>
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
            activeQuests.map((quest, index) => {
              if (index < currentIndex) return null;
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
            }).reverse()
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
    </View>
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
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        return Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8;
      },
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value ?? 0, y: (pan.y as any)._value ?? 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_evt, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_evt, gesture) => {
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
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const noOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0, 0],
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
      {...(isTopCard ? panResponder.panHandlers : {})}
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
        <Animated.View style={[styles.overlay, styles.noOverlay, { opacity: Animated.multiply(yesOpacity, new Animated.Value(0.6)) }]}>
          <View style={styles.overlayBadge}>
            <Text style={styles.overlayTextBig}>NO</Text>
            <Text style={[styles.overlaySubText, { color: '#10B981' }]}>Success!</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.yesOverlay, { opacity: Animated.multiply(noOpacity, new Animated.Value(0.6)) }]}>
          <View style={styles.overlayBadge}>
            <Text style={styles.overlayTextBig}>YES</Text>
            <Text style={[styles.overlaySubText, { color: '#EF4444' }]}>Try Again</Text>
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
            {truncateToWords(quest.description ?? '', expanded ? undefined : 10)}
          </Text
>

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
          {!expanded && (
            <Pressable onPress={() => setExpanded(true)} testID={`see-more-${quest.id}`} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: '#7DD3FC', fontWeight: '700' as const }}>See more</Text>
            </Pressable>
          )}
          </View>

        {isTopCard && (
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, styles.yesButton]}
              testID={`quest-yes-${quest.id}`}
              onPress={() => handleSwipe('left')}
            >
              <Text style={styles.actionButtonText}>YES</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.noButton]}
              testID={`quest-no-${quest.id}`}
              onPress={() => handleSwipe('right')}
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
