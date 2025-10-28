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

interface QuestTemplate {
  title: string;
  description: string;
  icon: string;
  descriptionTemplate?: (count: number) => string;
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

const questTemplatesSingle: QuestTemplate[] = [
  {
    title: 'Ask Someone Out',
    description: 'Ask someone you\'re interested in out for coffee or a date',
    icon: 'coffee',
    descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} you're interested in out for coffee or a date. Each person counts as one attempt.`,
  },
  {
    title: 'Ask for Phone Numbers',
    description: 'Get phone numbers from people you find interesting',
    icon: 'message-circle',
    descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} for their phone number. Approach them with genuine interest and confidence.`,
  },
  {
    title: 'Compliment Strangers',
    description: 'Give genuine compliments to strangers',
    icon: 'flame',
    descriptionTemplate: (count: number) => `Give ${count} genuine ${count === 1 ? 'compliment' : 'compliments'} to ${count === 1 ? 'a stranger' : 'different strangers'}. Be authentic and specific about what you appreciate.`,
  },
  {
    title: 'Request Store Discounts',
    description: 'Ask for discounts on regular-priced items',
    icon: 'target',
    descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'store' : 'different stores'} and ask for a discount on a regular-priced item. Be polite and confident.`,
  },
  {
    title: 'Invite to Activities',
    description: 'Invite people to join you for activities',
    icon: 'trending-up',
    descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to join you for a specific activity you enjoy. Be clear about what you're inviting them to.`,
  },
];

const questTemplatesMarried: QuestTemplate[] = [
  {
    title: 'Bold Partner Requests',
    description: 'Ask your partner for things they usually say no to',
    icon: 'coffee',
    descriptionTemplate: (count: number) => `Ask your partner to do ${count} ${count === 1 ? 'thing' : 'different things'} they usually say no to. Be bold and vulnerable with your requests.`,
  },
  {
    title: 'Quality Time Requests',
    description: 'Request device-free quality time',
    icon: 'message-circle',
    descriptionTemplate: (count: number) => `Ask your partner ${count} ${count === 1 ? 'time' : 'times'} to put away devices for quality time. Suggest specific activities for each request.`,
  },
  {
    title: 'New Experiences Together',
    description: 'Suggest new activities or hobbies',
    icon: 'flame',
    descriptionTemplate: (count: number) => `Suggest ${count} new ${count === 1 ? 'activity or hobby' : 'activities or hobbies'} to try with your partner. Be specific about what you want to try.`,
  },
  {
    title: 'Ask for Help',
    description: 'Request help with things you usually handle alone',
    icon: 'target',
    descriptionTemplate: (count: number) => `Ask for help with ${count} ${count === 1 ? 'task' : 'tasks'} you usually handle alone. Be vulnerable and specific about what you need.`,
  },
  {
    title: 'Express Your Needs',
    description: 'Share emotional needs or desires',
    icon: 'trending-up',
    descriptionTemplate: (count: number) => `Share ${count} emotional ${count === 1 ? 'need or desire' : 'needs or desires'} with your partner. Be honest and vulnerable.`,
  },
];

