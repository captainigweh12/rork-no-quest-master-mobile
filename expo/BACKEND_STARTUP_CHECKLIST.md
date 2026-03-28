# ✅ Backend Startup Checklist

## Before Starting Backend

### 1. Set Environment Variable
```bash
export RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
```

### 2. Verify It's Set
```bash
echo $RESEND_API_KEY
```
Should output: `re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5`

### 3. Start Backend
```bash
cd backend
bun run dev
```

## Expected Startup Output ✅

```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true               ← Must see TRUE
📧 RESEND_API_KEY preview: re_8NoeRnF...     ← First 10 chars of key
🌍 Environment: development

🔑 [EMAIL ROUTE] Module loaded
   RESEND_API_KEY exists: true                ← Must see TRUE  
   RESEND_API_KEY preview: re_8NoeRnF...

[Server started on port 8081]
```

## If You See FALSE ❌

### Problem: Environment variable not loaded

### Quick Fix:
```bash
# Stop backend (Ctrl+C)

# Set it inline when starting:
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5 bun run backend/hono.ts
```

## Test Backend is Working

### Option 1: From Terminal
```bash
curl https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app/
```

Should return:
```json
{
  "status": "ok",
  "message": "API is running",
  "env": {
    "resend_configured": true    ← Must be TRUE
  }
}
```

### Option 2: From App
1. Open `/debug-email`
2. Click "Test Backend Health"
3. Look for: `Resend Configured: ✅ YES`

## Ready to Test Emails

Once you see "RESEND_API_KEY present: true", you can:

1. Use the `/debug-email` screen in your app
2. Test email sending
3. Sign up for a new account

## Common Issues

| What You See | Problem | Fix |
|--------------|---------|-----|
| `RESEND_API_KEY present: false` | Not set | `export RESEND_API_KEY=...` |
| `resend_configured: false` | Not loaded | Restart with inline var |
| Emails send but don't arrive | Domain issue | Check Resend dashboard |
| API error after sending | Rate limit / Invalid key | Check Resend settings |

## Domain Configuration

**Current sender**: `onboarding@rejectionhero.com`

### Check Domain Status:
1. Go to https://resend.com/domains
2. Find `rejectionhero.com`
3. Verify it has **green checkmarks** for DNS records

### If Domain Not Verified:
**Temporary fix** - use test domain:

Change in `backend/trpc/routes/auth/send-verification-email/route.ts`:
```typescript
from: 'Rejection Hero <onboarding@resend.dev>'
```

⚠️ Test domain only sends to YOUR email (the one you registered with Resend)

## Full Documentation

- **Quick Fix**: See `QUICK_EMAIL_FIX.md`
- **Complete Guide**: See `EMAIL_DEBUG_INSTRUCTIONS.md`
- **What We Changed**: See `DEBUGGING_SUMMARY.md`
