# Friend Request Notifications Implementation Summary

## Completed Fixes

### 1. Android Loading Screen Fix ✅
**File:** `hooks/useAppInit.ts`

Fixed the app initialization sequence to properly load the base URL from AsyncStorage before using it:
```typescript
// Step 3: Load base URL override from storage
const { loadBaseUrlOverride, getBaseUrl } = await import('@/lib/baseUrl');
await loadBaseUrlOverride(); // Load stored override first
const baseUrl = getBaseUrl(); // Now safely get cached value
```

### 2. Incoming Friend Requests Function ✅
**File:** `services/supabase/friends.ts`

Added `getIncomingFriendRequests()` function to query friend requests where the user is the recipient:
```typescript
export async function getIncomingFriendRequests(userId: string): Promise<Friend[]>
```
- Queries `friends` table where `friend_id = userId` and `status = 'pending'`
- Returns list of users who have sent friend requests to the current user

### 3. Friend Type Update ✅
**File:** `types/index.ts`

Updated Friend interface to support 'incoming' friendship status:
```typescript
friendshipStatus?: 'pending' | 'accepted' | 'rejected' | 'incoming'
```

### 4. Notifications Service Rewrite ✅
**File:** `services/supabase/notifications.ts`

Completely rewrote to query Supabase instead of localStorage:
- `getNotifications()` - Queries notifications table from Supabase
- `markNotificationAsRead()` - Updates notification read status in database
- `markAllNotificationsAsRead()` - Bulk updates all unread notifications
- `subscribeToNotifications()` - Real-time subscription to new notifications via Supabase Realtime

## Remaining Work

### 1. Add Reject Friend Request Function ⏳
**File:** `services/supabase/friends.ts`

Need to add:
```typescript
export async function rejectFriendRequest(userId: string, friendId: string): Promise<void> {
  // Delete or update status to 'rejected' in friends table
  // where user_id = friendId and friend_id = userId
}
```

### 2. Update Community Tab UI ⏳
**File:** `app/(tabs)/community.tsx`

Current state:
- ✅ Has query for outgoing pending requests
- ❌ Missing query for incoming requests
- ❌ No UI to display incoming requests 
- ❌ No Accept/Reject buttons

Needed changes:
1. Add query using `getIncomingFriendRequests()`
2. Add "Incoming Requests" section above "Your Friends"
3. Show incoming requests with Accept/Reject buttons
4. Add mutations for accept/reject actions

### 3. Implement Push Notifications 📱⏳
**Files:** Multiple

Currently:
- ✅ Notification record is created in database when friend request is sent
- ❌ No push notification is actually sent to user's device
- ❌ User must open app and check notifications to see friend requests

What's needed:
1. Store Expo push tokens in `user_profiles` table
2. Add `expo_push_token` column via migration
3. Update `Context/AuthContext` or `NotificationsContext` to save push token to database
4. Create helper function to send push notifications
5. Update `sendFriendRequest()` to trigger push notification
6. Update `acceptFriendRequest()` to notify requester

### 4. Database Schema Updates 📊⏳

Need to verify/create these tables and columns:

```sql
-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add expo_push_token column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id, created_at DESC);
```

## Testing Checklist

Once implementation is complete, test:

- [ ] User A sends friend request to User B
- [ ] User B receives push notification on their device
- [ ] User B sees notification badge/count in app
- [ ] User B opens Notifications tab and sees "New Friend Request"
- [ ] User B navigates to Community tab
- [ ] User B sees incoming request in "Incoming Requests" section
- [ ] User B clicks Accept - friendship is created both ways
- [ ] User A receives notification that request was accepted
- [ ] Both users see each other in Friends list
- [ ] Users can send quests to each other
- [ ] Test Reject flow: User B rejects request, User A's outgoing request disappears

## Quick Implementation Guide

### Step 1: Add Reject Function
```typescript
// In services/supabase/friends.ts
export async function rejectFriendRequest(userId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .eq('status', 'pending');
    
  if (error) throw new Error(error.message);
}
```

### Step 2: Add Incoming Requests Query to Community Tab
```typescript
// In app/(tabs)/community.tsx
const incomingRequestsQuery = useQuery({
  queryKey: ['incomingFriends', user?.id],
  queryFn: async () => {
    if (!user?.id) throw new Error('User not authenticated');
    return await friendsService.getIncomingFriendRequests(user.id);
  },
  enabled: !!user?.id && tab === 'friends',
});
```

### Step 3: Add Accept/Reject Mutations
```typescript
// In app/(tabs)/community.tsx  
const acceptFriendRequestMutation = useMutation({
  mutationFn: (friendId: string) => 
    friendsService.acceptFriendRequest('', user!.id, friendId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['incomingFriends'] });
    Alert.alert('Success', 'Friend request accepted!');
  },
});

const rejectFriendRequestMutation = useMutation({
  mutationFn: (friendId: string) => 
    friendsService.rejectFriendRequest(user!.id, friendId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['incomingFriends'] });
    Alert.alert('Request rejected');
  },
});
```

### Step 4: Add UI Section
Add before "Your Friends" section in community.tsx to show incoming requests with Accept/Reject buttons.

## Files Modified

1. ✅ `hooks/useAppInit.ts` - Fixed Android loading screen
2. ✅ `services/supabase/friends.ts` - Added getIncomingFriendRequests
3. ✅ `types/index.ts` - Updated Friend type
4. ✅ `services/supabase/notifications.ts` - Rewrote to use Supabase  
5. ⏳ `app/(tabs)/community.tsx` - Needs incoming requests UI
6. ⏳ `services/supabase/friends.ts` - Needs rejectFriendRequest function

## Date
November 7, 2025
