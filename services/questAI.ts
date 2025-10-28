import type { Quest, QuestDifficulty } from '@/types';

export type CategoryId =
  | 'business'
  | 'dating'
  | 'adventure'
  | 'fitness'
  | 'wealth'
  | 'creativity'
  | 'mindset'
  | 'relationships'
  | 'community';

export interface GenerateQuestParams {
  userGoal?: string;
  difficulty: QuestDifficulty;
  personalityType?: 'introvert' | 'extrovert' | 'ambivert';
  comfortLevel?: number;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  rank: string;
  level: number;
  isSuperQuest?: boolean;
  relationshipStatus?: 'single' | 'married';
  previousQuest?: {
    title: string;
    description: string;
    difficulty: QuestDifficulty;
  };
  excludeTitles?: string[];
  categoryId?: CategoryId;
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

const questTemplatesSingle = [
  {
    title: 'Ask Someone Out',
    description: 'Ask someone you\'re interested in out for coffee or a date',
    icon: 'coffee',
  },
  {
    title: 'Ask for a Number',
    description: 'Get a phone number from someone you find interesting',
    icon: 'message-circle',
  },
  {
    title: 'Flirt with a Stranger',
    description: 'Give someone a genuine compliment or start a flirty conversation',
    icon: 'flame',
  },
  {
    title: 'Request a Discount',
    description: 'Visit any store and ask for a discount on a regular-priced item',
    icon: 'target',
  },
  {
    title: 'Ask for a Date Activity',
    description: 'Ask someone to join you for a specific activity you enjoy',
    icon: 'trending-up',
  },
];

const questTemplatesMarried = [
  {
    title: 'Plan a Surprise Date',
    description: 'Ask your partner on a surprise date to somewhere new',
    icon: 'coffee',
  },
  {
    title: 'Request Quality Time',
    description: 'Ask your partner to put away devices for an hour of quality time',
    icon: 'message-circle',
  },
  {
    title: 'Try Something New Together',
    description: 'Suggest a new activity or hobby to try with your partner',
    icon: 'flame',
  },
  {
    title: 'Ask for Help',
    description: 'Request help with something you usually handle alone',
    icon: 'target',
  },
  {
    title: 'Express a Need',
    description: 'Share an emotional need or desire with your partner',
    icon: 'trending-up',
  },
];

const categoryTemplates: Record<CategoryId, { title: string; description: string; icon: string }[]> = {
  business: [
    { title: 'Pitch a Product Idea', description: 'Share a product concept with someone and ask for feedback or a pre-order', icon: 'briefcase' },
    { title: 'Cold Email 3 Clients', description: 'Reach out to three potential clients with a clear ask', icon: 'mail' },
    { title: 'Ask for a Testimonial', description: 'Request a testimonial from a past client or colleague', icon: 'award' },
    { title: 'Post on LinkedIn', description: 'Publish a value-packed post and ask for input', icon: 'trending-up' },
  ],
  dating: [
    { title: 'Ask a Stranger for Coffee', description: 'Politely invite someone new for a quick coffee', icon: 'coffee' },
    { title: 'Compliment 3 People', description: 'Give three genuine compliments today', icon: 'message-circle' },
    { title: 'Start a Conversation IRL', description: 'Open with an observation and keep it going for 2 minutes', icon: 'flame' },
    { title: 'Get One Bold “No”', description: 'Make a bold ask that might get rejected', icon: 'target' },
  ],
  adventure: [
    { title: 'Try a New Food', description: 'Order something you never had before and describe the taste', icon: 'flame' },
    { title: 'Dance in Public', description: 'Dance for 10 seconds in a safe public place', icon: 'target' },
    { title: 'Ask for a Secret Menu Item', description: 'Politely ask for anything off-menu', icon: 'coffee' },
    { title: 'Record Your Reaction', description: 'Capture a short reflection on how it felt', icon: 'message-circle' },
  ],
  fitness: [
    { title: 'Ask a Trainer a Question', description: 'Get advice from a trainer on a move or routine', icon: 'target' },
    { title: 'Try a New Workout', description: 'Do a beginner session for a modality you never tried', icon: 'flame' },
    { title: 'Start a Conversation at the Gym', description: 'Ask someone how long they have been training', icon: 'message-circle' },
    { title: '10 Push-ups after a Rejection', description: 'Convert a “no” into micro-progress', icon: 'award' },
  ],
  wealth: [
    { title: 'Negotiate a Discount', description: 'Ask for a discount at checkout with a smile', icon: 'trending-up' },
    { title: 'Ask for a Raise', description: 'Prepare and ask for a compensation review', icon: 'briefcase' },
    { title: 'Sell an Old Item', description: 'List one unused item online today', icon: 'mail' },
    { title: 'Pitch to an Investor', description: 'Share a one-minute pitch and ask for feedback', icon: 'target' },
  ],
  creativity: [
    { title: 'Post a Short Video', description: 'Publish a 30–60 second clip about something you learned', icon: 'flame' },
    { title: 'Write One Tweet', description: 'Ship one concise thought publicly', icon: 'mail' },
    { title: 'Ask for Design Feedback', description: 'Get feedback from 5 people on something you made', icon: 'message-circle' },
    { title: 'Launch a Micro-Project', description: 'Publish a tiny thing with a clear link', icon: 'award' },
  ],
  mindset: [
    { title: 'Talk to a Stranger', description: 'Start a conversation and ask one curious question', icon: 'message-circle' },
    { title: 'Share a Failure Story', description: 'Post a short story about a failure and what you learned', icon: 'mail' },
    { title: 'Ask for Help Publicly', description: 'Make a public ask for help on a small thing', icon: 'target' },
    { title: 'Face One Small Fear', description: 'Pick a tiny fear and do it today', icon: 'flame' },
  ],
  relationships: [
    { title: 'Call a Family Member', description: 'Reach out and ask about their week', icon: 'mail' },
    { title: 'Apologize or Thank Someone', description: 'Share an authentic apology or thanks', icon: 'award' },
    { title: 'Ask a Deep Question', description: 'Use “What’s something you’ve been thinking about lately?”', icon: 'message-circle' },
    { title: 'Plan a Surprise', description: 'Plan a tiny surprise for someone you care about', icon: 'briefcase' },
  ],
  community: [
    { title: 'Help Carry Groceries', description: 'Offer to help someone with bags', icon: 'award' },
    { title: 'Compliment a Stranger', description: 'Give a warm compliment to brighten a day', icon: 'message-circle' },
    { title: 'Volunteer an Hour', description: 'Spend 60 minutes helping any cause', icon: 'target' },
    { title: 'Donate Unused Clothes', description: 'Find and donate one item you don’t use', icon: 'flame' },
  ],
};

const questTemplatesGeneral = [
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
  const { difficulty, level, isSuperQuest = false, relationshipStatus, previousQuest, excludeTitles, categoryId } = params;

  console.log('Generating quest locally with params:', params);

  let questPool = questTemplatesGeneral;

  if (categoryId && categoryTemplates[categoryId]) {
    questPool = [...categoryTemplates[categoryId], ...questTemplatesGeneral];
  } else if (relationshipStatus === 'single') {
    questPool = [...questTemplatesSingle, ...questTemplatesGeneral];
  } else if (relationshipStatus === 'married') {
    questPool = [...questTemplatesMarried, ...questTemplatesGeneral];
  }

  const excludes = new Set<string>((excludeTitles ?? []).map((t) => t.toLowerCase()));
  if (previousQuest?.title) {
    excludes.add(previousQuest.title.toLowerCase());
  }

  const available = questPool.filter((t) => !excludes.has(t.title.toLowerCase()));
  const baseTemplate = (available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : questPool[Math.floor(Math.random() * questPool.length)]);

  const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)] as string;

  const minNoByDifficulty: Record<QuestDifficulty, number> = {
    easy: 3,
    medium: 5,
    hard: 8,
    extreme: 10,
  };

  let title = baseTemplate.title;
  let description = baseTemplate.description;

  if (excludes.has(title.toLowerCase())) {
    const variants = [
      'in a different setting',
      'with a twist',
      'targeting a new audience',
      'using a bold opener',
      'with a time limit',
      'at a location you rarely visit',
      'with an unexpected angle',
    ];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    title = `${title} – ${params.rank} Remix`;
    description = `${description}. Do it ${variant}.`;
  }

  const quest: Quest = {
    id: Date.now().toString(),
    title,
    description,
    type: isSuperQuest ? 'special' : difficulty === 'easy' ? 'daily' : difficulty === 'extreme' ? 'special' : 'weekly',
    difficulty,
    points: calculatePoints(difficulty, level, isSuperQuest),
    xp: calculateXP(difficulty, level, isSuperQuest),
    completed: false,
    icon: (baseTemplate as any).icon || randomIcon,
    minNoRequired: minNoByDifficulty[difficulty],
  };

  console.log('Quest generated successfully:', quest);
  return quest;
}
