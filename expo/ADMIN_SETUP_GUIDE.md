# Admin System Setup Guide

## Overview
This guide will help you set up the admin system for your NoQuest app. The admin system allows designated users to:
- View all users and their details
- Grant/revoke admin privileges
- Update user subscription tiers
- View app statistics (total users, paid users, quests, etc.)

## Setup Steps

### 1. Add Admin Column to Database

Run the SQL script `ADD_ADMIN_ROLE.sql` in your Supabase SQL Editor:

```bash
# This script will:
# 1. Add an is_admin column to user_profiles table
# 2. Set captainigweh12@gmail.com as an admin
# 3. Create RLS policies for admin access
# 4. Create indexes for performance
```

Navigate to your Supabase project → SQL Editor → paste the contents of `ADD_ADMIN_ROLE.sql` → Run

### 2. Verify Admin Setup

After running the SQL, verify the admin was created successfully:

```sql
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.is_admin,
  au.email as auth_email
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.is_admin = TRUE OR au.email = 'captainigweh12@gmail.com';
```

You should see a row with `is_admin = TRUE` for captainigweh12@gmail.com

### 3. Test the Admin Dashboard

1. **Log in** as captainigweh12@gmail.com in your app
2. **Open the menu** (three lines icon)
3. **Look for "Admin Dashboard"** - it should appear at the top with a shield icon and highlighted styling
4. **Click on it** to access the admin dashboard

### 4. Admin Dashboard Features

#### Statistics Cards
- **Total Users**: Total number of registered users
- **Paid Users**: Users with non-free subscription tiers
- **Total Quests**: All quests created in the system
- **Completed Quests**: Quests that have been completed

#### User Management
- **Search**: Search users by email, full name, or username
- **View Details**: See user level, points, streak, and subscription tier
- **Grant/Revoke Admin**: Toggle admin privileges for any user
- **Update Subscription**: Change user subscription tier (Free, Pro, Hero, Team)

#### Access Control
- Only users with `is_admin = TRUE` can access the dashboard
- Non-admin users will see an "Access Denied" alert if they try to access it
- The Admin Dashboard menu item only appears for admin users

## Adding More Admins

To add more admins, run this SQL command in Supabase:

```sql
-- Replace 'user@example.com' with the email of the user you want to make admin
UPDATE public.user_profiles
SET is_admin = TRUE
WHERE email = 'user@example.com';
```

Or use the admin dashboard interface:
1. Log in as an existing admin
2. Go to Admin Dashboard
3. Find the user you want to make admin
4. Click the shield icon next to their name

## Security Notes

1. **RLS Policies**: The database has Row Level Security enabled
   - Admins can view all user profiles
   - Regular users can only view their own profile and public profiles

2. **Frontend Protection**: The app checks `user.isAdmin` before showing the menu item and dashboard

3. **Backend Protection**: All admin queries include the `enabled: user?.isAdmin === true` flag

## Troubleshooting

### Issue: Admin Dashboard not showing in menu
**Solution**: 
1. Make sure you're logged in as an admin user
2. Check if `is_admin = TRUE` in the database for your user
3. Try logging out and logging back in to refresh the user profile

### Issue: "Access Denied" error
**Solution**: 
1. Verify the email matches exactly in the database
2. Run the verification query to check admin status
3. Make sure you ran the `ADD_ADMIN_ROLE.sql` script

### Issue: Can't see other users in the dashboard
**Solution**: 
1. Check RLS policies are created correctly
2. Verify the admin has `is_admin = TRUE` in user_profiles table
3. Check console logs for any query errors

## Files Modified

1. **contexts/AuthContext.tsx** - Added `isAdmin` field to User interface
2. **components/SideMenu.tsx** - Added Admin Dashboard menu item (visible to admins only)
3. **app/admin.tsx** - New admin dashboard page
4. **ADD_ADMIN_ROLE.sql** - SQL script to set up admin functionality

## Next Steps

After setting up the admin system, you can:
- Customize the dashboard with more statistics
- Add more admin actions (e.g., delete users, ban users)
- Create admin logs for audit trails
- Add email notifications for admin actions