const categoryTemplates: Record<CategoryId, QuestTemplate[]> = {
  business: [
    { 
      title: 'Pitch Product Ideas', 
      description: 'Share product concepts and ask for feedback', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Pitch your product idea to ${count} ${count === 1 ? 'person' : 'people'} and ask for feedback or a pre-order. Be clear and concise.` 
    },
    { 
      title: 'Cold Email Clients', 
      description: 'Reach out to potential clients', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Send ${count} cold ${count === 1 ? 'email' : 'emails'} to potential clients with a clear ask. Personalize each message.` 
    },
    { 
      title: 'Request Testimonials', 
      description: 'Ask for testimonials from past clients', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Request ${count === 1 ? 'a testimonial' : `${count} testimonials`} from past clients or colleagues. Be specific about what you need.` 
    },
    { 
      title: 'Post on LinkedIn', 
      description: 'Publish value-packed posts', 
      icon: 'trending-up', 
      descriptionTemplate: (count: number) => `Publish ${count} value-packed ${count === 1 ? 'post' : 'posts'} on LinkedIn and ask for input. Share insights from your experience.` 
    },
  ],
  dating: [
    { 
      title: 'Coffee Invitations', 
      description: 'Invite strangers for coffee', 
      icon: 'coffee', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'stranger' : 'strangers'} out for coffee. Be polite and genuine with each approach.` 
    },
    { 
      title: 'Compliment People', 
      description: 'Give genuine compliments', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Give ${count} genuine ${count === 1 ? 'compliment to someone' : 'compliments to different people'}. Be specific and authentic.` 
    },
    { 
      title: 'Start Conversations', 
      description: 'Talk to new people in real life', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Start ${count === 1 ? 'a conversation' : `${count} conversations`} with ${count === 1 ? 'a stranger' : 'strangers'} in real life. Keep it going for at least 2 minutes.` 
    },
    { 
      title: 'Make Bold Asks', 
      description: 'Make asks that might get rejected', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Make ${count} bold ${count === 1 ? 'ask' : 'asks'} that might get rejected. Step outside your comfort zone.` 
    },
  ],
  adventure: [
    { 
      title: 'Try New Foods', 
      description: 'Order foods you\'ve never tried', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Order ${count} ${count === 1 ? 'food' : 'different foods'} you've never had before. Describe the taste of each.` 
    },
    { 
      title: 'Dance in Public', 
      description: 'Dance in safe public places', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Dance for 10 seconds in ${count} ${count === 1 ? 'public place' : 'different public places'}. Embrace the discomfort.` 
    },
    { 
      title: 'Secret Menu Items', 
      description: 'Ask for off-menu items', 
      icon: 'coffee', 
      descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'place' : 'places'} and ask for something off-menu. Be creative with your requests.` 
    },
    { 
      title: 'Reflect on Adventure', 
      description: 'Record your reactions', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Complete ${count} ${count === 1 ? 'adventure' : 'adventures'} and capture a short reflection on how it felt.` 
    },
  ],
  fitness: [
    { 
      title: 'Ask Trainers Questions', 
      description: 'Get advice from fitness trainers', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'trainer' : 'trainers'} for advice on moves or routines. Don't be shy about learning.` 
    },
    { 
      title: 'Try New Workouts', 
      description: 'Try workout modalities you\'ve never done', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Try ${count} new workout ${count === 1 ? 'modality' : 'modalities'} you've never done before. Do a beginner session for each.` 
    },
    { 
      title: 'Gym Conversations', 
      description: 'Talk to people at the gym', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Start ${count === 1 ? 'a conversation' : `${count} conversations`} at the gym. Ask about their training journey.` 
    },
    { 
      title: 'Push-ups After Rejections', 
      description: 'Convert rejections into progress', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Do 10 push-ups after each of your ${count} ${count === 1 ? 'rejection' : 'rejections'}. Turn no's into gains.` 
    },
  ],
  wealth: [
    { 
      title: 'Negotiate Discounts', 
      description: 'Ask for discounts at checkout', 
      icon: 'trending-up', 
      descriptionTemplate: (count: number) => `Ask for discounts at ${count} ${count === 1 ? 'store' : 'stores'}. Be friendly and confident.` 
    },
    { 
      title: 'Request Raises', 
      description: 'Ask for compensation reviews', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Prepare and request ${count === 1 ? 'a compensation review' : `${count} compensation discussions`}. Present your value clearly.` 
    },
    { 
      title: 'Sell Old Items', 
      description: 'List unused items online', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `List ${count} unused ${count === 1 ? 'item' : 'items'} online for sale. Take good photos and write clear descriptions.` 
    },
    { 
      title: 'Pitch to Investors', 
      description: 'Share your pitch with investors', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Share your pitch with ${count} ${count === 1 ? 'investor' : 'investors'} and ask for feedback. Keep it under one minute.` 
    },
  ],
  creativity: [
    { 
      title: 'Post Short Videos', 
      description: 'Publish video content', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Publish ${count} short ${count === 1 ? 'video' : 'videos'} (30-60 seconds) about something you learned. Share your insights.` 
    },
    { 
      title: 'Write Tweets', 
      description: 'Share thoughts publicly', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Write and post ${count} concise ${count === 1 ? 'thought' : 'thoughts'} publicly. Be authentic and valuable.` 
    },
    { 
      title: 'Get Design Feedback', 
      description: 'Ask for feedback on your work', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Get feedback from ${count} ${count === 1 ? 'person' : 'people'} on something you made. Be open to criticism.` 
    },
    { 
      title: 'Launch Micro-Projects', 
      description: 'Publish small projects', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Launch ${count} tiny ${count === 1 ? 'project' : 'projects'} with clear links. Ship imperfect work.` 
    },
  ],
  mindset: [
    { 
      title: 'Talk to Strangers', 
      description: 'Start conversations with new people', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Start ${count === 1 ? 'a conversation' : `${count} conversations`} with ${count === 1 ? 'a stranger' : 'strangers'} and ask curious questions.` 
    },
    { 
      title: 'Share Failure Stories', 
      description: 'Post about your failures', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Share ${count} ${count === 1 ? 'failure story' : 'failure stories'} and what you learned. Be vulnerable and honest.` 
    },
    { 
      title: 'Ask for Help Publicly', 
      description: 'Make public requests for help', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Make ${count} public ${count === 1 ? 'ask' : 'asks'} for help. Don't be afraid to show you need support.` 
    },
    { 
      title: 'Face Small Fears', 
      description: 'Confront your fears', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Face ${count} ${count === 1 ? 'small fear' : 'small fears'}. Pick things that make you uncomfortable.` 
    },
  ],
  relationships: [
    { 
      title: 'Call Family Members', 
      description: 'Reach out to family', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Call ${count} family ${count === 1 ? 'member' : 'members'} and ask about their week. Be present in the conversation.` 
    },
    { 
      title: 'Apologize or Thank', 
      description: 'Share authentic apologies or thanks', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Share ${count} authentic ${count === 1 ? 'apology or thanks' : 'apologies or thanks'}. Be specific and genuine.` 
    },
    { 
      title: 'Ask Deep Questions', 
      description: 'Have meaningful conversations', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} deep ${count === 1 ? 'question' : 'questions'} like "What's something you've been thinking about lately?"` 
    },
    { 
      title: 'Plan Surprises', 
      description: 'Surprise people you care about', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Plan ${count} tiny ${count === 1 ? 'surprise' : 'surprises'} for ${count === 1 ? 'someone' : 'people'} you care about. Be thoughtful.` 
    },
  ],
  community: [
    { 
      title: 'Help Carry Groceries', 
      description: 'Offer to help people', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Offer to help ${count} ${count === 1 ? 'person' : 'people'} carry their groceries. Be kind and genuine.` 
    },
    { 
      title: 'Compliment Strangers', 
      description: 'Brighten people\'s days', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Give ${count} warm ${count === 1 ? 'compliment to a stranger' : 'compliments to strangers'}. Make their day brighter.` 
    },
    { 
      title: 'Volunteer Time', 
      description: 'Help causes you care about', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Volunteer ${count} ${count === 1 ? 'hour' : 'hours'} helping any cause. Give back to your community.` 
    },
    { 
      title: 'Donate Items', 
      description: 'Give away unused items', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Find and donate ${count} ${count === 1 ? 'item' : 'items'} you don't use. Help someone in need.` 
    },
  ],
};

