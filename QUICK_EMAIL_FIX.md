# ⚡ Quick Email Fix

## The Issue
Backend can't access `RESEND_API_KEY` environment variable.

## The Fix (30 seconds)

### In your E2B terminal where the backend runs:

```bash
# 1. Stop the backend (Ctrl+C)

# 2. Set the environment variable
export RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5

# 3. Restart the backend
cd backend
bun run dev
```

### Verify It Worked

You should see on startup:
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true    ← This should be TRUE
📧 RESEND_API_KEY preview: re_8NoeRnF...
```

If you see `false`, the variable didn't load.

## Test It

1. Open your app
2. Go to `/debug-email`
3. Click "Test Backend Health"
   - Should see: `"resend_configured": true`
4. Click "Test Direct Email Endpoint"
   - Should succeed and send email

## Alternative: Load from File

If `export` doesn't work, make sure your backend startup command loads `.env`:

```bash
# If using dotenv
node -r dotenv/config backend/dist/index.js

# If using Bun (should auto-load)
bun run backend/hono.ts

# Or set inline
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5 bun run backend/hono.ts
```

## Still Not Working?

### Check Resend Domain
- The backend sends from `onboarding@rejectionhero.com`
- **This domain MUST be verified in Resend**: https://resend.com/domains
- If not verified, change to test domain:
  ```typescript
  from: 'Rejection Hero <onboarding@resend.dev>'
  ```
  (Only sends to YOUR email, but good for testing)

### Check Backend Logs
Look for these in your backend terminal:
- `❌ RESEND_API_KEY is not set` = Environment variable problem
- `❌ Resend API error:` = Domain/API key problem
- `✅ Email sent successfully!` = It worked!

## Next: Read Full Guide
See `EMAIL_DEBUG_INSTRUCTIONS.md` for complete debugging steps.
