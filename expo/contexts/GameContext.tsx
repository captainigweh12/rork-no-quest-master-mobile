import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { Quest, QuestDifficulty, UserProfile } from '@/types';
import { generateQuest, type CategoryId } from '@/services/questAI';
import { useAuth } from '@/contexts/AuthContext';
import { typedStorage, isStorageReady } from '@/lib/storage';

const INITIAL_PROFILE: UserProfile = {
  name: 'Hero',
  level: 1,
  currentXP: 0,
  xpToNextLevel: 100,
  totalPoints: 0,
  totalRejections: 0,
  streak: 0,
  achievements: [],
};

const INITIAL_QUESTS: Quest[] = [
  {
    id: '1',
    title: 'Get Rejected at a Coffee Shop',
    description: 'Ask for a ridiculous discount or free item',
    type: 'daily',
    difficulty: 'easy',
    points: 50,
    xp: 25,
    completed: false,
    icon: 'coffee',
    minNoRequired: 3,
    source: 'initial',
  },
  {
    id: '2',
    title: 'Cold Email a CEO',
    description: 'Reach out to someone way out of your league',
    type: 'daily',
    difficulty: 'medium',
    points: 100,
    xp: 50,
    completed: false,
    icon: 'mail',
    minNoRequired: 5,
    source: 'initial',
  },
  {
    id: '3',
    title: 'Ask for a Raise',
    description: 'Have that difficult conversation with your boss',
    type: 'weekly',
    difficulty: 'hard',
    points: 200,
    xp: 100,
    completed: false,
    icon: 'trending-up',
    minNoRequired: 1,
    source: 'initial',
  },
  {
    id: '4',
    title: 'Start a Conversation with a Stranger',
    description: 'Break the ice with someone new today',
    type: 'daily',
    difficulty: 'easy',
    points: 75,
    xp: 35,
    completed: false,
    icon: 'message-circle',
    minNoRequired: 3,
    source: 'initial',
  },
  {
    id: '5',
    title: 'Apply to Your Dream Job',
    description: 'Take the leap even if you think you are unqualified',
    type: 'special',
    difficulty: 'extreme',
    points: 500,
    xp: 250,
    completed: false,
    icon: 'briefcase',
    minNoRequired: 10,
    source: 'initial',
  },
];

