# Database Setup Guide - Fix Missing Tables

You're seeing the error: `Could not find the table 'public.friend_invites' in the schema cache`

This means the table doesn't exist in your Supabase database. Follow these steps to fix it:

## Step 1: Verify what's missing

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query and paste the contents of `VERIFY_DATABASE.sql`
4. Click "Run" to see what tables are missing

## Step 2: Fix missing tables

1. Still in SQL Editor, create a new query
2. Paste the contents of `FIX_MISSING_TABLES.sql`
3. Click "Run"
4. You should see a success message and verification results at the bottom

## Step 3: Verify the fix worked

Run this quick check:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'friend_invites';
```

You should see one row returned with `friend_invites`.

## Step 4: If you need to create ALL tables from scratch

If multiple tables are missing, it's easier to run the complete schema:

1. In SQL Editor, create a new query
2. Paste the contents of `supabase-schema.sql`
3. Click "Run"

**Note:** The `CREATE TABLE IF NOT EXISTS` statements will only create tables that don't exist yet, so it's safe to run even if some tables already exist.

## Step 5: Restart your app

After creating the tables:
1. Close your Expo app completely
2. Clear your terminal
3. Run `npm start` (or `bun start`) again
4. Try the Community feature again

## Troubleshooting

### Error: "relation already exists"
This is fine - it means the table was already there. Just continue with the script.

### Error: "permission denied"
Make sure you're running the SQL as the `postgres` role (the default in Supabase SQL Editor).

### Error: "schema cache" still showing
1. Wait 1-2 minutes for PostgREST to reload
2. Or add this comment to force a reload:
   ```sql
   COMMENT ON TABLE public.friend_invites IS 'Reload schema cache';
   ```

### Still getting errors?
The issue might be that you're pointing to the wrong Supabase project. Verify:

1. Check your `.env` or app config
2. Find `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Go to Supabase Project Settings → API
4. Make sure the URL and anon key match exactly

## What tables are required?

Your app needs these tables:
- ✓ `user_profiles` - User data and stats
- ✓ `friends` - Friend relationships
- ✓ `friend_invites` - Invite links (this is what's missing!)
- ✓ `quests` - User quests
- ✓ `quest_invites` - Quest sharing
- ✓ `quest_progress` - Quest completion tracking
- ✓ `place_queue` - Map locations
- ✓ `chat_messages` - Friend chat
- ✓ `notifications` - In-app notifications