const questTemplatesGeneral: QuestTemplate[] = [
  {
    title: 'Ask for Discounts',
    description: 'Visit stores and ask for discounts',
    icon: 'target',
    descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'store' : 'stores'} and ask for a discount on a regular-priced item. Be confident and friendly.`,
  },
  {
    title: 'Request Favors from Strangers',
    description: 'Ask strangers for small favors',
    icon: 'message-circle',
    descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'stranger' : 'strangers'} for a small favor. Step outside your comfort zone.`,
  },
  {
    title: 'Negotiate Prices',
    description: 'Negotiate at markets or stores',
    icon: 'trending-up',
    descriptionTemplate: (count: number) => `Try to negotiate prices at ${count} ${count === 1 ? 'place' : 'places'}. Practice your negotiation skills.`,
  },
  {
    title: 'Request Free Samples',
    description: 'Ask for free samples',
    icon: 'coffee',
    descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'store' : 'stores'} and ask for a free sample. Don't be shy.`,
  },
  {
    title: 'Apply for Stretch Jobs',
    description: 'Apply for positions above your level',
    icon: 'briefcase',
    descriptionTemplate: (count: number) => `Submit ${count} ${count === 1 ? 'application' : 'applications'} for ${count === 1 ? 'a position' : 'positions'} you think you're not qualified for. Aim high.`,
  },
  {
    title: 'Ask for Recommendations',
    description: 'Request recommendations or testimonials',
    icon: 'award',
    descriptionTemplate: (count: number) => `Request ${count === 1 ? 'a recommendation' : `${count} recommendations`} or ${count === 1 ? 'testimonial' : 'testimonials'} from ${count === 1 ? 'someone' : 'people'}. Build your credibility.`,
  },
  {
    title: 'Start Conversations',
    description: 'Talk to new people in public',
    icon: 'message-circle',
    descriptionTemplate: (count: number) => `Strike up ${count === 1 ? 'a conversation' : `${count} conversations`} with ${count === 1 ? 'a stranger' : 'strangers'} in public. Be friendly and curious.`,
  },
  {
    title: 'Request VIP Meetings',
    description: 'Reach out to influential people',
    icon: 'mail',
    descriptionTemplate: (count: number) => `Reach out to ${count} influential ${count === 1 ? 'person' : 'people'} and ask for ${count === 1 ? 'a meeting' : 'meetings'}. Be respectful of their time.`,
  },
  {
    title: 'Ask for Special Treatment',
    description: 'Request special accommodations',
    icon: 'flame',
    descriptionTemplate: (count: number) => `Request ${count} special ${count === 1 ? 'accommodation or exception' : 'accommodations or exceptions'}. Be polite but bold.`,
  },
];

export async function generateQuest(params: GenerateQuestParams): Promise<Quest> {
  const { difficulty, level, isSuperQuest = false, relationshipStatus, previousQuest, excludeTitles, categoryId } = params;

  console.log('Generating quest locally with params:', params);

  let questPool: QuestTemplate[] = questTemplatesGeneral;

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

  const requiredCount = minNoByDifficulty[difficulty];

  let title = baseTemplate.title;
  let description = baseTemplate.descriptionTemplate
    ? baseTemplate.descriptionTemplate(requiredCount)
    : baseTemplate.description;

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
    icon: baseTemplate.icon || randomIcon,
    minNoRequired: requiredCount,
  };

  console.log('Quest generated successfully:', quest);
  return quest;
}
