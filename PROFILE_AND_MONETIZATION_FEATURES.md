# Profile & Monetization Features

## Overview
This document describes the new profile picture and monetization features added to the Rejection Hero app.

## Features Implemented

### 1. Profile Picture Management

Users can now:
- **Upload custom profile pictures** from their device gallery
- **Take photos** using their device camera (mobile only)
- **Generate AI avatars** using text descriptions via DALL-E 3

#### Implementation Details
- Profile pictures are stored in Supabase Storage (`avatars` bucket)
- Avatar URLs are saved in the `profiles.avatar_url` database field
- Service file: `services/avatarService.ts`
- UI: Profile page (`app/profile.tsx`)

#### Usage
1. Navigate to Profile screen
2. Tap the avatar/edit badge
3. Choose from:
   - **Generate with AI**: Enter a text description (e.g., "young professional, glasses, smiling")
   - **Upload from Gallery**: Select an existing photo
   - **Take a Photo**: Capture a new photo with camera (mobile only)

---

### 2. Monetization System

#### Subscription Tiers

**Free Tier**
- 3 daily challenges
- Basic logging features
- Access to community features

**Pro Tier** ($9.99/month or $99.99/year)
- 10 daily challenges
- Advanced AI coach
- Custom "no" missions by topic
- Community marketplace access
- Anonymous mode

**Hero Mode** ($19.99/month or $199.99/year)
- ✨ **MOST POPULAR** ✨
- Unlimited daily challenges
- Advanced AI coach
- Custom missions
- Community marketplace
- Anonymous mode
- Priority support

**Team Tier** ($49.99/month or $499.99/year)
- All Hero Mode features
- Team dashboard with progress reports
- Group challenges
- Perfect for sales teams and organizations

#### Implementation Details

**Context**: `contexts/SubscriptionContext.tsx`
- Manages subscription state and features
- Provides tier-based feature gating
- Tracks daily challenge usage

**Database Schema**: `UPDATE_PROFILES_SCHEMA.sql`
```sql
ALTER TABLE public.profiles
ADD COLUMN subscription_tier TEXT DEFAULT 'free',
ADD COLUMN subscription_expires_at TIMESTAMP,
ADD COLUMN daily_challenges_used INTEGER DEFAULT 0,
ADD COLUMN last_challenge_reset TIMESTAMP;
```

**Screens**:
- Subscription/Upgrade screen: `app/subscription.tsx`
- Settings integration for subscription management

#### Using Subscription Features

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { 
    tier,                      // 'free' | 'pro' | 'hero' | 'team'
    features,                  // Object with all feature flags
    canUseDailyChallenge,      // Boolean
    remainingChallenges,       // Number
    hasFeature,                // Function to check specific features
  } = useSubscription();

  // Check if user can use a feature
  if (!features.advancedAICoach) {
    // Show upgrade prompt
    router.push('/subscription');
    return;
  }

  // Check specific feature
  if (hasFeature('customMissions')) {
    // Enable custom missions UI
  }

  // Check daily challenge limit
  if (!canUseDailyChallenge) {
    // Show limit reached message
  }
}
```

---

## Database Setup

Run the SQL migration to add required fields:

```bash
# Execute UPDATE_PROFILES_SCHEMA.sql in your Supabase SQL editor
```

This will:
1. Add subscription fields to profiles table
2. Create storage bucket for avatars
3. Set up RLS policies for avatar storage
4. Add daily challenge reset function

---

## Storage Configuration

The `avatars` bucket in Supabase Storage needs to be created with:
- **Public access** for viewing avatars
- **RLS policies** for user-specific uploads

Policies are automatically created by the migration script.

---

## Feature Gating Examples

### Example 1: Limiting Daily Challenges
```typescript
const { canUseDailyChallenge, remainingChallenges, tier } = useSubscription();

const handleCreateQuest = () => {
  if (!canUseDailyChallenge) {
    Alert.alert(
      'Daily Limit Reached',
      `You've used all ${features.dailyChallengeLimit} challenges today. Upgrade to ${tier === 'free' ? 'Pro' : 'Hero'} for ${tier === 'free' ? 'more' : 'unlimited'} challenges!`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/subscription') }
      ]
    );
    return;
  }
  
  // Create quest...
};
```

### Example 2: Anonymous Mode Feature
```typescript
const { hasFeature } = useSubscription();

const AnonymousModeToggle = () => {
  const canUseAnonymousMode = hasFeature('anonymousMode');
  
  if (!canUseAnonymousMode) {
    return (
      <LockedFeature 
        title="Anonymous Mode"
        description="Upgrade to Pro to enable anonymous mode"
        onUpgrade={() => router.push('/subscription')}
      />
    );
  }
  
  return <Switch value={anonymousMode} onChange={setAnonymousMode} />;
};
```

---

## Integration Points

### Settings Screen
- Displays upgrade card for free users
- Shows subscription status for paying users
- Links to subscription management

### Profile Screen  
- Avatar management UI
- Visual indication of subscription tier (optional badge)

### Home/Quest Creation
- Daily challenge limit enforcement
- Upgrade prompts when limits reached

---

## Future Enhancements

### Planned Features
1. **Payment Integration**: Stripe/RevenueCat for actual subscriptions
2. **Team Management**: Admin dashboard for team tier
3. **Community Marketplace**: Buy/sell custom quests
4. **Analytics Dashboard**: Track progress and insights (Pro+)
5. **Calendar Sync**: Integration with device calendars (Pro+)
6. **Push Notifications**: Customizable reminders (all tiers)

### Technical Debt
- Add automated daily challenge reset (currently manual)
- Implement subscription expiration checks
- Add grace period for expired subscriptions
- Create admin panel for subscription management

---

## Testing

### Test Profile Picture Upload
1. Navigate to Profile
2. Tap avatar
3. Try all three methods (AI, gallery, camera)
4. Verify upload completes successfully
5. Check avatar displays correctly

### Test Subscription Flow
1. As free user, navigate to Settings
2. Tap "Upgrade to Pro" card
3. Review subscription tiers
4. Verify pricing displays correctly
5. Test billing period toggle (monthly/yearly)

### Test Feature Gating
1. Create multiple daily challenges as free user
2. Verify limit enforcement at 3 challenges
3. Upgrade to Pro tier (manually in database)
4. Verify limit increases to 10
5. Test unlimited challenges with Hero tier

---

## Troubleshooting

### Avatar Upload Fails
- Check Supabase Storage bucket exists
- Verify RLS policies are set correctly
- Ensure user is authenticated
- Check network connectivity

### Subscription Features Not Working
- Verify SubscriptionProvider is in app layout
- Check user subscription_tier in database
- Validate subscription_expires_at is in future
- Clear app cache/restart

### Daily Challenge Counter Not Resetting
- The reset function needs to be scheduled
- Can be triggered manually or via cron job
- Temporary: Reset manually in database

---

## API Reference

### `useSubscription()` Hook

Returns:
```typescript
{
  tier: SubscriptionTier;
  features: SubscriptionFeatures;
  isSubscriptionActive: boolean;
  canUseDailyChallenge: boolean;
  remainingChallenges: number;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  getPricing: (tier) => { monthly: number; yearly: number };
  getTierBenefits: (tier) => string[];
}
```

### Avatar Service Functions

```typescript
// Upload avatar to Supabase Storage
uploadAvatar(userId: string, imageUri: string): Promise<string>

// Pick image from gallery
pickImage(): Promise<string | null>

// Take photo with camera
takePhoto(): Promise<string | null>

// Generate AI avatar with DALL-E 3
generateAIAvatar(prompt: string): Promise<string>
```
