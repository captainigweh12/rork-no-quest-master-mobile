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
  | 'community'
  | 'entrepreneurship'
  | 'sales'
  | 'confidence';

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
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  source?: 'livestream' | 'maps' | 'manual';
}

interface RejectionQuestTemplate {
  title: string;
  actionStatement: string; // Clear call to action
  icon: string;
  getDescription: (params: {
    count: number;
    level: number;
    intensity: 'mild' | 'moderate' | 'bold' | 'extreme';
  }) => string;
  requiresLocation?: boolean; // For map-based quests
  timerMinutes?: number; // Countdown timer in minutes
  intensityScaling: {
    mild: number; // Level 1-5
    moderate: number; // Level 6-10
    bold: number; // Level 11-20
    extreme: number; // Level 21+
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

function getIntensityForLevel(level: number): 'mild' | 'moderate' | 'bold' | 'extreme' {
  if (level <= 5) return 'mild';
  if (level <= 10) return 'moderate';
  if (level <= 20) return 'bold';
  return 'extreme';
}

function getTimerForDifficulty(difficulty: QuestDifficulty, source?: string): number {
  // Countdown timers based on difficulty (in minutes)
  const baseTimers: Record<QuestDifficulty, number> = {
    easy: 30,     // 30 minutes
    medium: 45,   // 45 minutes
    hard: 60,     // 1 hour
    extreme: 90,  // 1.5 hours
  };
  
  // Livestream quests get shorter timers for immediacy
  if (source === 'livestream') {
    return Math.round(baseTimers[difficulty] * 0.5);
  }
  
  return baseTimers[difficulty];
}

// REJECTION COACH TEMPLATES - Action-oriented, focused on getting NO's
const rejectionCoachTemplates: Record<CategoryId, RejectionQuestTemplate[]> = {
  dating: [
    {
      title: 'Ask For Coffee Dates',
      actionStatement: 'Approach and invite to coffee',
      icon: 'coffee',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const opener = intensity === 'extreme' ? 'Walk up to them boldly and say' : 
                      intensity === 'bold' ? 'Confidently approach and ask' :
                      intensity === 'moderate' ? 'Go up to them and invite' : 
                      'Politely ask';
        return `${opener}: "Would you like to grab coffee with me?" Target: Get ${count} NO's from ${count} different people. Remember: A "yes" doesn't count - only rejections build your courage.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
    {
      title: 'Request Phone Numbers',
      actionStatement: 'Ask for their number directly',
      icon: 'message-circle',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const approach = intensity === 'extreme' ? 'Be direct and bold' : 
                        intensity === 'bold' ? 'Ask confidently' :
                        intensity === 'moderate' ? 'Request politely' : 
                        'Ask if you can';
        return `${approach}: "Can I get your number?" Do this with ${count} people you find attractive. Goal: ${count} NO's. Each rejection is a win!`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 8, extreme: 12 },
    },
    {
      title: 'Give Hair Compliments',
      actionStatement: 'Compliment strangers on their hair',
      icon: 'flame',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const style = intensity === 'extreme' ? 'Walk up to complete strangers' : 
                     intensity === 'bold' ? 'Approach people you don\'t know' :
                     intensity === 'moderate' ? 'Go up to strangers' : 
                     'Find people';
        return `${style} and say: "I love your hair - it looks amazing!" Target ${count} people. They might ignore you or walk away - that's your ${count} NO's. Keep going!`;
      },
      intensityScaling: { mild: 5, moderate: 7, bold: 10, extreme: 15 },
    },
    {
      title: 'Invite To Activities',
      actionStatement: 'Ask strangers to join your plans',
      icon: 'target',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const invite = intensity === 'extreme' ? 'Tell them what you\'re doing and invite them immediately' : 
                      intensity === 'bold' ? 'Share your plans and ask them to join' :
                      intensity === 'moderate' ? 'Mention an activity and invite them' : 
                      'Ask if they want to do something';
        return `${invite}. Example: "I'm going hiking this weekend - want to come?" Ask ${count} people. Collect ${count} NO's to complete this quest.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
    {
      title: 'Make Bold Date Requests',
      actionStatement: 'Ask for specific date plans',
      icon: 'award',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const boldness = intensity === 'extreme' ? 'Don\'t small talk - go straight for the ask' : 
                        intensity === 'bold' ? 'Be direct and specific' :
                        intensity === 'moderate' ? 'Make a clear request' : 
                        'Suggest a specific plan';
        return `${boldness}: "Would you go on a dinner date with me this Friday?" Ask ${count} people you're interested in. Target: ${count} rejections. Yes doesn't count!`;
      },
      intensityScaling: { mild: 3, moderate: 4, bold: 6, extreme: 8 },
    },
  ],
  
  business: [
    {
      title: 'Request 100% Discount',
      actionStatement: 'Ask for items completely free',
      icon: 'target',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const ask = intensity === 'extreme' ? 'Walk in confidently and state' : 
                   intensity === 'bold' ? 'Ask the manager directly' :
                   intensity === 'moderate' ? 'Request from staff' : 
                   'Politely inquire';
        return `${ask}: "Can I get this for free today?" Visit ${count} different stores. You need ${count} NO's to win. Every rejection builds your sales immunity!`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
    {
      title: 'Pitch Product Pre-Orders',
      actionStatement: 'Sell before you build',
      icon: 'briefcase',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const pitch = intensity === 'extreme' ? 'Tell them about your idea and ask for money upfront' : 
                     intensity === 'bold' ? 'Pitch your concept and request pre-payment' :
                     intensity === 'moderate' ? 'Share your idea and ask for commitment' : 
                     'Describe your product and gauge interest';
        return `${pitch}. Target ${count} potential customers. Collect ${count} NO's - each one teaches you what NOT to do next time.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 8, extreme: 12 },
    },
    {
      title: 'Cold Email Decision Makers',
      actionStatement: 'Email executives cold',
      icon: 'mail',
      getDescription: ({ count, level, intensity }) => {
        const email = intensity === 'extreme' ? 'Find C-level executives and email them directly with a bold ask' : 
                     intensity === 'bold' ? 'Research and email senior leaders' :
                     intensity === 'moderate' ? 'Reach out to managers' : 
                     'Contact potential clients';
        return `${email}. Send ${count} emails with a clear call-to-action. You're shooting for ${count} rejections or no-replies. Silence is a no!`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 20 },
    },
    {
      title: 'Request Free Services',
      actionStatement: 'Ask businesses for free work',
      icon: 'trending-up',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const request = intensity === 'extreme' ? 'Walk in and ask for their premium service for free' : 
                       intensity === 'bold' ? 'Request their best service at no charge' :
                       intensity === 'moderate' ? 'Ask for complimentary work' : 
                       'Inquire about free options';
        return `${request}. Visit ${count} businesses. Goal: ${count} NO's. Each rejection proves you're pushing boundaries!`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],
  
  'door-knocking': [
    {
      title: 'Knock & Pitch Direct',
      actionStatement: 'Go door-to-door with your offer',
      icon: 'target',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const approach = intensity === 'extreme' ? 'Knock loudly, introduce yourself immediately, and pitch within 10 seconds' : 
                        intensity === 'bold' ? 'Knock confidently and deliver your pitch fast' :
                        intensity === 'moderate' ? 'Knock and share your offer' : 
                        'Politely knock and introduce yourself';
        return `${approach}. Hit ${count} doors. You're aiming for ${count} door slams or NO's. Rejection is the goal!`;
      },
      intensityScaling: { mild: 5, moderate: 10, bold: 15, extreme: 25 },
    },
    {
      title: 'Ask For Referrals',
      actionStatement: 'Request neighbor introductions',
      icon: 'mail',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const ask = intensity === 'extreme' ? 'After your pitch, immediately ask: "Who are your 3 closest neighbors I should talk to?"' : 
                   intensity === 'bold' ? 'Request specific neighbor names' :
                   intensity === 'moderate' ? 'Ask for referrals' : 
                   'See if they know anyone interested';
        return `${ask}. Knock on ${count} doors. Collect ${count} NO's when they refuse to give you names.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 20 },
    },
    {
      title: 'Offer Same-Day Service',
      actionStatement: 'Push for immediate commitments',
      icon: 'flame',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        const push = intensity === 'extreme' ? 'Tell them you can start work TODAY if they say yes now' : 
                    intensity === 'bold' ? 'Offer to begin immediately' :
                    intensity === 'moderate' ? 'Suggest starting soon' : 
                    'Mention you have availability';
        return `${push}. Target ${count} homes. Aim for ${count} "not today" or "we're not interested" responses.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 20 },
    },
  ],
  
  'cold-calling': [
    {
      title: 'Call & Close Fast',
      actionStatement: 'Make cold calls with urgency',
      icon: 'message-circle',
      getDescription: ({ count, level, intensity }) => {
        const call = intensity === 'extreme' ? 'Call and ask for the sale within 30 seconds. No small talk' : 
                    intensity === 'bold' ? 'Get to your ask in under 1 minute' :
                    intensity === 'moderate' ? 'Pitch quickly' : 
                    'Introduce yourself and offer';
        return `${call}. Make ${count} calls. Goal: ${count} hang-ups or NO's. Each rejection strengthens your phone game!`;
      },
      intensityScaling: { mild: 5, moderate: 10, bold: 15, extreme: 25 },
    },
    {
      title: 'Bypass Gatekeepers',
      actionStatement: 'Demand decision-maker access',
      icon: 'target',
      getDescription: ({ count, level, intensity }) => {
        const demand = intensity === 'extreme' ? 'When they answer, immediately say: "I need to speak with [decision maker] now"' : 
                      intensity === 'bold' ? 'Confidently request the decision maker by name' :
                      intensity === 'moderate' ? 'Ask to speak with leadership' : 
                      'Request the appropriate person';
        return `${demand}. Call ${count} companies. Get ${count} "I can't transfer you" or hang-ups. Gatekeepers are practice!`;
      },
      intensityScaling: { mild: 5, moderate: 10, bold: 15, extreme: 20 },
    },
    {
      title: 'Ask For Immediate Decisions',
      actionStatement: 'Push for yes or no NOW',
      icon: 'flame',
      getDescription: ({ count, level, intensity }) => {
        const push = intensity === 'extreme' ? 'After your pitch, say: "I need a yes or no right now - can you decide?"' : 
                    intensity === 'bold' ? 'Request an immediate answer' :
                    intensity === 'moderate' ? 'Ask for a quick decision' : 
                    'See if they can decide today';
        return `${push}. Make ${count} calls. Collect ${count} "let me think about it" or "no" responses.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 18 },
    },
  ],

  // Add similar rejection-focused templates for other categories...
  marketing: [
    {
      title: 'Ask Strangers To Share Content',
      actionStatement: 'Request immediate social shares',
      icon: 'trending-up',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Show strangers your content and ask them to share it RIGHT NOW on their phone. Target ${count} people. Get ${count} "I don't want to" responses.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 15 },
    },
  ],

  adventure: [
    {
      title: 'Ask For Secret Menu Items',
      actionStatement: 'Demand off-menu creations',
      icon: 'coffee',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Walk into ${count} restaurants and ask for something NOT on the menu. Goal: ${count} "we don't have that" responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],

  fitness: [
    {
      title: 'Ask To Work In',
      actionStatement: 'Request to share gym equipment',
      icon: 'target',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Approach ${count} people using equipment and ask: "Can I work in with you?" Collect ${count} "I'm almost done" or "no" responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 8, extreme: 12 },
    },
  ],

  wealth: [
    {
      title: 'Negotiate Everything',
      actionStatement: 'Haggle on every purchase',
      icon: 'trending-up',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `At ${count} stores, ask: "What's your best price on this?" before buying anything. Target: ${count} "the price is the price" responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 8, extreme: 12 },
    },
  ],

  creativity: [
    {
      title: 'Ask For Harsh Feedback',
      actionStatement: 'Request brutal criticism',
      icon: 'message-circle',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Show your work to ${count} people and say: "Tell me what's wrong with this - be harsh." Aim for ${count} critical responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],

  mindset: [
    {
      title: 'Face Small Fears Public',
      actionStatement: 'Do something uncomfortable',
      icon: 'flame',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Do ${count} things that scare you in public. Ask ${count} strangers to watch you do it. Goal: ${count} "that's weird" or walkaway responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],

  relationships: [
    {
      title: 'Ask For Big Favors',
      actionStatement: 'Request inconvenient help',
      icon: 'mail',
      getDescription: ({ count, level, intensity }) => {
        return `Ask ${count} friends/family for a significant favor that inconveniences them. Aim for ${count} "I can't right now" responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],

  community: [
    {
      title: 'Offer Help To Busy People',
      actionStatement: 'Help people who look rushed',
      icon: 'award',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Find ${count} busy-looking people and offer to help carry something. Get ${count} "I'm fine" or "no thanks" responses.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 15 },
    },
  ],

  entrepreneurship: [
    {
      title: 'Pitch Your Startup',
      actionStatement: 'Sell your vision cold',
      icon: 'briefcase',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `Pitch your startup idea to ${count} strangers and ask if they'd invest. Target: ${count} "not interested" responses.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 8, extreme: 12 },
    },
  ],

  sales: [
    {
      title: 'Close Or Walk',
      actionStatement: 'Push for immediate decisions',
      icon: 'target',
      getDescription: ({ count, level, intensity }) => {
        return `Make ${count} sales pitches where you ask for the sale within 2 minutes. Get ${count} "not ready" or NO responses.`;
      },
      intensityScaling: { mild: 5, moderate: 8, bold: 12, extreme: 20 },
    },
  ],

  confidence: [
    {
      title: 'Speak Up Boldly',
      actionStatement: 'Share opinions publicly',
      icon: 'flame',
      requiresLocation: true,
      getDescription: ({ count, level, intensity }) => {
        return `In ${count} public settings, voice a controversial opinion. Aim for ${count} disagreements or awkward silences.`;
      },
      intensityScaling: { mild: 3, moderate: 5, bold: 7, extreme: 10 },
    },
  ],
};

export async function generateQuest(params: GenerateQuestParams): Promise<Quest> {
  const { 
    difficulty, 
    level, 
    isSuperQuest = false, 
    previousQuest, 
    excludeTitles, 
    categoryId,
    userLocation,
    source 
  } = params;

  console.log('[REJECTION COACH] 🎯 Generating quest with params:', {
    difficulty,
    level,
    categoryId,
    source,
    hasLocation: !!userLocation,
  });

  // STRICT CATEGORY LOCKING - If categoryId provided, ONLY use that category
  if (!categoryId) {
    console.error('[REJECTION COACH] ❌ Category ID required for quest generation!');
    throw new Error('Category ID is required to generate rejection quests');
  }

  const categoryTemplates = rejectionCoachTemplates[categoryId];
  if (!categoryTemplates || categoryTemplates.length === 0) {
    console.error('[REJECTION COACH] ❌ No templates found for category:', categoryId);
    throw new Error(`No quest templates available for category: ${categoryId}`);
  }

  console.log('[REJECTION COACH] 🔒 CATEGORY LOCKED:', categoryId, '- Using', categoryTemplates.length, 'templates');

  // Filter out previously completed quests
  const excludes = new Set<string>((excludeTitles ?? []).map((t) => t.toLowerCase()));
  if (previousQuest?.title) {
    excludes.add(previousQuest.title.toLowerCase());
  }

  const availableTemplates = categoryTemplates.filter(
    (t) => !excludes.has(t.title.toLowerCase())
  );

  if (availableTemplates.length === 0) {
    console.warn('[REJECTION COACH] ⚠️ All templates used, resetting pool for category:', categoryId);
    // If all templates used, allow reuse but log it
  }

  const template = availableTemplates.length > 0
    ? availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
    : categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];

  // Progressive difficulty based on level
  const intensity = getIntensityForLevel(level);
  const noCount = template.intensityScaling[intensity];

  console.log('[REJECTION COACH] 📈 Level', level, '→ Intensity:', intensity, '→ Required NO\'s:', noCount);

  // Generate action-focused description
  const description = template.getDescription({
    count: noCount,
    level,
    intensity,
  });

  // Add countdown timer
  const timerMinutes = getTimerForDifficulty(difficulty, source);
  const timerEndAt = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();

  console.log('[REJECTION COACH] ⏱️ Timer set:', timerMinutes, 'minutes (ends at', new Date(timerEndAt).toLocaleTimeString(), ')');

  // Add location if quest requires it and location available
  const questLocation = template.requiresLocation && userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: 'Within 10-20 miles of your location',
      }
    : undefined;

  if (template.requiresLocation && !userLocation) {
    console.warn('[REJECTION COACH] ⚠️ Quest requires location but none provided');
  }

  const quest: Quest = {
    id: Date.now().toString(),
    title: template.title,
    description: `🎯 ${template.actionStatement}\n\n${description}\n\n⏱️ You have ${timerMinutes} minutes.\n💪 Remember: YES doesn't count - only NO's build your rejection immunity!`,
    type: isSuperQuest ? 'special' : difficulty === 'easy' ? 'daily' : difficulty === 'extreme' ? 'special' : 'weekly',
    difficulty,
    points: calculatePoints(difficulty, level, isSuperQuest),
    xp: calculateXP(difficulty, level, isSuperQuest),
    completed: false,
    icon: template.icon,
    minNoRequired: noCount,
    durationMinutes: timerMinutes,
    timerEndAt,
    location: questLocation,
    category: categoryId,
    source: 'ai',
    createdAt: new Date(),
  };

  console.log('[REJECTION COACH] ✅ Quest generated successfully!');
  console.log('[REJECTION COACH] 📁 Category:', quest.category, '(LOCKED)');
  console.log('[REJECTION COACH] 📝 Title:', quest.title);
  console.log('[REJECTION COACH] 🎯 Target NO\'s:', quest.minNoRequired);
  console.log('[REJECTION COACH] ⏱️ Timer:', quest.durationMinutes, 'minutes');
  console.log('[REJECTION COACH] 📍 Location:', quest.location ? 'Set' : 'Not required');

  return quest;
}
