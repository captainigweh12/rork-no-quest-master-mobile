# Deploy Email Hook - Fix Authorization Error

## The Problem
You're getting "Hook requires authorization token" because the edge function needs to be deployed with JWT verification disabled.

## Solution - Deploy the Function

Run these commands in your terminal:

### 1. Set the secrets (if not already set)
```bash
supabase secrets set RESEND_API_KEY="YOUR_RESEND_API_KEY"
supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6"
```

### 2. Deploy the function
```bash
supabase functions deploy send-confirmation
```

This will deploy the function with the `config.toml` file that disables JWT verification.

### 3. Verify it's working
Test that JWT is disabled:
```bash
curl -i https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation
```

You should see:
- Status: `200 OK` (not 401)
- Body: `{"status":"ok","message":"Send confirmation email function is running",...}`

### 4. Verify the hook is configured in Supabase Dashboard

Go to: **Dashboard → Auth → Email Templates → Send email hook**

Make sure it's set to:
```
https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation
```

And the secret is set to:
```
v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6
```

## What Changed

1. **Created proper Deno edge function** at `supabase/functions/send-confirmation/index.ts`
   - Uses `npm:standardwebhooks` (Deno-compatible import)
   - Verifies webhook signature from Supabase
   - Sends beautiful HTML email via Resend

2. **Created config.toml** at `supabase/functions/config.toml`
   - Sets `verify_jwt = false` for the send-confirmation function
   - This tells Supabase gateway to NOT require JWT for this endpoint

3. **The function now**:
   - ✅ Accepts webhook calls from Supabase (no JWT needed)
   - ✅ Verifies the webhook signature for security
   - ✅ Sends custom branded emails via Resend
   - ✅ Handles errors gracefully

## Troubleshooting

If you still get errors after deploying:

1. **"Hook requires authorization token"** → The deployment didn't pick up config.toml
   - Make sure `supabase/functions/config.toml` exists
   - Run `supabase functions deploy send-confirmation` again
   
2. **"Invalid signature"** → The secret doesn't match
   - Check that the secret in Supabase dashboard matches what you set with `supabase secrets set`
   
3. **"Email service not configured"** → RESEND_API_KEY not set
   - Run: `supabase secrets set RESEND_API_KEY="your_key"`
   - Deploy again

## Test the Full Flow

After deploying, test signup:

1. Open your app
2. Try to sign up with a new email
3. Check the Supabase Functions logs:
   ```bash
   supabase functions logs send-confirmation
   ```
4. You should see:
   - "✅ Webhook signature verified"
   - "📧 Sending email to: [email]"
   - "✅ Email sent successfully"

5. Check your email inbox for the confirmation email
