import type { Quest, QuestDifficulty } from '@/types';

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

const questTemplates = [
  {
    title: 'Ask for a Discount',
    description: 'Visit any store and ask for a discount on a regular-priced item',
    icon: 'target',
  },
  {
    title: 'Request a Favor from a Stranger',
    description: 'Ask someone you don\'t know for a small favor',
    icon: 'message-circle',
  },
  {
    title: 'Negotiate at a Market',
    description: 'Try to negotiate the price at a local market or store',
    icon: 'trending-up',
  },
  {
    title: 'Ask Someone Out',
    description: 'Ask someone you\'re interested in out for coffee or a date',
    icon: 'coffee',
  },
  {
    title: 'Request a Free Sample',
    description: 'Go to a store and ask for a free sample of something',
    icon: 'coffee',
  },
  {
    title: 'Apply for a Job Above Your Level',
    description: 'Submit an application for a position you think you\'re not qualified for',
    icon: 'briefcase',
  },
  {
    title: 'Ask for a Recommendation',
    description: 'Request a recommendation or testimonial from someone',
    icon: 'award',
  },
  {
    title: 'Start a Conversation with a Stranger',
    description: 'Strike up a conversation with someone new in public',
    icon: 'message-circle',
  },
  {
    title: 'Request a Meeting with a VIP',
    description: 'Reach out to someone influential and ask for a meeting',
    icon: 'mail',
  },
  {
    title: 'Ask for Special Treatment',
    description: 'Request a special accommodation or exception somewhere',
    icon: 'flame',
  },
];

export async function generateQuest(params: GenerateQuestParams): Promise<Quest> {
  const { difficulty, level, isSuperQuest = false } = params;

  console.log('Generating quest locally with params:', params);

  const randomTemplate = questTemplates[Math.floor(Math.random() * questTemplates.length)];
  const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)] as string;

  const minNoByDifficulty: Record<QuestDifficulty, number> = {
    easy: 3,
    medium: 5,
    hard: 8,
    extreme: 10,
  };

  const quest: Quest = {
    id: Date.now().toString(),
    title: randomTemplate.title,
    description: randomTemplate.description,
    type: isSuperQuest ? 'special' : difficulty === 'easy' ? 'daily' : difficulty === 'extreme' ? 'special' : 'weekly',
    difficulty,
    points: calculatePoints(difficulty, level, isSuperQuest),
    xp: calculateXP(difficulty, level, isSuperQuest),
    completed: false,
    icon: randomTemplate.icon || randomIcon,
    minNoRequired: minNoByDifficulty[difficulty],
  };

  console.log('Quest generated successfully:', quest);
  return quest;
}
