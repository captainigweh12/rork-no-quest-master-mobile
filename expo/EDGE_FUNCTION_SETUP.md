# 📧 Supabase Edge Function Email Setup

## ✅ Perfect! Your edge function is already deployed at:
`https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation`

Now let's configure it to work with Supabase Auth.

---

## 🔧 Step 1: Add RESEND_API_KEY to Supabase

Your edge function needs the Resend API key to send emails.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **hotbmbscjxgayivmyenb**
3. Navigate to **Settings** → **Edge Functions**
4. Click **"Add Secret"** or **"Manage Secrets"**
5. Add a new secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5`
6. Click **Save**

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref hotbmbscjxgayivmyenb

# Set the secret
supabase secrets set RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
```

---

## 🪝 Step 2: Configure Supabase Auth Hook

Now we'll tell Supabase Auth to call your edge function when a user signs up.

### In Supabase Dashboard:

1. Go to **Authentication** → **Hooks** (in the left sidebar)
2. Find **"Send email"** hook
3. Click **Enable Hook**
4. Configure:
   - **Hook name:** Send email
   - **Endpoint:** `https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation`
   - **HTTP Headers:** (leave default)
   - **Secret:** (copy from your previous hook or use the one below)
   - **Events:** Check ✅ **"Send email - confirmation"**

**Your webhook secret:** `v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6`

5. Click **Save**

---

## 🔄 Step 3: Update Edge Function to Handle Auth Hook Format

The Auth Hook sends data in a specific format. Let's update the edge function to handle it:

### Expected Auth Hook Payload:

```json
{
  "type": "confirmation",
  "email": "user@example.com",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe"
    }
  },
  "token_hash": "...",
  "redirect_to": "..."
}
```

### Updated Edge Function Code:

Your edge function is already good, but let's make sure it handles both:
- Direct calls (for testing)
- Auth Hook calls (automatic)

---

## 🧪 Step 4: Test the Setup

### Test 1: Direct Test (Manual)

You can test the edge function directly:

```bash
curl -X POST https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "your-email@example.com",
    "full_name": "Test User",
    "confirmation_url": "https://app.example.com/verify?token=test123"
  }'
```

### Test 2: Sign Up Test (Automatic)

1. In your Rejection Hero app, try signing up with a new email
2. Check your email inbox
3. You should receive a beautiful confirmation email with the Rejection Hero branding

---

## 🐛 Troubleshooting

### Issue: "Email service not configured"

**Solution:** The RESEND_API_KEY secret is not set in Supabase.
- Go back to Step 1 and add the secret
- Restart the edge function (Supabase does this automatically)

### Issue: "Failed to send email" or 400/500 errors

**Check Resend Dashboard:**
1. Go to https://resend.com/emails
2. Look for failed emails
3. Check error messages

**Common issues:**
- `onboarding@resend.dev` can only send to YOUR verified email
- To send to any email, you need to add a custom domain in Resend
- Rate limits (free tier: 100 emails/day)

### Issue: No email received

**Check:**
1. Spam folder
2. Supabase Auth settings: **Authentication** → **Settings** → **Email**
3. Make sure "Enable email confirmations" is ON

### Issue: Auth Hook returns 502

**This means:**
- The edge function crashed or timed out
- Check edge function logs in Supabase Dashboard → **Edge Functions** → **send-confirmation** → **Logs**

---

## 📊 Monitoring

### View Edge Function Logs:

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions**
3. Click on **send-confirmation**
4. Click **Logs** tab

You should see:
```
🚀 Send Confirmation Email Function Started
   Resend API Key exists: true
📧 Incoming request to send confirmation email
📨 Sending to: user@example.com
👤 Name: John Doe
🔗 Confirmation URL provided: true
✅ Email sent successfully!
```

---

## ✅ Success Checklist

- [ ] RESEND_API_KEY added to Supabase secrets
- [ ] Auth Hook configured in Supabase Dashboard
- [ ] Auth Hook endpoint points to your edge function
- [ ] "Send email - confirmation" event is checked
- [ ] Direct test returns 200 OK
- [ ] Sign up test sends email
- [ ] Email received in inbox
- [ ] Confirmation link works

---

## 🎉 You're Done!

Now when users sign up:
1. Supabase Auth creates the user
2. Automatically calls your edge function
3. Edge function sends a beautiful email via Resend
4. User clicks the link and gets verified
5. User can sign in! 🚀

---

## 📝 Notes

- The edge function uses `onboarding@resend.dev` which can only send to YOUR email
- To send to ANY email, you need to:
  1. Add a custom domain in Resend Dashboard
  2. Update the `from` field in the edge function
- Free tier limits: 100 emails/day, 3,000/month

---

## 🔐 Security

- ✅ RESEND_API_KEY is stored in Supabase secrets (secure)
- ✅ Not exposed in your Expo app
- ✅ Edge function runs on Supabase's infrastructure
- ✅ Auth hook is secured with webhook secret

All good! 🛡️
