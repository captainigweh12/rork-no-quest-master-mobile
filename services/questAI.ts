import type { Quest, QuestDifficulty } from '@/types';
import { supabase } from '@/lib/supabase';

export interface GenerateQuestParams {
  userGoal?: string;
  difficulty: QuestDifficulty;
  personalityType?: 'introvert' | 'extrovert' | 'ambivert';
  comfortLevel?: number;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  rank: string;
  level: number;
  isSuperQuest?: boolean;
  previousQuest?: {
    title: string;
    description: string;
    difficulty: QuestDifficulty;
  };
}

const iconOptions = [
  'coffee',
  'mail',
  'trending-up',
  'message-circle',
  'briefcase',
  'target',
  'award',
  'flame',
] as const;

function getDifficultyMultiplier(level: number, isSuperQuest: boolean): number {
  const baseMultiplier = 1 + (level - 1) * 0.15;
  return isSuperQuest ? baseMultiplier * 2.5 : baseMultiplier;
}

function calculatePoints(difficulty: QuestDifficulty, level: number, isSuperQuest: boolean): number {
  const basePoints: Record<QuestDifficulty, number> = {
    easy: 50,
    medium: 100,
    hard: 200,
    extreme: 500,
  };
  const multiplier = getDifficultyMultiplier(level, isSuperQuest);
  return Math.round(basePoints[difficulty] * multiplier);
}

function calculateXP(difficulty: QuestDifficulty, level: number, isSuperQuest: boolean): number {
  const baseXP: Record<QuestDifficulty, number> = {
    easy: 25,
    medium: 50,
    hard: 100,
    extreme: 250,
  };
  const multiplier = getDifficultyMultiplier(level, isSuperQuest);
  return Math.round(baseXP[difficulty] * multiplier);
}

export async function generateQuest(params: GenerateQuestParams): Promise<Quest> {
  const { difficulty, level, isSuperQuest = false } = params;

  try {
    console.log('[edge] invoking generate-quest with params', params);
    const { data, error } = await supabase.functions.invoke('generate-quest', {
      body: params,
    });

    if (error) {
      console.error('[edge] generate-quest error', error);
      throw error;
    }

    const parsed = data as { title?: string; description?: string; minNoRequired?: number } | null;

    const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)] as string;
    const limitWords = (txt: string, n: number) => {
      const parts = (txt ?? '').trim().split(/\s+/);
      return parts.length > n ? parts.slice(0, n).join(' ') : (txt ?? '');
    };

    const quest: Quest = {
      id: Date.now().toString(),
      title: limitWords(parsed?.title || 'Mystery Quest', 10),
      description: parsed?.description || 'Complete this challenge to earn rewards!',
      type: isSuperQuest ? 'special' : difficulty === 'easy' ? 'daily' : difficulty === 'extreme' ? 'special' : 'weekly',
      difficulty,
      points: calculatePoints(difficulty, level, isSuperQuest),
      xp: calculateXP(difficulty, level, isSuperQuest),
      completed: false,
      icon: randomIcon,
      minNoRequired: parsed?.minNoRequired ?? 3,
    };

    console.log('[edge] generate-quest success', quest);
    return quest;
  } catch (error) {
    console.error('Error generating quest (fallback used):', error);

    const fallback: Quest = {
      id: Date.now().toString(),
      title: 'Ask for a Discount',
      description: 'Visit any store and ask for a discount on a regular-priced item',
      type: 'daily',
      difficulty,
      points: calculatePoints(difficulty, level, isSuperQuest),
      xp: calculateXP(difficulty, level, isSuperQuest),
      completed: false,
      icon: 'target',
      minNoRequired: 3,
    };
    return fallback;
  }
}
