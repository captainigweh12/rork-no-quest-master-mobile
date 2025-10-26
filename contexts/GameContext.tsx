import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Quest, QuestDifficulty, UserProfile } from '@/types';
import { generateQuest } from '@/services/questAI';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [isLoading, setIsLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, { noCount: number; yesCount: number; startedAt: string }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading game data...');
      const savedProfile = await AsyncStorage.getItem('profile');
      const savedQuests = await AsyncStorage.getItem('quests');
      const savedProgress = await AsyncStorage.getItem('questProgress');

      if (savedProfile) {
        console.log('Loading saved profile');
        setProfile(JSON.parse(savedProfile));
      }
      if (savedQuests) {
        console.log('Loading saved quests');
        setQuests(JSON.parse(savedQuests));
      }
      if (savedProgress) {
        console.log('Loading saved quest progress');
        setProgressMap(JSON.parse(savedProgress));
      }
      console.log('Game data loaded successfully');
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (
    newProfile: UserProfile,
    newQuests: Quest[],
    newProgress?: Record<string, { noCount: number; yesCount: number; startedAt: string }>
  ) => {
    try {
      console.log('Saving game data...');
      await AsyncStorage.setItem('profile', JSON.stringify(newProfile));
      await AsyncStorage.setItem('quests', JSON.stringify(newQuests));
      await AsyncStorage.setItem('questProgress', JSON.stringify(newProgress ?? progressMap));
      console.log('Game data saved successfully');
    } catch (error) {
      console.error('Error saving game data:', error);
    }
  };

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
    [quests, profile, progressMap]
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
    [quests, profile, progressMap]
  );

  const addAIQuest = useCallback(
    async (difficulty: QuestDifficulty, isSuperQuest = false, previousQuest?: Quest) => {
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
        });

        const questWithSource = { ...newQuest, source: 'ai' as const };
        const updatedQuests = [questWithSource, ...quests];
        setQuests(updatedQuests);
        await AsyncStorage.setItem('quests', JSON.stringify(updatedQuests));

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
    [quests, profile, progressMap]
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
    [quests, profile]
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
      
      AsyncStorage.setItem('questProgress', JSON.stringify(updated)).catch((e) => console.error('Failed to init progress', e));
      AsyncStorage.setItem('quests', JSON.stringify(updatedQuests)).catch((e) => console.error('Failed to save quest timer', e));
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
    AsyncStorage.setItem('questProgress', JSON.stringify(updated)).catch((e) => console.error('Failed to persist progress', e));

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
    }),
    [profile, quests, isLoading, completeQuest, resetQuest, addAIQuest, addCustomQuest, removeQuest, progressMap, recordQuestOutcome]
  );
});
