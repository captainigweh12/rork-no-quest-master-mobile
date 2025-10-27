# Fix "Network request failed" Error

## The Issue
You're getting `AuthRetryableFetchError: Network request failed` with status 0, which means the request isn't reaching Supabase.

## Steps to Fix

### 1. Verify Environment Variables
Check that your `.env` file has:
```env
EXPO_PUBLIC_SUPABASE_URL=https://hotbmbscjxgayivmyenb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Configure Supabase Dashboard Settings

Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb

#### A. Authentication Settings
Navigate to: **Authentication → URL Configuration**

Add these URLs to "Site URL":
- Production: `https://rork.com`
- Development: `exp://localhost:8081` (for Expo Go)
- Your tunnel: `https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app`

#### B. Redirect URLs
Add to "Redirect URLs" list:
- `noquestmaster://`
- `exp://localhost:8081`
- `http://localhost:8081`
- `https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app`
- `https://rork.com`

#### C. Disable Email Confirmation (temporarily for testing)
Navigate to: **Authentication → Providers → Email**

Temporarily:
- ✅ Enable Email provider
- ❌ Uncheck "Confirm email"
- ❌ Uncheck "Secure email change"

This lets you test signup without email verification.

### 3. Test Connection

I've created a test page at `app/test-supabase-direct.tsx`.

Run it by navigating to `/test-supabase-direct` in your app:

1. Click "Test Health" - checks if Supabase is reachable
2. Click "Test Query" - tests database access
3. Click "Test Sign Up" - tests auth signup

### 4. Check CORS (Web Only)

If testing on web, make sure:
- Your browser isn't blocking the request
- No ad blockers or extensions interfering
- Try in an incognito window

### 5. Restart App

After making changes:
```bash
# Stop the current process, then:
expo start -c
```

The `-c` flag clears the cache and ensures environment variables reload.

### 6. Common Fixes

#### If still failing on mobile:
- Make sure you're using Expo Go (not a custom dev client)
- Check your phone's internet connection
- Try switching between WiFi and mobile data
- Make sure your Supabase project is not paused

#### If working on mobile but failing on web:
- Check browser console for CORS errors
- Verify the Supabase URL is accessible from your browser
- Try visiting: https://hotbmbscjxgayivmyenb.supabase.co/rest/v1/

### 7. Debug Logs

The app now logs detailed information. Check your console for:
- ` Initializing Supabase client...` - Should show URL and key presence
- `✅ Supabase client initialized` - Confirms initialization
- Any errors during signup/signin

## Expected Behavior After Fix

### Successful Signup:
```
📧 Signing up with Supabase Auth: user@example.com
✅ Sign up successful! Email confirmation required.
📬 Confirmation email sent to: user@example.com
```

### Successful Signin:
```
🔓 Signing in with Supabase Auth: user@example.com
👤 Loading user profile for: user@example.com
✅ Profile loaded: User Name
✅ Sign in successful!
```

## Still Having Issues?

1. Navigate to `/test-supabase-direct` in the app
2. Run all three tests
3. Copy the console output
4. Check if the "Test Health" passes - if not, it's a network/configuration issue
