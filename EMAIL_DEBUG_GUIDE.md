# Email Debug Guide

## What I've Added

### 1. Enhanced Error Logging in AuthContext
The app now logs detailed error information when email sending fails:
- Full error object structure
- Error type and all keys
- Message, data, error, and cause fields
- JSON stringified output for deep inspection

### 2. Debug Email Tool (`/debug-email`)
Navigate to `/debug-email` in your app to access a comprehensive debugging interface.

Features:
- **Environment Check**: Shows if `EXPO_PUBLIC_RORK_API_BASE_URL` is set
- **Test tRPC Email**: Tests the full email sending flow through tRPC
- **Test Direct Endpoint**: Tests the `/api/test-email` endpoint directly
- **Test Backend Health**: Verifies the backend is reachable
- **Real-time Logs**: See all API responses and errors in real-time

## How to Debug

### Step 1: Check Your Console Logs
When you try to sign up or resend verification, look for these logs:

```
🔍 DEBUGGING EMAIL ERROR - Full error object:
emailError type: ...
emailError keys: ...
emailError: ...
```

This will show you the **actual error structure** instead of `[object Object]`.

### Step 2: Use the Debug Email Tool
1. Navigate to `/debug-email` in your app
2. Check if `EXPO_PUBLIC_RORK_API_BASE_URL` is shown correctly
3. Click "Test Backend Health" to verify the backend is reachable
4. Click "Test Direct Email Endpoint" to test email sending
5. Click "Test tRPC Email Send" to test the full flow

### Step 3: Check Environment Variables
Make sure you have these set:

**Backend (.env or environment):**
- `RESEND_API_KEY` = your Resend API key (starts with `re_`)

**Frontend (.env):**
- `EXPO_PUBLIC_RORK_API_BASE_URL` = your backend URL (e.g., `https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app`)

### Step 4: Verify Resend Configuration
1. Go to https://resend.com/domains
2. Verify `rejectionhero.com` is added and verified (green checkmarks for SPF and DKIM)
3. Make sure you're sending from `onboarding@rejectionhero.com`

## Common Issues

### Issue 1: `[object Object]` Error
**Cause**: The error object isn't being stringified properly
**Solution**: Use the enhanced logging - it now shows the actual error

### Issue 2: Backend Not Reachable
**Cause**: Wrong `EXPO_PUBLIC_RORK_API_BASE_URL` or backend not running
**Solution**: 
- Check the URL is correct (should be `https://...` not `exp://...`)
- Use the "Test Backend Health" button in `/debug-email`

### Issue 3: RESEND_API_KEY Not Set
**Cause**: Environment variable not loaded in backend
**Solution**:
- Check backend logs for: `[Resend] API key present: true`
- Restart your backend after setting the env var

### Issue 4: Domain Not Verified
**Cause**: Resend can't send from unverified domain
**Solution**:
- Verify `rejectionhero.com` in Resend dashboard
- Add SPF and DKIM records to your DNS

### Issue 5: Email Blocked/Rate Limited
**Cause**: Too many test emails sent
**Solution**:
- Wait a few minutes
- Check Resend dashboard for rate limits
- Use a different test email address

## What the Backend Logs

The backend logs extensively. Look for these in your server console:

```
[Resend] Starting email send process...
[Resend] Target email: ...
[Resend] API key present: true
[Resend] Calling resend.emails.send()...
[Resend] ✅ Email sent successfully!
```

Or if it fails:
```
[Resend] ❌ Error from Resend API: ...
```

## Next Steps

1. Try signing up with a test email
2. Check the console logs for the detailed error output
3. Use the `/debug-email` tool to test each component
4. Share the specific error message from the logs

## Backend Test Endpoint

You can also test the email endpoint directly with curl:

```bash
curl "https://YOUR_BASE_URL/api/test-email?to=test@example.com"
```

This bypasses tRPC and tests the Resend API directly.
