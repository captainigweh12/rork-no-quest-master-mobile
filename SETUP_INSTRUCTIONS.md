# Setup Instructions

## Fixing the "Could not find table 'public.friends'" Error

This error occurs when the Supabase database doesn't have the required tables. Follow these steps to fix it:

### 1. Verify Your Supabase Connection

Check that your environment variables are correctly set in your app:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

These should point to the same Supabase project where you'll create the tables.

### 2. Run the Schema SQL

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the entire contents of `supabase-schema.sql` 
4. Paste it into the SQL Editor
5. Click "Run" to execute the SQL

This will create all necessary tables including:
- `user_profiles`
- `friends`
- `friend_invites`
- `quests`
- `quest_invites`
- `quest_progress`
- `place_queue`
- `chat_messages`
- `notifications`

It will also set up:
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic profile creation
- Functions for friend invites

### 3. Verify Tables Were Created

Run this query in the SQL Editor to confirm the tables exist:

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see all the tables listed above.

### 4. Test the Friends Query

After creating the tables, the app should be able to query friends without errors. The query will return an empty array if you don't have any friends yet, which is expected for new users.

## Image URI Fix

The app now uses the `SafeImage` and `Avatar` components to prevent empty image URI warnings. These components:
- Check if the URI is valid before rendering
- Show a fallback with initials if no image is available
- Prevent the "source.uri should not be an empty string" warning

### Usage Example:

```tsx
import { Avatar } from '@/components/SafeImage';

<Avatar 
  name="John Doe" 
  imageUrl={user.avatarUrl} 
  size={56} 
/>
```

## Troubleshooting

### "Schema cache" Error
If you still see schema cache errors after creating the tables:
1. Wait 1-2 minutes for PostgREST to reload
2. Try making a small change to the table (like adding a comment) to force a reload:
   ```sql
   COMMENT ON TABLE public.friends IS 'User friendships';
   ```

### RLS Policy Errors
If you get permission errors when querying:
1. Make sure you're logged in (have an active session)
2. Verify the RLS policies allow your user to access the data
3. Check that `auth.uid()` returns your user ID

### Connection Errors
If the app can't connect to Supabase:
1. Verify your environment variables are correct
2. Check that your Supabase project is active
3. Ensure you're using the correct anon key (not the service role key)
