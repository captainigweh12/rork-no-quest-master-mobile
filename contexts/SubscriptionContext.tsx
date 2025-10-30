import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './AuthContext';
import { useMemo, useCallback } from 'react';

export type SubscriptionTier = 'free' | 'pro' | 'hero' | 'team';

interface SubscriptionFeatures {
  dailyChallengeLimit: number;
  unlimitedChallenges: boolean;
  advancedAICoach: boolean;
  customMissions: boolean;
  communityMarketplace: boolean;
  teamDashboard: boolean;
  anonymousMode: boolean;
  prioritySupport: boolean;
}

const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    dailyChallengeLimit: 3,
    unlimitedChallenges: false,
    advancedAICoach: false,
    customMissions: false,
    communityMarketplace: false,
    teamDashboard: false,
    anonymousMode: false,
    prioritySupport: false,
  },
  pro: {
    dailyChallengeLimit: 10,
    unlimitedChallenges: false,
    advancedAICoach: true,
    customMissions: true,
    communityMarketplace: true,
    teamDashboard: false,
    anonymousMode: true,
    prioritySupport: false,
  },
  hero: {
    dailyChallengeLimit: Infinity,
    unlimitedChallenges: true,
    advancedAICoach: true,
    customMissions: true,
    communityMarketplace: true,
    teamDashboard: false,
    anonymousMode: true,
    prioritySupport: true,
  },
  team: {
    dailyChallengeLimit: Infinity,
    unlimitedChallenges: true,
    advancedAICoach: true,
    customMissions: true,
    communityMarketplace: true,
    teamDashboard: true,
    anonymousMode: true,
    prioritySupport: true,
  },
};

const SUBSCRIPTION_PRICES = {
  pro: {
    monthly: 9.99,
    yearly: 99.99,
  },
  hero: {
    monthly: 19.99,
    yearly: 199.99,
  },
  team: {
    monthly: 49.99,
    yearly: 499.99,
  },
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const { user } = useAuth();

  const tier = useMemo<SubscriptionTier>(() => {
    return user?.subscriptionTier || 'free';
  }, [user?.subscriptionTier]);

  const features = useMemo<SubscriptionFeatures>(() => {
    return SUBSCRIPTION_FEATURES[tier];
  }, [tier]);

  const isSubscriptionActive = useMemo(() => {
    if (tier === 'free') return false;
    if (!user?.subscriptionExpiresAt) return false;
    
    const expiresAt = new Date(user.subscriptionExpiresAt);
    return expiresAt > new Date();
  }, [tier, user?.subscriptionExpiresAt]);

  const canUseDailyChallenge = useMemo(() => {
    const used = user?.dailyChallengesUsed || 0;
    return used < features.dailyChallengeLimit;
  }, [user?.dailyChallengesUsed, features.dailyChallengeLimit]);

  const remainingChallenges = useMemo(() => {
    if (features.unlimitedChallenges) return Infinity;
    const used = user?.dailyChallengesUsed || 0;
    return Math.max(0, features.dailyChallengeLimit - used);
  }, [user?.dailyChallengesUsed, features.dailyChallengeLimit, features.unlimitedChallenges]);

  const hasFeature = useCallback((featureName: keyof SubscriptionFeatures): boolean => {
    return features[featureName] as boolean;
  }, [features]);

  const getPricing = useCallback((selectedTier: 'pro' | 'hero' | 'team') => {
    return SUBSCRIPTION_PRICES[selectedTier];
  }, []);

  const getTierBenefits = useCallback((selectedTier: SubscriptionTier): string[] => {
    const tierFeatures = SUBSCRIPTION_FEATURES[selectedTier];
    const benefits: string[] = [];

    if (tierFeatures.unlimitedChallenges) {
      benefits.push('Unlimited daily challenges');
    } else {
      benefits.push(`Up to ${tierFeatures.dailyChallengeLimit} daily challenges`);
    }

    if (tierFeatures.advancedAICoach) {
      benefits.push('Advanced AI coach');
    }

    if (tierFeatures.customMissions) {
      benefits.push('Custom "no" missions by topic');
    }

    if (tierFeatures.communityMarketplace) {
      benefits.push('Access to community marketplace');
    }

    if (tierFeatures.teamDashboard) {
      benefits.push('Team dashboard & progress reports');
      benefits.push('Group challenges');
    }

    if (tierFeatures.anonymousMode) {
      benefits.push('Anonymous mode for sensitive tasks');
    }

    if (tierFeatures.prioritySupport) {
      benefits.push('Priority customer support');
    }

    return benefits;
  }, []);

  return useMemo(() => ({
    tier,
    features,
    isSubscriptionActive,
    canUseDailyChallenge,
    remainingChallenges,
    hasFeature,
    getPricing,
    getTierBenefits,
  }), [tier, features, isSubscriptionActive, canUseDailyChallenge, remainingChallenges, hasFeature, getPricing, getTierBenefits]);
});
