# 🪝 Supabase Auth Hook + Resend Email Setup

## ✅ What's Been Done

Your backend now has a **Supabase Auth Hook endpoint** that automatically sends beautiful emails via Resend when users sign up or reset their password.

### Backend Changes

1. **Auth Hook Endpoint** (`/api/auth/hook`)
   - Handles `user.created` events (signup)
   - Handles `user.email_verification` events (resend)
   - Handles `password_recovery` events (forgot password)

2. **Email Templates**
   - Beautiful HTML email for verification
   - Password reset email template
   - Branded with Rejection Hero theme

---

## 🚀 Setup Steps

### Step 1: Test the Hook (Before Supabase)

1. Open your app and navigate to **Debug Email** screen
2. Enter your real email address
3. Click **"🎉 Test Auth Hook (Supabase)"**
4. Check your email inbox (and spam folder!)

**Expected Result:**
- Backend logs show: `🪝 [AUTH-HOOK] Supabase auth hook triggered`
- Email arrives with verification button
- Debug screen shows: `✅ 🎉 AUTH HOOK WORKS!`

If this works, you're ready for Supabase configuration!

---

### Step 2: Configure Supabase Auth Hook

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb
   ```

2. **Navigate to Authentication → Hooks:**
   - Click **Authentication** in left sidebar
   - Select **Hooks** tab

3. **Add the Hook:**
   - Find **"Send email"** section
   - Click **"Enable Hook"**
   - Set **Hook URL:**
     ```
     https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app/api/auth/hook
     ```
   - Select these events:
     - ✅ **User created** (for signup emails)
     - ✅ **Email confirmation** (for resend verification)
     - ✅ **Password recovery** (for forgot password)

4. **Save** the configuration

---

### Step 3: Configure Redirect URLs

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add these Site URLs and Redirect URLs:
   ```
   exp://192.168.1.*:8081
   exp://localhost:8081
   myapp://
   rejectionhero://
   https://yourdomain.com
   ```

3. Set **Site URL** to your production domain (when deploying)

---

### Step 4: Test Real Signup

1. **In your app, go to the Auth screen**
2. **Sign up with a new email**
3. **Watch for:**
   - Backend logs: `🪝 [AUTH-HOOK] Supabase auth hook triggered`
   - Backend logs: `📧 Sending verification email to: your@email.com`
   - Backend logs: `✅ Verification email sent!`
4. **Check your email** for the verification email
5. **Click the verification link**
6. **Sign in** with your verified account

---

## 🔍 Troubleshooting

### Problem: Hook not triggering

**Check:**
1. Hook URL is correct in Supabase Dashboard
2. Backend is running and accessible
3. Events are selected (user.created, etc.)

**Test:**
```bash
curl -X POST https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app/api/auth/hook \
  -H "Content-Type: application/json" \
  -d '{"type":"user.created","user":{"email":"test@example.com","confirmation_url":"https://example.com/confirm"}}'
```

### Problem: Email not sending

**Check backend logs for:**
- `❌ RESEND_API_KEY not configured` → Add `RESEND_API_KEY` to backend `.env`
- `❌ Resend error:` → Check Resend dashboard for rate limits or domain issues

**Verify Resend setup:**
1. Go to https://resend.com/emails
2. Check for failed emails
3. Verify you're using `onboarding@resend.dev` (works for any email)
4. Or verify your own domain

### Problem: Wrong confirmation URL

The confirmation URL in the email comes from **Supabase**. Configure it:

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Edit **"Confirm signup"** template
3. Make sure the URL includes your redirect URLs

---

## 📧 Email Configuration

### Using Resend Test Domain

Currently set to: `onboarding@resend.dev`

**Limitations:**
- ✅ Can send to ANY email address
- ❌ Might land in spam
- ❌ Shows "via resend.dev" in email client

### Using Your Own Domain

To use `onboarding@rejectionhero.com`:

1. **Add domain in Resend:**
   - Go to https://resend.com/domains
   - Click **"Add Domain"**
   - Enter: `rejectionhero.com`

2. **Add DNS records** (provided by Resend):
   ```
   TXT  _resend  [verification-code]
   ```

3. **Wait for verification** (usually 5-10 minutes)

4. **Update backend code** in `backend/hono.ts`:
   ```typescript
   from: 'Rejection Hero <onboarding@rejectionhero.com>',
   ```

---

## 🎨 Customizing Email Templates

Email templates are in `backend/hono.ts` in these functions:
- `handleEmailVerification()` - Signup/verification emails
- `handlePasswordRecovery()` - Password reset emails

To customize:
1. Edit the HTML in the template
2. Test with **Debug Email** → **Test Auth Hook**
3. Check your inbox to see changes

---

## 🔐 Security Best Practices

### Current Setup
- ✅ API key is in backend (secure)
- ✅ Hook endpoint is public (expected for webhooks)
- ⚠️ No signature verification (optional)

### Add Signature Verification (Recommended)

1. **Generate webhook secret** in Supabase:
   - Authentication → Hooks → Show secret

2. **Add to backend `.env`:**
   ```bash
   SUPABASE_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Uncomment verification code** in `backend/hono.ts`:
   ```typescript
   if (webhookSecret && signature) {
     // Implement signature verification
     const isValid = verifySignature(payload, signature, webhookSecret);
     if (!isValid) {
       return c.json({ error: 'Invalid signature' }, 401);
     }
   }
   ```

---

## 📊 Monitoring

### Backend Logs

Watch for these logs when testing:
```
🪝 [AUTH-HOOK] Supabase auth hook triggered
   Event type: user.created
   User email: test@example.com
📧 Sending verification email to: test@example.com
   🔗 Confirmation URL: https://...
✅ Verification email sent!
   Message ID: abc123...
```

### Resend Dashboard

Monitor emails at: https://resend.com/emails

- See delivery status
- Check bounce/spam reports
- View email content

### Supabase Dashboard

Check auth events at:
```
https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb/auth/users
```

---

## ✨ What Happens Now

### When a user signs up:

1. **User enters email/password** in your app
2. **Supabase creates account** (unverified)
3. **Supabase triggers webhook** → Your backend `/api/auth/hook`
4. **Your backend sends email** via Resend
5. **User receives beautiful email** with verification link
6. **User clicks link** → Redirects to app
7. **Supabase verifies email** → User can sign in

### Benefits:

- ✅ **Custom branding** - Emails match your app
- ✅ **Full control** - Edit templates anytime
- ✅ **Better deliverability** - Professional email service
- ✅ **Analytics** - Track opens/clicks in Resend
- ✅ **No code changes** for auth flow

---

## 🎯 Next Steps

1. ✅ **Test the hook** with Debug Email screen
2. ✅ **Configure Supabase** with hook URL
3. ✅ **Test real signup** with new account
4. 🔄 **Add custom domain** in Resend (optional)
5. 🔒 **Add webhook signature** verification (recommended)
6. 🎨 **Customize email templates** to match brand

---

## 🆘 Need Help?

**Check logs in:**
- Backend console (E2B)
- App Debug Email screen
- Supabase Dashboard → Logs
- Resend Dashboard → Emails

**Common URLs:**
- Backend: https://8081-ieyxozyisrhek46ra3fcz-6532622b.e2b.app
- Supabase: https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb
- Resend: https://resend.com

**Test endpoints:**
- Health: `GET /api/health`
- Test Email: `GET /api/test-email?to=your@email.com`
- Auth Hook: `POST /api/auth/hook`
