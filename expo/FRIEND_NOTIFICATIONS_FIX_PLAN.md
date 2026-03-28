# Friend Request Notifications Fix Plan

## Current Issues

1. **Notifications Service** - Uses localStorage instead of querying Supabase database
2. **No Push Notifications** - Friend requests create database records but don't trigger push notifications
3. **Missing Incoming Requests UI** - Community tab only shows outgoing pending requests, not incoming ones
4. **No Accept Flow** - Users can't accept friend requests they receive

## Required Fixes

### 1. Fix Notifications Service (services/supabase/notifications.ts)
- Query Supabase notifications table instead of localStorage
- Add proper real-time subscription to notifications
- Implement notification badge counting

### 2. Add Incoming Friend Requests Query
- Create `getIncomingFriendRequests` function in friends service
- Query for friend requests where user is the recipient (friend_id)

### 3. Add Friend Request Accept/Reject UI
- Add "Incoming Requests" section in Community tab
- Show incoming friend requests with Accept/Reject buttons
- Update UI after accepting/rejecting

### 4. Implement Push Notifications
- Send push notification when friend request is created
- Send push notification when friend request is accepted
- Use Expo push notification service

### 5. Fix Quest Sending
- Verify quest sending to friends works
- Ensure quest acceptance flow is properly implemented

## Implementation Order

1. Fix getIncomingFriendRequests in friends service
2. Fix notifications service to query Supabase
3. Add Incoming Requests UI to community tab
4. Implement push notification sending
5. Test complete flow

## Database Schema Assumptions

Tables needed:
- `friends` table with columns: user_id, friend_id, status (pending/accepted)
- `notifications` table with columns: user_id, type, title, message, related_id, read
- `user_profiles` table with column: expo_push_token