export const [GameProvider, useGame] = createContextHook(() => {
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn('[GameContext] Auth not yet initialized, will use null user');
    authContext = null;
  }
  const user = authContext?.user ?? null;
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [isLoading, setIsLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, { noCount: number; yesCount: number; startedAt: string }>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      console.log('[GameContext] Loaded with', quests.length, 'quests and profile level', profile.level);
    }
  }, [isLoading, quests.length, profile.level]);

  const loadData = async () => {
    try {
      if (!isStorageReady()) {
        console.log('[GameContext] ⏳ Waiting for storage to be ready...');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!isStorageReady()) {
          console.warn('[GameContext] ⚠️ Storage not ready, using initial data');
          if (mountedRef.current) setIsLoading(false);
          return;
        }
      }

      console.log('[GameContext] Loading game data...');
      
      const savedProfile = await typedStorage.getJSON<UserProfile>('profile', INITIAL_PROFILE);
      const savedQuests = await typedStorage.getJSON<Quest[]>('quests', INITIAL_QUESTS);
      const savedProgress = await typedStorage.getJSON<Record<string, { noCount: number; yesCount: number; startedAt: string }>>('questProgress', {});

      if (mountedRef.current && savedProfile && savedProfile !== INITIAL_PROFILE) {
        console.log('[GameContext] ✓ Loaded saved profile');
        setProfile(savedProfile);
      }
      if (mountedRef.current && savedQuests && savedQuests.length > 0 && savedQuests !== INITIAL_QUESTS) {
        console.log('[GameContext] ✓ Loaded saved quests');
        setQuests(savedQuests);
      }
      if (mountedRef.current && savedProgress && Object.keys(savedProgress).length > 0) {
        console.log('[GameContext] ✓ Loaded saved quest progress');
        setProgressMap(savedProgress);
      }
      console.log('[GameContext] ✅ Game data loaded successfully');
    } catch (error) {
      console.warn('[GameContext] ⚠️ Using initial game data:', error instanceof Error ? error.message : 'unknown error');
    } finally {
      console.log('[GameContext] Initialization complete');
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const saveData = useCallback(
    async (
      newProfile: UserProfile,
      newQuests: Quest[],
      newProgress?: Record<string, { noCount: number; yesCount: number; startedAt: string }>
    ) => {
      try {
        console.log('[GameContext] Saving game data...');
        await typedStorage.setJSON('profile', newProfile);
        await typedStorage.setJSON('quests', newQuests);
        await typedStorage.setJSON('questProgress', newProgress ?? progressMap);
        console.log('[GameContext] ✓ Game data saved successfully');
      } catch (error) {
        console.error('[GameContext] ⚠️ Error saving game data:', error);
      }
    },
    [progressMap]
  );

  const completeQuest = useCallback(
    (questId: string, location?: { latitude: number; longitude: number; address?: string }) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest || quest.completed) return;

      const newQuests = quests.map((q) =>
        q.id === questId ? { ...q, completed: true, completedAt: new Date(), location } : q
      );

      const newXP = profile.currentXP + quest.xp;
      const leveledUp = newXP >= profile.xpToNextLevel;

      const progressData = progressMap[questId] ?? { noCount: 0, yesCount: 0 };
      const actualNoCount = progressData.noCount;

      const newProfile: UserProfile = {
        ...profile,
        currentXP: leveledUp ? newXP - profile.xpToNextLevel : newXP,
        level: leveledUp ? profile.level + 1 : profile.level,
        xpToNextLevel: leveledUp ? profile.xpToNextLevel * 1.5 : profile.xpToNextLevel,
        totalPoints: profile.totalPoints + quest.points,
        totalRejections: profile.totalRejections + actualNoCount,
        streak: profile.streak + 1,
      };

      const newProgress = { ...progressMap };
      delete newProgress[questId];

      setQuests(newQuests);
      setProfile(newProfile);
      setProgressMap(newProgress);
      saveData(newProfile, newQuests, newProgress);

      return { leveledUp, quest, newStreak: newProfile.streak };
    },
    [quests, profile, progressMap, saveData]
  );

  const resetQuest = useCallback(
    (questId: string) => {
      const newQuests = quests.map((q) =>
        q.id === questId ? { ...q, completed: false, completedAt: undefined } : q
      );
      const newProgress = { ...progressMap };
      delete newProgress[questId];
      setQuests(newQuests);
      setProgressMap(newProgress);
      saveData(profile, newQuests, newProgress);
    },
    [quests, profile, progressMap, saveData]
  );

  const addAIQuest = useCallback(
    async (difficulty: QuestDifficulty, isSuperQuest = false, previousQuest?: Quest, categoryId?: CategoryId) => {
      console.log(`Generating AI quest with difficulty: ${difficulty}, isSuperQuest: ${isSuperQuest}`);
      try {
        const rankTitles = [
          'Novice',
          'Explorer',
          'Adventurer',
          'Warrior',
          'Champion',
          'Legend',
        ];
        const rank = rankTitles[Math.min(Math.floor(profile.level / 5), rankTitles.length - 1)];

        const newQuest = await generateQuest({
          difficulty,
          rank,
          level: profile.level,
          isSuperQuest,
          userGoal: 'Build resilience to rejection',
          personalityType: 'ambivert',
          comfortLevel: 5,
          preferredTime: 'anytime',
          relationshipStatus: user?.relationshipStatus,
          previousQuest: previousQuest ? {
            title: previousQuest.title,
            description: previousQuest.description ?? '',
            difficulty: previousQuest.difficulty,
          } : undefined,
          excludeTitles: quests.map((q) => q.title),
          categoryId,
        });

        const questWithSource = { ...newQuest, source: 'ai' as const };
        const updatedQuests = [questWithSource, ...quests];
        setQuests(updatedQuests);
        await typedStorage.setJSON('quests', updatedQuests);

        console.log('AI quest added successfully:', questWithSource);
        return questWithSource;
      } catch (error) {
        console.error('Failed to generate AI quest:', error);
        throw error;
      }
    },
    [quests, profile.level, user?.relationshipStatus]
  );

  const removeQuest = useCallback(
    (questId: string) => {
      const newQuests = quests.filter((q) => q.id !== questId);
      const newProgress = { ...progressMap };
      delete newProgress[questId];
      setQuests(newQuests);
      setProgressMap(newProgress);
      saveData(profile, newQuests, newProgress);
    },
    [quests, profile, progressMap, saveData]
  );

  const failQuest = useCallback(
    (questId: string) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest || quest.completed) return;

      const penalty = {
        xp: Math.floor(quest.xp * 0.5),
        points: Math.floor(quest.points * 0.5),
      };

      const newXP = Math.max(0, profile.currentXP - penalty.xp);
      const newPoints = Math.max(0, profile.totalPoints - penalty.points);
      const newStreak = Math.max(0, profile.streak - 1);

      const newProfile: UserProfile = {
        ...profile,
        currentXP: newXP,
        totalPoints: newPoints,
        streak: newStreak,
      };

      const newQuests = quests.filter((q) => q.id !== questId);
      const newProgress = { ...progressMap };
      delete newProgress[questId];

      setQuests(newQuests);
      setProfile(newProfile);
      setProgressMap(newProgress);
      saveData(newProfile, newQuests, newProgress);

      return { penalty, quest };
    },
    [quests, profile, progressMap, saveData]
  );

  const addCustomQuest = useCallback(
    (questData: { title: string; description?: string; minNoRequired: number; durationMinutes?: number }) => {
      console.log('Adding custom quest:', questData);
      try {
        const newQuest: Quest = {
          id: Date.now().toString(),
          title: questData.title,
          description: questData.description || '',
          type: 'daily',
          difficulty: 'medium',
          points: 100,
          xp: 50,
          completed: false,
          icon: 'target',
          minNoRequired: questData.minNoRequired,
          durationMinutes: questData.durationMinutes,
          source: 'user',
        };

        const updatedQuests = [newQuest, ...quests];
        setQuests(updatedQuests);
        saveData(profile, updatedQuests);

        console.log('Custom quest added successfully:', newQuest);
        return newQuest;
      } catch (error) {
        console.error('Failed to add custom quest:', error);
        throw error;
      }
    },
    [quests, profile, saveData]
  );

  const ensureProgress = useCallback((questId: string) => {
    if (!progressMap[questId]) {
      const quest = quests.find((q) => q.id === questId);
      const durationMs = (quest?.durationMinutes ?? 30) * 60 * 1000;
      const timerEndAt = new Date(Date.now() + durationMs).toISOString();
      const updated = { ...progressMap, [questId]: { noCount: 0, yesCount: 0, startedAt: new Date().toISOString() } };
      setProgressMap(updated);
      
      const updatedQuests = quests.map((q) => q.id === questId ? { ...q, timerEndAt } : q);
      setQuests(updatedQuests);
      
      typedStorage.setJSON('questProgress', updated).catch((e) => console.error('[GameContext] Failed to init progress', e));
      typedStorage.setJSON('quests', updatedQuests).catch((e) => console.error('[GameContext] Failed to save quest timer', e));
    }
  }, [progressMap, quests]);

  const recordQuestOutcome = useCallback((questId: string, outcome: 'no' | 'yes') => {
    ensureProgress(questId);
    const current = progressMap[questId] ?? { noCount: 0, yesCount: 0, startedAt: new Date().toISOString() };
    const updated = {
      ...progressMap,
      [questId]: {
        ...current,
        noCount: outcome === 'no' ? current.noCount + 1 : current.noCount,
        yesCount: outcome === 'yes' ? current.yesCount + 1 : current.yesCount,
      },
    };
    setProgressMap(updated);
    typedStorage.setJSON('questProgress', updated).catch((e) => console.error('[GameContext] Failed to persist progress', e));

    const quest = quests.find((q) => q.id === questId);
    if (quest && outcome === 'no' && typeof quest.minNoRequired === 'number') {
      const nextNo = current.noCount + 1;
      if (nextNo >= quest.minNoRequired) {
        completeQuest(questId);
      }
    }
  }, [ensureProgress, progressMap, quests, completeQuest]);

  return useMemo(
    () => ({
      profile,
      quests,
      isLoading,
      completeQuest,
      resetQuest,
      addAIQuest,
      addCustomQuest,
      removeQuest,
      progressMap,
      recordQuestOutcome,
      failQuest,
    }),
    [profile, quests, isLoading, completeQuest, resetQuest, addAIQuest, addCustomQuest, removeQuest, progressMap, recordQuestOutcome, failQuest]
  );
});
