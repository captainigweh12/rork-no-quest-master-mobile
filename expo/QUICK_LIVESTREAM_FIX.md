# Quick Livestream Fix Guide

## ✅ What Was Fixed

1. **RLS Policy Error** - Stream creation blocked by Row Level Security
2. **tRPC 404 Error** - Backend URL not configured
3. **Object Logging** - Improved error messages
4. **Missing user_id** - Added proper authentication checks

## 🚀 Quick Setup (3 Steps)

### Step 1: Run SQL in Supabase
Go to your Supabase SQL Editor and run: **`FIX_LIVE_STREAMS_RLS.sql`**

### Step 2: Update .env
The `.env` file has been updated with:
```bash
EXPO_PUBLIC_RORK_API_BASE_URL=https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app
```

### Step 3: Restart Everything
```bash
# Stop all running processes
# Then restart:
npx expo start --clear
```

If you have a separate backend:
```bash
cd backend
bun run dev
```

## 🧪 Test It Works

1. **Login** to the app
2. **Navigate** to the stream page
3. **Create** a new stream
4. **Check console** - should see success messages, not errors

## 📝 Files Changed

- ✅ `services/supabase/streams.ts` - Added user authentication & better error logging
- ✅ `.env` - Added backend URL
- ✅ `FIX_LIVE_STREAMS_RLS.sql` - New SQL script for RLS policies

## 🔍 Still Having Issues?

### Check Backend is Running
```bash
curl https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app/api/health
```
Should return: `{"status":"healthy",...}`

### Check Environment Variable Loaded
In your app console, you should see:
```
[trpc] Base URL: https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app
```

### Check User is Authenticated
Before creating a stream, ensure you're logged in. The error will be clear if not:
```
[STREAMS] User not authenticated
Error: User must be authenticated to create a stream
```

## 📚 More Details
See `LIVESTREAM_FIXES.md` for detailed explanations
