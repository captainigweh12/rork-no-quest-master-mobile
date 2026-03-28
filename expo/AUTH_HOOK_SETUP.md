# ⚠️ Supabase Auth Hook Issue - 502 Error

## Problem

You're getting a **502 error** because:
1. The Supabase Auth Hook is trying to call your E2B backend at `/api/auth/hook`
2. E2B URLs are **not publicly accessible** from external services
3. Supabase can't reach the webhook endpoint, causing a 502 Bad Gateway error

## Solutions

### ✅ RECOMMENDED: Use Supabase Built-in Email Templates (No Hook)

Supabase has a built-in email system that works perfectly without any backend webhook.

#### Step 1: Remove the Auth Hook

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Webhooks**
3. Find the "Send Email Hook" you created
4. Click **Delete** to remove it

#### Step 2: Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. You'll see templates for:
   - **Confirm signup** ✉️
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

#### Step 3: Customize the Signup Email Template

Click on **"Confirm signup"** and replace with this:

```html
<h2>Welcome to Rejection Hero! 🦸</h2>

<p>Hi {{ .Name }},</p>

<p>Thanks for joining Rejection Hero! Click the button below to verify your email and start your journey:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #FF6B2C 0%, #FF8F5C 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">✅ Verify My Email</a></p>

<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>
<a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>Ready to build confidence through rejection? Let's go! 💪</p>

<hr>
<p style="color: #999; font-size: 12px;">© {{ .CurrentYear }} Rejection Hero<br>
Build confidence, one rejection at a time.</p>
```

**Subject Line:**
```
🦸 Verify Your Email - Rejection Hero
```

#### Step 4: Configure Email Settings

1. Go to **Authentication** → **Settings** (in sidebar)
2. Scroll to **Email Settings**
3. Configure:
   - **Enable Email Confirmations**: ✅ ON
   - **Confirm email**: ✅ ON
   - **Secure email change**: ✅ ON

4. **IMPORTANT:** Under **SMTP Settings** (optional):
   - If you want to use **Resend** for better deliverability:
     - **Host:** `smtp.resend.com`
     - **Port:** `587`
     - **Username:** `resend`
     - **Password:** `re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5`
     - **Sender email:** `onboarding@resend.dev`
     - **Sender name:** `Rejection Hero`
   - Otherwise, leave blank to use Supabase's default email service

#### Step 5: Test Sign Up

Now try signing up again - you should:
1. ✅ Not get a 502 error
2. ✅ Receive the confirmation email from Supabase
3. ✅ Be able to verify and sign in

---

### 🔧 ALTERNATIVE: Use Supabase Edge Functions (Advanced)

If you really want custom email logic via webhook, you need to deploy a **Supabase Edge Function** instead of using your E2B backend.

**This is more complex and not necessary for basic email verification.**

Let me know if you want instructions for this approach.

---

## What About Resend?

You have two options:

### Option 1: Use Resend via Supabase SMTP (Recommended)
Configure Supabase to send emails through Resend's SMTP (see Step 4 above)

### Option 2: Keep Webhook Secret for Future Use
Your webhook secret: `v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6`

Save this in case you deploy your backend to a public URL in the future (not E2B).

---

## Summary

**To fix the 502 error:**

1. ❌ **Delete** the Supabase Auth Hook
2. ✅ **Use** Supabase's built-in email templates
3. 📧 **Optionally** configure Resend SMTP in Supabase for better emails
4. 🧪 **Test** sign up again

This is the **simplest and most reliable solution** for your use case.
