# Fix user_profiles Table Issues

## Problem
You're seeing these errors:
- ❌ Error reading profile: [object Object]
- ❌ Upsert profile error: [object Object]

This is likely because:
1. The table was renamed from `profiles` to `user_profiles` in Supabase
2. But some database constraints, triggers, or foreign keys still reference the old `profiles` table name

## Solution Steps

### Step 1: Verify Current State
Run `VERIFY_USER_PROFILES.sql` in your Supabase SQL Editor to check:
- Table name (should be `user_profiles`)
- Column structure
- RLS policies
- Indexes
- Foreign keys
- Triggers

### Step 2: Fix the Table
Run `FIX_USER_PROFILES_TABLE.sql` in your Supabase SQL Editor. This will:
- Rename `profiles` to `user_profiles` if needed
- Add missing columns
- Set up proper RLS policies
- Create necessary indexes
- Set up triggers for auto-updates
- Verify the configuration

### Step 3: Fix Foreign Key References
If you renamed the table, you need to update all foreign key constraints in other tables:

```sql
-- Check all foreign keys that reference the old 'profiles' table
SELECT 
  tc.table_name, 
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage AS ccu
    WHERE ccu.constraint_name = tc.constraint_name
    AND ccu.table_name = 'profiles'
  );
```

For each foreign key found, you'll need to drop and recreate it:

```sql
-- Example for teams table
ALTER TABLE public.teams 
  DROP CONSTRAINT IF EXISTS teams_owner_id_fkey;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;
```

### Step 4: Update Teams Tables
If you have teams tables, run this to fix their foreign keys:

```sql
-- Fix teams table foreign keys
ALTER TABLE public.teams 
  DROP CONSTRAINT IF EXISTS teams_owner_id_fkey;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

-- Fix team_members table foreign keys
ALTER TABLE public.team_members 
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

-- Fix team_tasks table foreign keys
ALTER TABLE public.team_tasks 
  DROP CONSTRAINT IF EXISTS team_tasks_created_by_fkey;
ALTER TABLE public.team_tasks
  ADD CONSTRAINT team_tasks_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

-- Fix team_task_assignments table foreign keys
ALTER TABLE public.team_task_assignments 
  DROP CONSTRAINT IF EXISTS team_task_assignments_user_id_fkey;
ALTER TABLE public.team_task_assignments
  ADD CONSTRAINT team_task_assignments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

-- Fix team_invites table foreign keys
ALTER TABLE public.team_invites 
  DROP CONSTRAINT IF EXISTS team_invites_inviter_id_fkey;
ALTER TABLE public.team_invites
  ADD CONSTRAINT team_invites_inviter_id_fkey 
  FOREIGN KEY (inviter_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.team_invites 
  DROP CONSTRAINT IF EXISTS team_invites_invitee_id_fkey;
ALTER TABLE public.team_invites
  ADD CONSTRAINT team_invites_invitee_id_fkey 
  FOREIGN KEY (invitee_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;
```

### Step 5: Test the Fix
After running the SQL fixes:

1. **Check the app logs** - The improved error logging will now show detailed error information
2. **Try signing in** - Check if profiles load correctly
3. **Try updating profile** - Test username, avatar, relationship status updates
4. **Check console logs** - Look for these success messages:
   - ✅ Profile loaded
   - ✅ Profile created/updated
   - ✅ Username updated
   - ✅ Avatar URL updated

### Step 6: If Issues Persist

If you still see errors, check the detailed error logs. They now include:
- Error code
- Error message
- Error details
- Error hint

Common error codes:
- `42P01` - Table does not exist
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `PGRST116` - No rows found (this is normal)

### Alternative: Start Fresh

If you want to completely recreate the table with the correct name:

1. **Backup your data**:
```sql
-- Export existing profiles
CREATE TABLE profiles_backup AS SELECT * FROM public.user_profiles;
-- or SELECT * FROM public.profiles if it's still named that
```

2. **Drop and recreate**:
```sql
-- Drop the old table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Then run the CREATE_PROFILES_TABLE.sql or FIX_USER_PROFILES_TABLE.sql
```

3. **Restore your data**:
```sql
INSERT INTO public.user_profiles 
SELECT * FROM profiles_backup;
```

## Code Changes Made

The code has been updated to:
1. ✅ Use `user_profiles` table everywhere (already done)
2. ✅ Improved error logging to show detailed error information
3. ✅ Better error handling with proper error stringification

## Next Steps

1. Run `VERIFY_USER_PROFILES.sql` to diagnose the issue
2. Run `FIX_USER_PROFILES_TABLE.sql` to fix the table
3. Update foreign key constraints if needed
4. Test the app and check the detailed error logs
5. If you still have issues, share the detailed error logs from the console
