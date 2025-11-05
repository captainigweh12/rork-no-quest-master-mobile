# YouTube Live Streaming - Deployment Guide

## Quick Start Deployment

### Step 1: Deploy Database Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Run SQL Script**
   - Navigate to SQL Editor
   - Copy contents of `CREATE_YOUTUBE_OAUTH_TABLE.sql`
   - Paste and run the script
   - Verify success messages

3. **Verify Tables**
   ```sql
   -- Check youtube_oauth_tokens table exists
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'youtube_oauth_tokens';
   
   -- Check live_streams has YouTube columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'live_streams' 
   AND column_name LIKE 'youtube%';
   ```

### Step 2: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account

2. **Create or Select Project**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Name it (e.g., "NoQuest YouTube Integration")
   - Click "Create"

3. **Enable YouTube Data API v3**
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it
   - Click "Enable"

4. **Create OAuth 2.0 Client ID**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - If prompted, configure OAuth consent screen:
     - User Type: External
     - App name: NoQuest
     - User support email: your email
     - Developer contact: your email
     - Add scopes:
       - `https://www.googleapis.com/auth/youtube`
       - `https://www.googleapis.com/auth/youtube.force-ssl`
       - `https://www.googleapis.com/auth/youtube.readonly`
   - Application type: Web application
   - Name: NoQuest Backend
   - Authorized redirect URIs:
     - `noquest://oauth-callback` (for mobile)
     - `http://localhost:8081` (for development)
     - Your production URL if applicable
   - Click "Create"
   - **Save the Client ID and Client Secret**

5. **Create API Key**
   - Click "Create Credentials" > "API Key"
   - Click "Restrict Key"
   - Name: NoQuest YouTube API
   - API restrictions: Select "YouTube Data API v3"
   - Click "Save"
   - **Save the API Key**

### Step 3: Configure Backend Environment

1. **Update env.development**
   ```env
   # Add these to your env.development file
   GOOGLE_CLIENT_ID=your-client-id-from-step-2
   GOOGLE_CLIENT_SECRET=your-client-secret-from-step-2
   YOUTUBE_API_KEY=your-api-key-from-step-2
   
   # Make sure these are also set
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   ```

2. **For Render Deployment**
   - Go to your Render dashboard
   - Select your backend service
   - Go to "Environment"
   - Add environment variables:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `YOUTUBE_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_KEY`
   - Click "Save Changes"
   - Service will automatically redeploy

### Step 4: Test Backend

1. **Start Backend Locally**
   ```bash
   npm run backend
   ```

2. **Test Configuration**
   ```bash
   # In a new terminal or use a tool like Postman
   curl http://localhost:8081/trpc/youtube.checkConfig
   ```
   
   Expected response:
   ```json
   {
     "result": {
       "data": {
         "configured": true,
         "hasClientId": true,
         "hasClientSecret": true,
         "hasApiKey": true,
         "hasSupabase": true
       }
     }
   }
   ```

### Step 5: Deploy Backend

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add YouTube Live Streaming backend support"
   git push origin main
   ```

2. **Render Auto-Deploy**
   - Render will automatically detect the push
   - Wait for deployment to complete
   - Check logs for any errors

3. **Verify Production**
   ```bash
   curl https://your-backend.onrender.com/trpc/youtube.checkConfig
   ```

### Step 6: Update Frontend (Coming in Phase 2)

Frontend implementation will be completed in Phase 2. For now, the backend is ready to accept requests.

---

## Testing the OAuth Flow

### Manual Test (Using Browser)

1. **Get Authorization URL**
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=noquest://oauth-callback&
     response_type=code&
     scope=https://www.googleapis.com/auth/youtube%20https://www.googleapis.com/auth/youtube.force-ssl%20https://www.googleapis.com/auth/youtube.readonly&
     access_type=offline&
     prompt=consent
   ```

2. **Authorize in Browser**
   - Open the URL in a browser
   - Sign in with Google
   - Grant permissions
   - You'll be redirected to `noquest://oauth-callback?code=...`
   - Copy the `code` parameter

3. **Exchange Code for Tokens**
   ```bash
   curl -X POST http://localhost:8081/trpc/youtube.connectOAuth \
     -H "Content-Type: application/json" \
     -d '{
       "code": "YOUR_CODE_HERE",
       "redirectUri": "noquest://oauth-callback",
       "userId": "YOUR_USER_UUID"
     }'
   ```

4. **Expected Response**
   ```json
   {
     "result": {
       "data": {
         "success": true,
         "channelId": "UC...",
         "channelTitle": "Your Channel Name",
         "channelUrl": "https://www.youtube.com/channel/UC..."
       }
     }
   }
   ```

---

## Troubleshooting

### Error: "Failed to exchange code for tokens"

**Cause**: Invalid OAuth code or redirect URI mismatch

**Solution**:
1. Make sure the redirect URI in your request matches exactly what's configured in Google Cloud Console
2. OAuth codes expire quickly (usually within 10 minutes), get a fresh code
3. Verify your Client ID and Client Secret are correct

### Error: "Not authenticated with YouTube"

**Cause**: No valid tokens found for user

**Solution**:
1. Complete the OAuth flow first using `connectOAuth`
2. Check if tokens exist in database:
   ```sql
   SELECT * FROM youtube_oauth_tokens WHERE user_id = 'your-user-uuid';
   ```

### Error: "Failed to create broadcast"

**Cause**: YouTube API quota exceeded or insufficient permissions

**Solution**:
1. Check your quota in Google Cloud Console
2. Verify all required scopes are granted
3. Make sure the channel is eligible for live streaming (may require verification)

### Error: "Token refresh failed"

**Cause**: Refresh token is invalid or expired

**Solution**:
1. User needs to re-authenticate
2. Call `disconnect` then `connectOAuth` again
3. Make sure `access_type=offline` is in the OAuth URL to get refresh tokens

---

## Security Checklist

- [ ] OAuth credentials are in backend environment variables only
- [ ] Client secret is never exposed to frontend
- [ ] Supabase service key is kept secure
- [ ] RLS policies are enabled on youtube_oauth_tokens table
- [ ] API key is restricted to YouTube Data API v3
- [ ] OAuth consent screen is configured properly
- [ ] Redirect URIs are whitelisted in Google Cloud Console

---

## Monitoring

### Check Token Status
```sql
-- Find tokens expiring soon
SELECT user_id, channel_title, expires_at 
FROM youtube_oauth_tokens 
WHERE expires_at < NOW() + INTERVAL '1 day';

-- Find expired tokens
SELECT user_id, channel_title, expires_at 
FROM youtube_oauth_tokens 
WHERE expires_at < NOW();
```

### Check Active Streams
```sql
-- Find active YouTube streams
SELECT * FROM live_streams 
WHERE stream_platform = 'youtube' 
AND is_live = true;

-- Find recent YouTube streams
SELECT * FROM live_streams 
WHERE stream_platform = 'youtube' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Monitor API Usage

1. Go to Google Cloud Console
2. Navigate to "APIs & Services" > "Dashboard"
3. Click on "YouTube Data API v3"
4. View quota usage and requests

---

## Next Steps

Once deployment is complete:

1. ✅ Backend is ready
2. ⏳ Proceed with Phase 2: Frontend Implementation
3. ⏳ Create UI screens for OAuth flow
4. ⏳ Implement stream setup and controls
5. ⏳ Add analytics dashboard

---

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test OAuth flow manually to isolate issues
4. Check Google Cloud Console for API errors
5. Review Supabase logs for database issues
