# 🪝 Supabase Auth Hook with Edge Function Setup

## Current Status
✅ Edge Function Deployed: `https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation`
✅ Auth Hook Secret: `v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6`

---

## Step 1: Get Resend API Key

1. Go to https://resend.com/signup
2. Create a free account
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy your API key (starts with `re_`)

---

## Step 2: Add Environment Variable to Edge Function

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Edge Functions** (in left sidebar)
3. Click on **send-confirmation** function
4. Click **Settings** tab
5. Under **Environment Variables**, add:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```
6. Click **Save**

---

## Step 3: Configure Auth Hook in Supabase

1. In Supabase Dashboard, go to **Authentication** → **Hooks**
2. Find **Send Email Hook** section
3. Click **Enable Hook**
4. Configure:
   - **Hook Name**: Send Confirmation Email
   - **Enabled**: ✅ ON
   - **PostgreSQL Function**: Leave empty (we're using HTTP)
   - **HTTP Endpoint**:
     ```
     https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation
     ```
   - **HTTP Secret**:
     ```
     v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6
     ```
   - **Events**: Check **"Send confirmation email"** (user.signup)
5. Click **Save**

---

## Step 4: Test the Flow

### Test Sign Up

1. Open your app
2. Try to sign up with a new email
3. Check the console logs:
   ```
   📧 Signing up with Supabase Auth: your@email.com
   ✅ Sign up successful! Email confirmation required.
   📬 Confirmation email sent to: your@email.com
   ```

### Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **send-confirmation**
3. Go to **Logs** tab
4. You should see:
   ```
   🚀 Send Confirmation Email Function Started
   📧 Incoming request to send confirmation email
   🪝 Processing Auth Hook request
   📨 Sending to: your@email.com
   ✅ Email sent successfully!
   ```

### Verify Email Received

1. Check your inbox for the confirmation email
2. Subject: "🦸 Verify Your Email - Rejection Hero"
3. From: "Rejection Hero <onboarding@resend.dev>"
4. Click the verification link

---

## Troubleshooting

### ❌ Error: "AuthApiError: Unexpected status code returned from hook: 502"

**Cause**: Edge function is not responding or has errors

**Fix**:
1. Check Edge Function logs for errors
2. Verify `RESEND_API_KEY` is set correctly
3. Make sure the edge function is deployed and running

### ❌ Error: "Email service not configured"

**Cause**: Missing `RESEND_API_KEY` environment variable

**Fix**:
1. Go to Edge Functions → send-confirmation → Settings
2. Add `RESEND_API_KEY` environment variable
3. Redeploy the function

### ❌ Error: "Failed to send email"

**Cause**: Resend API error

**Fix**:
1. Check Resend API key is valid
2. Check Resend account is active
3. Verify email domain is allowed (use `onboarding@resend.dev` for testing)

### ❌ No email received

**Possible causes**:
1. Check spam folder
2. Resend free tier limits (100 emails/day, test domains only)
3. For production: Add and verify your own domain in Resend

---

## What Happens Behind the Scenes

1. User signs up in your app → `supabase.auth.signUp()`
2. Supabase creates user account
3. Supabase triggers Auth Hook → calls your edge function
4. Edge function receives webhook with:
   - User email
   - User metadata (full_name)
   - Token hash for confirmation URL
5. Edge function calls Resend API to send email
6. User receives beautiful HTML email
7. User clicks verification link
8. User account is confirmed ✅

---

## Production Considerations

### Use Your Own Email Domain

For production, you should:

1. **Add your domain to Resend**:
   - Go to Resend Dashboard → Domains
   - Add your domain (e.g., `yourdomain.com`)
   - Add DNS records as instructed
   - Verify domain

2. **Update Edge Function**:
   - Change `from` address from `onboarding@resend.dev` to `no-reply@yourdomain.com`

3. **Benefits**:
   - ✅ Better deliverability
   - ✅ Professional sender address
   - ✅ Higher sending limits
   - ✅ Custom branding

### Monitor Logs

Regularly check:
- Edge Function logs (Supabase Dashboard → Edge Functions → Logs)
- Resend delivery logs (Resend Dashboard → Emails)

---

## Summary

✅ Edge function handles all email sending logic
✅ Auth Hook automatically triggers on signup
✅ Resend sends professional HTML emails
✅ Users receive beautiful verification emails
✅ No manual backend needed - fully serverless!

---

## Need Help?

If you're still having issues:

1. Check Edge Function logs
2. Check Resend dashboard for email status
3. Verify all environment variables are set
4. Test the edge function directly with curl:

```bash
curl -X POST https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "confirmation",
    "email": "test@example.com",
    "user": {
      "id": "test-id",
      "email": "test@example.com",
      "user_metadata": {
        "full_name": "Test User"
      }
    },
    "token_hash": "test-token-123",
    "redirect_to": ""
  }'
```
