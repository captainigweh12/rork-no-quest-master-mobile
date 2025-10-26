# Quick Fix Checklist ✓

Follow these steps in order to fix both issues:

## Step 1: Fix the Database ⚡

### Option A: Full Schema (Recommended)
- [ ] Open Supabase Dashboard: https://app.supabase.com
- [ ] Navigate to: SQL Editor
- [ ] Open file: `supabase-schema.sql`
- [ ] Copy all contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for "Success" message

### Option B: Quick Fix (Friends table only)
- [ ] Open Supabase Dashboard: https://app.supabase.com
- [ ] Navigate to: SQL Editor
- [ ] Open file: `QUICK_FIX.sql`
- [ ] Copy all contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for "Success" message

## Step 2: Verify Database ✓

Run this in SQL Editor to confirm:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friends';
```

Expected result: One row showing "friends"

- [ ] Friends table exists

## Step 3: Test the App 🚀

### Image Fix (Already Applied)
- [ ] Open the app
- [ ] Navigate to Community tab
- [ ] Check console - NO "source.uri should not be an empty string" warnings
- [ ] Avatars show initials when no image (not broken image icon)

### Database Fix
- [ ] Community tab loads without errors
- [ ] See "No friends yet" message (not error message)
- [ ] Try searching for users - works
- [ ] Try sending friend request - works

## Step 4: Clean Up (Optional)

If everything works, you can optionally:
- [ ] Delete `FIXES_APPLIED.md`
- [ ] Delete `CHECKLIST.md` 
- [ ] Delete `QUICK_FIX.sql` (if you used the full schema)
- [ ] Keep `SETUP_INSTRUCTIONS.md` for reference

---

## Quick Reference

### Files You Need to Run:
1. **In Supabase SQL Editor**: 
   - `supabase-schema.sql` (all tables) OR
   - `QUICK_FIX.sql` (friends table only)

### Files That Are Already Fixed:
- ✅ `components/SafeImage.tsx` - Prevents image errors
- ✅ `app/(tabs)/community.tsx` - Uses safe avatars
- ✅ `supabase-schema.sql` - Complete database schema

### Documentation Files:
- 📖 `SETUP_INSTRUCTIONS.md` - Detailed setup guide
- 📖 `FIXES_APPLIED.md` - What was fixed and why
- 📋 `CHECKLIST.md` - This file

---

## Common Issues

### ❌ "Table not found" still appears
**Solution**: Wait 60 seconds, then refresh. PostgREST needs time to reload.

### ❌ "Permission denied for table friends"
**Solution**: Make sure you're logged in. RLS policies require authentication.

### ❌ SQL error when running schema
**Solution**: 
1. Check if tables already exist: `\dt public.*`
2. If they do, use `DROP TABLE IF EXISTS` first (BE CAREFUL!)
3. Or use `CREATE TABLE IF NOT EXISTS` (already in our SQL)

### ❌ Can't see any friends
**Solution**: This is normal for new users! Add friends using:
1. Search users → Send request
2. Or share invite link → Friend accepts

---

## Success Criteria ✨

Your app is fixed when:
- ✅ No console warnings about empty image URIs
- ✅ Avatars display with fallback to initials
- ✅ Community tab loads without errors
- ✅ Friends query returns data (or empty array for new users)
- ✅ Can search and add friends

---

## Need Help?

1. Check `SETUP_INSTRUCTIONS.md` for detailed steps
2. Check `FIXES_APPLIED.md` for technical details
3. Verify your Supabase connection in `lib/supabase.ts`

Your Supabase Project: `hotbmbscjxgayivmyenb`
