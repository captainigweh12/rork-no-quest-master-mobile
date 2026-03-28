# 🚀 Quick Start: Enable Email Confirmation

**Goal:** Get email confirmations working in 5 minutes.

---

## ✅ What You Have

- ✅ Edge function deployed at: `https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation`
- ✅ Resend API Key: `re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5`
- ✅ Supabase project: `hotbmbscjxgayivmyenb`

---

## 📋 3 Simple Steps

### Step 1: Add RESEND_API_KEY to Supabase (2 min)

1. Open: https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb/settings/functions
2. Click **"Manage secrets"** button
3. Click **"Add new secret"**
4. Fill in:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5`
5. Click **"Save"**

### Step 2: Enable Auth Hook (2 min)

1. Open: https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb/auth/hooks
2. Find **"Send email"** section
3. Click **"Enable Hook"**
4. Configure:
   - **URI:** `https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation`
   - **Method:** POST
   - **HTTP Headers:** (leave empty)
   - **Secrets:** `v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6`
5. Under **"Hook events"**, check: ✅ **"Send email - confirmation"**
6. Click **"Create hook"**

### Step 3: Test It (1 min)

1. In your Rejection Hero app, sign up with a test email
2. Check your email inbox
3. You should receive a beautiful confirmation email! 🎉

---

## 🧪 Test Before Signup

Want to test the edge function first? Use this:

```bash
curl -X POST https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M" \
  -d '{
    "email": "your-email@example.com",
    "full_name": "Test User",
    "confirmation_url": "https://example.com/verify"
  }'
```

---

## ⚠️ Important Notes

### Email Limitations

**With `onboarding@resend.dev`:**
- ✅ Can send to: YOUR email only (the one registered with Resend)
- ❌ Cannot send to: Random test emails

**To send to ANY email:**
1. Add a custom domain in Resend Dashboard
2. Update edge function: change `from: 'Rejection Hero <onboarding@resend.dev>'` to `from: 'Rejection Hero <noreply@yourdomain.com>'`

### Rate Limits (Free Tier)

- 100 emails per day
- 3,000 emails per month

---

## 🐛 Troubleshooting

### "Email service not configured"
→ RESEND_API_KEY not set. Go back to Step 1.

### "Failed to send email"
→ Check Resend dashboard: https://resend.com/emails
→ Look for error messages

### No email received
→ Check spam folder
→ Make sure you're using YOUR email (the one registered with Resend)

### 502 Error
→ Edge function crashed. Check logs: https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb/functions/send-confirmation/logs

---

## 📊 Check Logs

**Edge Function Logs:**
https://supabase.com/dashboard/project/hotbmbscjxgayivmyenb/functions/send-confirmation/logs

**You should see:**
```
🚀 Send Confirmation Email Function Started
   Resend API Key exists: true
📧 Incoming request to send confirmation email
📦 Request body type: confirmation
🪝 Processing Auth Hook request
📨 Sending to: user@example.com
✅ Email sent successfully!
```

---

## ✅ Done!

Your email system is now live! When users sign up, they'll automatically receive a beautiful confirmation email. 🚀
