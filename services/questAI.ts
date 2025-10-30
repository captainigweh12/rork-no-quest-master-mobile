import type { Quest, QuestDifficulty } from '@/types';

export type CategoryId =
  | 'business'
  | 'door-knocking'
  | 'cold-calling'
  | 'marketing'
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
  'door-knocking': [
    { 
      title: 'Knock and Pitch', 
      description: 'Visit homes and pitch your product/service', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Knock on ${count} ${count === 1 ? 'door' : 'doors'} and pitch your product or service. Stay confident through rejections.` 
    },
    { 
      title: 'Offer Free Trials', 
      description: 'Offer trial services at the doorstep', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'home' : 'homes'} and offer a free trial of your service. Practice handling objections.` 
    },
    { 
      title: 'Ask for Referrals', 
      description: 'Request referrals from homeowners', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'homeowner' : 'homeowners'} for referrals to neighbors or friends who might be interested. Some will say no.` 
    },
    { 
      title: 'Schedule Follow-ups', 
      description: 'Book callbacks with potential customers', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Knock on doors and schedule ${count} follow-up ${count === 1 ? 'appointment' : 'appointments'}. Not everyone will agree.` 
    },
  ],
  'cold-calling': [
    { 
      title: 'Make Cold Calls', 
      description: 'Call potential customers directly', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Make ${count} cold ${count === 1 ? 'call' : 'calls'} to potential customers. Practice your pitch and handle rejections professionally.` 
    },
    { 
      title: 'Pitch Decision Makers', 
      description: 'Call and pitch to key decision-makers', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Call ${count} ${count === 1 ? 'decision-maker' : 'decision-makers'} and pitch your solution. Be prepared for gatekeepers and objections.` 
    },
    { 
      title: 'Follow Up with Leads', 
      description: 'Call back interested prospects', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Follow up with ${count} ${count === 1 ? 'lead' : 'leads'} from previous calls. Some won't answer or will say no.` 
    },
    { 
      title: 'Handle Objections', 
      description: 'Call and overcome customer objections', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Make ${count} ${count === 1 ? 'call' : 'calls'} where you focus on handling objections. Turn rejections into learning opportunities.` 
    },
  ],
  marketing: [
    { 
      title: 'Create Social Campaigns', 
      description: 'Run promotional campaigns on social media', 
      icon: 'trending-up', 
      descriptionTemplate: (count: number) => `Create and launch ${count} social media ${count === 1 ? 'campaign' : 'campaigns'} promoting your product. Ask for feedback.` 
    },
    { 
      title: 'Pitch at Events', 
      description: 'Network and pitch at local events', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Attend ${count} local ${count === 1 ? 'event' : 'events'} and pitch your service to ${count === 1 ? 'attendees' : 'different attendees'}. Face potential rejections head-on.` 
    },
    { 
      title: 'Create Promotional Content', 
      description: 'Produce and share marketing materials', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Create ${count} ${count === 1 ? 'piece' : 'pieces'} of promotional content and ask ${count === 1 ? 'someone' : 'people'} to share it. Not everyone will.` 
    },
    { 
      title: 'Partner Outreach', 
      description: 'Reach out to potential partners', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Contact ${count} potential ${count === 1 ? 'partner' : 'partners'} to collaborate on marketing. Be ready for rejections.` 
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
      title: 'Ask for Secret Menu Items', 
      description: 'Ask for off-menu items at restaurants', 
      icon: 'coffee', 
      descriptionTemplate: (count: number) => `Visit ${count} ${count === 1 ? 'restaurant' : 'different restaurants'} and ask for something off-menu. They might say no.` 
    },
    { 
      title: 'Ask Strangers for Directions', 
      description: 'Ask strangers to guide you somewhere', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'stranger' : 'strangers'} to walk with you and show you directions. They might decline.` 
    },
    { 
      title: 'Request Free Upgrades', 
      description: 'Ask for free upgrades at restaurants or cafes', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'place' : 'different places'} for a free upgrade. Be polite when they say no.` 
    },
    { 
      title: 'Ask to Join Groups', 
      description: 'Ask strangers if you can join their activity', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'group' : 'different groups'} of strangers if you can join their activity. Embrace rejection.` 
    },
  ],
  fitness: [
    { 
      title: 'Ask for Free Training Sessions', 
      description: 'Request free personal training', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'trainer' : 'trainers'} for a free personal training session. They might say no.` 
    },
    { 
      title: 'Request Free Trial Classes', 
      description: 'Ask for free trial classes', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'gym or studio' : 'different gyms or studios'} for a free trial class. Be prepared for rejection.` 
    },
    { 
      title: 'Ask to Work In', 
      description: 'Ask to share equipment with people', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} at the gym if you can work in with them. They might decline.` 
    },
    { 
      title: 'Request Workout Advice', 
      description: 'Ask fit people for their routine', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'fit person' : 'fit people'} to share their workout routine with you. They might say no.` 
    },
  ],
  wealth: [
    { 
      title: 'Ask for Discounts', 
      description: 'Request discounts at checkout', 
      icon: 'trending-up', 
      descriptionTemplate: (count: number) => `Ask for discounts at ${count} ${count === 1 ? 'store' : 'stores'}. They might say no, but ask anyway.` 
    },
    { 
      title: 'Request Raises', 
      description: 'Ask for compensation reviews', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Ask ${count === 1 ? 'your boss' : 'for'} ${count === 1 ? '' : count} ${count === 1 ? 'for a raise' : 'raises or compensation reviews'}. Be prepared for rejection.` 
    },
    { 
      title: 'Ask to Borrow Money', 
      description: 'Request loans from friends or family', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to lend you money. They might say no.` 
    },
    { 
      title: 'Ask for Investments', 
      description: 'Request investment in your idea', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to invest in your idea. Expect some rejections.` 
    },
  ],
  creativity: [
    { 
      title: 'Ask People to View Your Work', 
      description: 'Request people watch your content', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to watch your video or view your work. They might say no.` 
    },
    { 
      title: 'Request Collaborations', 
      description: 'Ask creators to collaborate', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'creator' : 'creators'} to collaborate on a project. Be prepared for rejection.` 
    },
    { 
      title: 'Ask for Harsh Feedback', 
      description: 'Request brutal honesty on your work', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} for harsh feedback on something you made. They might reject your work.` 
    },
    { 
      title: 'Ask for Shares/Retweets', 
      description: 'Request people share your content', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to share or retweet your content. They might decline.` 
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
      title: 'Ask for Big Favors', 
      description: 'Request significant help from friends or family', 
      icon: 'mail', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} for a big favor they might decline. Be direct about what you need.` 
    },
    { 
      title: 'Request Quality Time', 
      description: 'Ask people to spend time with you', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to spend quality time with you doing something specific. They might be busy.` 
    },
    { 
      title: 'Ask for Personal Changes', 
      description: 'Request someone to change a habit for you', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} close to you to change something for your benefit. Be specific about what you want.` 
    },
    { 
      title: 'Borrow Money', 
      description: 'Ask friends or family to lend you money', 
      icon: 'briefcase', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'person' : 'people'} to lend you money. Practice being comfortable with potential rejection.` 
    },
  ],
  community: [
    { 
      title: 'Offer to Help Strangers', 
      description: 'Offer help to people who might decline', 
      icon: 'award', 
      descriptionTemplate: (count: number) => `Offer to help ${count} ${count === 1 ? 'stranger' : 'strangers'} carry their groceries or bags. They might say no.` 
    },
    { 
      title: 'Ask to Pet Dogs', 
      description: 'Ask strangers to pet their dogs', 
      icon: 'message-circle', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'dog owner' : 'dog owners'} if you can pet their dog. Some will say no.` 
    },
    { 
      title: 'Ask for Directions Then More', 
      description: 'Ask strangers for directions then conversation', 
      icon: 'target', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'stranger' : 'strangers'} for directions, then ask if they can walk you there. They might decline.` 
    },
    { 
      title: 'Request to Join Activities', 
      description: 'Ask to join people doing activities', 
      icon: 'flame', 
      descriptionTemplate: (count: number) => `Ask ${count} ${count === 1 ? 'group' : 'groups'} if you can join their activity. Be prepared for rejection.` 
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
  let priorityPool: QuestTemplate[] = [];

  if (categoryId && categoryTemplates[categoryId]) {
    priorityPool = categoryTemplates[categoryId];
    questPool = [...categoryTemplates[categoryId], ...questTemplatesGeneral];
  } else if (relationshipStatus === 'single') {
    priorityPool = questTemplatesSingle;
    questPool = [...questTemplatesSingle, ...questTemplatesGeneral];
  } else if (relationshipStatus === 'married') {
    priorityPool = questTemplatesMarried;
    questPool = [...questTemplatesMarried, ...questTemplatesGeneral];
  }

  const excludes = new Set<string>((excludeTitles ?? []).map((t) => t.toLowerCase()));
  if (previousQuest?.title) {
    excludes.add(previousQuest.title.toLowerCase());
  }

  const availablePriority = priorityPool.filter((t) => !excludes.has(t.title.toLowerCase()));
  const availableAll = questPool.filter((t) => !excludes.has(t.title.toLowerCase()));
  
  const baseTemplate = (availablePriority.length > 0
    ? availablePriority[Math.floor(Math.random() * availablePriority.length)]
    : availableAll.length > 0
    ? availableAll[Math.floor(Math.random() * availableAll.length)]
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
    category: categoryId,
  };

  console.log('Quest generated successfully:', quest);
  return quest;
}
