# 🔍 Email Service Debugging Instructions

## Current Status

The email verification system is set up to use Resend API with detailed logging. The issue is that **the backend needs access to the RESEND_API_KEY environment variable**.

## 🎯 The Problem

Your backend is running on E2B (development environment), but **environment variables aren't being passed to it**. The backend can't access `RESEND_API_KEY`, which is why emails aren't sending.

## ✅ Solution: Set Environment Variable in E2B

Since you're using E2B for your backend, you need to set the environment variable **where the backend process runs**.

### Option 1: E2B Environment Variables (Recommended)

1. **Find your E2B backend process**
   - The backend is running at: `https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app`
   - This is an E2B sandbox

2. **Set the environment variable in E2B**
   
   You can set it in your terminal where the backend runs:
   ```bash
   export RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
   ```

3. **Restart the backend server**
   ```bash
   # Kill the current process
   # Then restart it with:
   cd backend
   bun run dev
   # or
   node dist/index.js
   ```

### Option 2: Load from .env File

The backend now has a `.env` file at `backend/.env` with:
```
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
PORT=8081
```

**Make sure your backend loads this file**:

If using Node.js, ensure you have this at the top of your main file:
```typescript
import 'dotenv/config';
// or
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
```

If using Bun, it automatically loads `.env` files.

### Option 3: Pass Directly on Startup

Start your backend with the environment variable:
```bash
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5 bun run backend/hono.ts
```

## 🧪 Testing Steps

### Step 1: Check Backend Startup Logs

When you restart the backend, you should see:
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true
📧 RESEND_API_KEY preview: re_8NoeRnF...
🌍 Environment: development
```

If you see `RESEND_API_KEY present: false`, the environment variable is NOT loaded.

### Step 2: Test Backend Health

Open the debug screen in your app (`/debug-email`) and click **"Test Backend Health"**.

You should see:
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2025-01-26T...",
  "env": {
    "resend_configured": true,  // ← Should be true!
    "node_env": "development"
  }
}
```

### Step 3: Test Direct Email Endpoint

In the debug screen, click **"Test Direct Email Endpoint"**.

**Success looks like:**
```json
{
  "success": true,
  "messageId": "abc123...",
  "timestamp": "2025-01-26T..."
}
```

**Failure (missing API key) looks like:**
```json
{
  "success": false,
  "error": "Email service not configured - RESEND_API_KEY missing",
  "debug": {
    "env_keys": [],
    "all_env_keys_count": 47
  }
}
```

### Step 4: Test tRPC Email Send

Click **"Test tRPC Email Send"** in the debug screen.

Check the backend logs for detailed output.

## 📋 Backend Log Checklist

When testing, check your **backend terminal/console** for these logs:

### ✅ Good Logs (Everything Working):
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true
📧 RESEND_API_KEY preview: re_8NoeRnF...

🔑 [EMAIL ROUTE] Module loaded
   RESEND_API_KEY exists: true
   RESEND_API_KEY preview: re_8NoeRnF...

🧪 [TEST-EMAIL] Request received
   To: test@example.com
   Subject: Quest App – Test Email
   API Key exists: true
   API Key preview: re_8NoeRnF...
   Creating Resend client...
   Resend client created
   Sending email...
   ✅ Email sent successfully!
   Message ID: abc123...
```

### ❌ Bad Logs (API Key Missing):
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: false
📧 RESEND_API_KEY preview: undefined...

🔑 [EMAIL ROUTE] Module loaded
   RESEND_API_KEY exists: false
   RESEND_API_KEY preview: NOT SET

🧪 [TEST-EMAIL] Request received
   To: test@example.com
   Subject: Quest App – Test Email
   API Key exists: false
   API Key preview: NOT SET
   ❌ RESEND_API_KEY is not set in environment
```

## 🔧 If It Still Doesn't Work

### 1. Verify Resend Domain

The backend tries to send from `onboarding@rejectionhero.com`. 

**Check if this domain is verified in Resend:**
1. Go to https://resend.com/domains
2. Make sure `rejectionhero.com` is verified (green checkmarks)
3. If not verified, Resend will REJECT all emails from this domain

**Temporary workaround**: Use the Resend test domain
```typescript
from: 'Rejection Hero <onboarding@resend.dev>'
```

This will only send to YOUR email address (the one you signed up to Resend with).

### 2. Check Resend API Key

Log into https://resend.com/api-keys and verify:
- The API key is active
- It hasn't expired
- It has the correct permissions

### 3. Check Rate Limits

Resend free tier has limits:
- 100 emails/day
- 3,000 emails/month

Check https://resend.com/usage to see if you've hit limits.

## 🚀 Quick Fix Commands

Run these commands in your E2B terminal:

```bash
# 1. Navigate to backend
cd backend

# 2. Check if .env exists
cat .env
# Should show: RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5

# 3. Set environment variable
export RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5

# 4. Verify it's set
echo $RESEND_API_KEY
# Should show: re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5

# 5. Restart backend
bun run dev
# or whatever command starts your backend
```

## 📞 Next Steps

After setting the environment variable and restarting the backend:

1. **Check startup logs** - Should see "RESEND_API_KEY present: true"
2. **Test health endpoint** - Should see "resend_configured: true"
3. **Test direct email** - Should send successfully
4. **Test from app** - Sign up and check if verification email arrives

## 🐛 Share These for Further Debugging

If it still doesn't work, share:

1. **Backend startup logs** (first 20 lines when backend starts)
2. **Test endpoint response** (from debug screen)
3. **Backend terminal output** (when testing email send)
4. **Resend dashboard** (https://resend.com/emails) - check for failed sends

---

**Remember**: The key is that the **backend process** needs access to `RESEND_API_KEY`, not the Expo app!
