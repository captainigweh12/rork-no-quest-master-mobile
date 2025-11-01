# Google Livestream API Integration

## Overview
I've added Google Livestream API integration to your app. Users can now:
1. Connect via OAuth to authorize YouTube access
2. Create livestreams directly from the app
3. Get stream keys and URLs for OBS/streaming software

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" for the application type
   - Add authorized redirect URIs:
     - For development: `exp://[YOUR_DEV_IP]:8081`
     - For production: `noquest://auth/callback`
   - Click "Create"
   - Copy the Client ID and Client Secret

### 2. Update the App Configuration

Open `contexts/YouTubeContext.tsx` and update lines 34-35 with your credentials:

```typescript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
```

### 3. Install Required Package

The app uses `expo-auth-session` for OAuth. Install it if not already installed:

```bash
bun expo install expo-auth-session expo-web-browser
```

### 4. Update app.json (if needed)

Ensure your `app.json` has the correct scheme for deep linking:

```json
{
  "expo": {
    "scheme": "noquest"
  }
}
```

## Features Implemented

### 1. OAuth Connection
- Users can click "Connect with Google" to authorize the app
- The app requests YouTube livestreaming permissions
- Access tokens are securely stored locally

### 2. Create Livestream
- Users with OAuth connection can click "Create Livestream"
- Fill in title and description
- App creates broadcast and stream via YouTube API
- Returns stream URL, stream key, and watch URL

### 3. Manual Connection
- Users can still manually paste their channel URL
- Opens YouTube Studio for manual streaming setup

## Usage Flow

1. **User goes to Profile page**
2. **Scrolls to "YouTube Live" section**
3. **Clicks "Connect with Google"** (OAuth flow)
4. **Authorizes the app** in browser
5. **Returns to app** (connected state)
6. **Clicks "Create Livestream"**
7. **Fills in stream details**
8. **Submits** - stream is created
9. **Gets stream URL and key** to use in OBS

## API Endpoints Used

### Create Broadcast
```
POST https://www.googleapis.com/youtube/v3/liveBroadcasts
```

### Create Stream
```
POST https://www.googleapis.com/youtube/v3/liveStreams
```

### Bind Stream to Broadcast
```
POST https://www.googleapis.com/youtube/v3/liveBroadcasts/bind
```

## Security Notes

- ⚠️ Client Secret should NOT be hardcoded in production apps
- Consider using a backend proxy for OAuth flow in production
- Store tokens securely (currently using AsyncStorage)
- Implement token refresh logic for expired tokens

## Testing

1. Connect with a YouTube account that has streaming enabled
2. Create a test livestream
3. Copy the stream key and URL
4. Use OBS or similar software to test streaming
5. Check YouTube Studio to verify stream appears

## Troubleshooting

### OAuth Not Working
- Verify redirect URI matches exactly in Google Console
- Check that YouTube Data API v3 is enabled
- Ensure your Google account has streaming permissions

### Stream Creation Fails
- Check that access token is valid (not expired)
- Verify account has YouTube streaming enabled
- Check API quota limits in Google Console

### Can't Find Stream in YouTube Studio
- Wait a few seconds for propagation
- Refresh YouTube Studio page
- Check that broadcast was bound to stream successfully

## Next Steps

Consider implementing:
- Token refresh logic for expired tokens
- Backend proxy for OAuth (more secure)
- Stream status monitoring
- Automatic stream start/stop
- Stream analytics integration
