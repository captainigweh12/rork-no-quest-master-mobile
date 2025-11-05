# YouTube Live Streaming Implementation Plan

## Current State Analysis

### ✅ Already Implemented
1. **YouTube Context** (`contexts/YouTubeContext.tsx`)
   - OAuth 2.0 flow with Google
   - Token exchange and storage (AsyncStorage)
   - Live stream creation via YouTube API
   - Channel connection (manual and OAuth)
   - Live stream status checking

2. **Environment Setup**
   - `EXPO_PUBLIC_YOUTUBE_API_KEY` configured
   - Google OAuth credentials in context
   - expo-auth-session dependency installed

3. **Database Schema**
   - `live_streams` table exists
   - `stream_viewers` and `stream_messages` tables
   - RLS policies configured

4. **Streaming Infrastructure**
   - Daily.co backend router pattern
   - tRPC setup and working
   - Stream UI components (stream-daily.tsx)

### ❌ Missing Components
1. **Backend YouTube Router** - Secure token storage and API calls
2. **Database Schema** - YouTube OAuth tokens table
3. **Enhanced UI Screens** - Following design inspiration
4. **Stream Management Service** - Unified streaming logic
5. **Token Refresh Logic** - Automatic token renewal
6. **RTMP Integration** - Connect YouTube stream with video source

---

## Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Database Schema for YouTube OAuth
**File**: `CREATE_YOUTUBE_OAUTH_TABLE.sql`

```sql
-- Store YouTube OAuth tokens securely
CREATE TABLE IF NOT EXISTS public.youtube_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  channel_id TEXT,
  channel_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.youtube_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own tokens"
  ON public.youtube_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.youtube_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.youtube_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.youtube_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_youtube_oauth_user ON public.youtube_oauth_tokens(user_id);

-- Add YouTube-specific fields to live_streams table
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS youtube_broadcast_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_watch_url TEXT,
ADD COLUMN IF NOT EXISTS stream_platform TEXT DEFAULT 'daily'; -- 'daily', 'youtube', 'videosdk'
```

#### 1.2 Backend YouTube Router
**File**: `backend/trpc/routers/youtube.ts`

**Endpoints**:
- `connectOAuth` - Exchange code for tokens and store in DB
- `refreshToken` - Refresh expired access token
- `disconnect` - Remove OAuth tokens
- `getConnectionStatus` - Check if user has valid tokens
- `createBroadcast` - Create YouTube live broadcast
- `createStream` - Create YouTube live stream
- `bindBroadcastToStream` - Bind broadcast to stream
- `startBroadcast` - Transition broadcast to live
- `endBroadcast` - End live broadcast
- `getBroadcastStatus` - Get current broadcast status
- `getStreamAnalytics` - Get stream statistics

#### 1.3 Register YouTube Router
**File**: `backend/trpc/app-router.ts`

Add YouTube router to app router.

---

### Phase 2: Enhanced Frontend Implementation

#### 2.1 YouTube Connection Screen
**File**: `app/youtube-connect.tsx`

**Features**:
- Dark theme with orange accents (#FF6B35)
- OAuth connection button
- Connection status display
- Channel information card
- Disconnect option
- Design inspired by task selection modal from reference images

**UI Elements**:
- Large title at top
- Trophy/achievement icon for connected state
- Card-based layout
- Bottom action buttons

#### 2.2 YouTube Stream Setup Screen
**File**: `app/youtube-stream-setup.tsx`

**Features**:
- Stream title input
- Description input
- Privacy settings (Public/Unlisted/Private)
- Scheduled start time picker
- Category selection
- Thumbnail upload
- Design inspired by onboarding questions from reference images

**UI Elements**:
- Full-screen modal
- Dark background with semi-transparent overlay
- Clear typography
- "Create Stream" button at bottom

#### 2.3 YouTube Live Streaming Screen
**File**: `app/youtube-stream.tsx`

**Features**:
- Live indicator with viewer count
- Stream duration timer
- Camera/mic controls
- Stream key display
- RTMP URL display
- Share stream button
- End stream button
- Real-time analytics
- Design inspired by daily tasks screen from reference images

**UI Elements**:
- Stats badges (viewers, duration, likes)
- Stream info cards
- Control buttons at bottom
- Dark theme with good contrast

#### 2.4 Stream Analytics Screen
**File**: `app/youtube-analytics.tsx`

**Features**:
- Viewer count over time
- Peak concurrent viewers
- Total watch time
- Average view duration
- Engagement metrics (likes, comments)
- Design inspired by stats/progress screen from reference images

**UI Elements**:
- Category filters at top
- Improvement cards showing metrics
- Activity calendar/heatmap
- Orange accent color for highlights
- Progress tracking with detailed explanations

---

### Phase 3: Services and Utilities

#### 3.1 YouTube Stream Manager
**File**: `services/youtube/streamManager.ts`

**Functions**:
- `createYouTubeLiveStream()` - Full flow to create broadcast + stream
- `startYouTubeStream()` - Start streaming
- `endYouTubeStream()` - End streaming
- `getStreamStatus()` - Get current status
- `getStreamAnalytics()` - Fetch analytics
- `refreshTokenIfNeeded()` - Auto-refresh tokens

#### 3.2 Enhanced YouTube Context
**File**: `contexts/YouTubeContext.tsx` (Update)

**Enhancements**:
- Use backend tRPC calls instead of direct API calls
- Remove hardcoded credentials
- Add token refresh logic
- Add stream management functions
- Add analytics fetching
- Integrate with Supabase for token storage

---

### Phase 4: UI Components

#### 4.1 Stream Setup Modal
**File**: `components/StreamSetupModal.tsx`

Reusable modal for stream setup with:
- Dark background overlay
- Form inputs
- Validation
- Loading states
- Design matching task selection modal

#### 4.2 Stream Stats Card
**File**: `components/StreamStatsCard.tsx`

Reusable card for displaying stream statistics:
- Metric value
- Metric label
- Trend indicator
- Icon
- Design matching progress cards

#### 4.3 Stream Control Panel
**File**: `components/StreamControlPanel.tsx`

Reusable control panel with:
- Camera toggle
- Mic toggle
- Screen share toggle
- End stream button
- Share button
- Design matching control layouts

---

### Phase 5: Integration and Testing

#### 5.1 Environment Variables
**File**: `env.example` and `env.development`

Add:
```
# YouTube OAuth (Backend)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
YOUTUBE_API_KEY=your_api_key

# Frontend (already exists)
EXPO_PUBLIC_YOUTUBE_API_KEY=your_api_key
```

#### 5.2 Navigation Integration
**File**: `app/(tabs)/_layout.tsx`

Add YouTube streaming option to navigation.

#### 5.3 Profile Integration
**File**: `app/profile.tsx` (Update)

Enhance YouTube connection section with:
- OAuth connection button
- Stream creation shortcut
- Recent streams list

---

## Design Guidelines (from Reference Images)

### Color Palette
- **Primary Background**: `#1a1a2e`, `#16213e`, `#0f3460` (dark gradients)
- **Accent Color**: `#FF6B35` (orange)
- **Success**: `#28A745` (green)
- **Error**: `#DC3545` (red)
- **Text Primary**: `#FFFFFF`
- **Text Secondary**: `rgba(255,255,255,0.7)`
- **Card Background**: `rgba(255,255,255,0.1)`

### Typography
- **Large Title**: 28px, bold
- **Title**: 24px, bold
- **Subtitle**: 16px, regular
- **Body**: 14px, regular
- **Caption**: 12px, regular

### Layout Patterns
1. **Modal Overlays**: Semi-transparent dark background
2. **Card Grids**: 2-column layout for options
3. **Stats Display**: Horizontal row of metric cards
4. **Progress Indicators**: Top of screen with day count
5. **Tab Filters**: Horizontal scrollable tabs
6. **Bottom Sheets**: For selections and actions

### Component Patterns
1. **Selection Cards**: Background image + title overlay + radio button
2. **Stat Badges**: Icon + number in rounded container
3. **Progress Cards**: Percentage + description + trend
4. **Action Buttons**: Large, rounded, with shadow
5. **Info Cards**: Rounded corners, subtle background, padding

---

## Implementation Order

### Week 1: Backend Foundation
1. ✅ Create database schema
2. ✅ Implement YouTube router
3. ✅ Register router in app
4. ✅ Test OAuth flow
5. ✅ Test token refresh

### Week 2: Core Frontend
1. ✅ Update YouTube context
2. ✅ Create connection screen
3. ✅ Create stream setup screen
4. ✅ Test OAuth integration

### Week 3: Streaming Features
1. ✅ Create streaming screen
2. ✅ Implement stream controls
3. ✅ Add RTMP integration
4. ✅ Test live streaming

### Week 4: Analytics & Polish
1. ✅ Create analytics screen
2. ✅ Add reusable components
3. ✅ Integrate with navigation
4. ✅ Final testing and bug fixes

---

## Technical Considerations

### Security
- ✅ Store OAuth tokens in Supabase (encrypted at rest)
- ✅ Use RLS policies for token access
- ✅ Never expose client secret in frontend
- ✅ Implement token refresh on backend
- ✅ Use HTTPS for all API calls

### Performance
- ✅ Cache stream status (30s stale time)
- ✅ Debounce analytics requests
- ✅ Lazy load analytics screen
- ✅ Optimize image loading

### User Experience
- ✅ Clear error messages
- ✅ Loading states for all actions
- ✅ Confirmation dialogs for destructive actions
- ✅ Toast notifications for success/error
- ✅ Offline support where possible

### Scalability
- ✅ Use tRPC for type-safe API calls
- ✅ Implement proper error handling
- ✅ Add logging for debugging
- ✅ Use database indexes for queries
- ✅ Implement rate limiting on backend

---

## Testing Checklist

### Backend Tests
- [ ] OAuth token exchange
- [ ] Token refresh
- [ ] Broadcast creation
- [ ] Stream creation
- [ ] Broadcast binding
- [ ] Stream start/end
- [ ] Analytics fetching
- [ ] Error handling

### Frontend Tests
- [ ] OAuth connection flow
- [ ] Token storage
- [ ] Stream setup form
- [ ] Stream controls
- [ ] Analytics display
- [ ] Navigation
- [ ] Error states
- [ ] Loading states

### Integration Tests
- [ ] End-to-end OAuth flow
- [ ] Create and start stream
- [ ] View stream on YouTube
- [ ] End stream
- [ ] View analytics
- [ ] Token refresh during stream
- [ ] Disconnect and reconnect

---

## Success Metrics

1. **Functionality**
   - Users can connect YouTube account via OAuth
   - Users can create live broadcasts
   - Users can start/stop streams
   - Users can view real-time analytics

2. **Performance**
   - OAuth flow completes in < 5 seconds
   - Stream creation in < 3 seconds
   - Analytics load in < 2 seconds

3. **User Experience**
   - Clear visual feedback for all actions
   - Intuitive navigation
   - Consistent design with app theme
   - Helpful error messages

4. **Reliability**
   - 99% success rate for OAuth
   - Automatic token refresh
   - Graceful error handling
   - No data loss on errors

---

## Dependencies

### Already Installed
- ✅ expo-auth-session
- ✅ expo-web-browser
- ✅ @tanstack/react-query
- ✅ @trpc/client
- ✅ @supabase/supabase-js
- ✅ zod

### May Need to Install
- [ ] expo-av (for RTMP streaming)
- [ ] react-native-webrtc (if using WebRTC)
- [ ] @react-native-community/netinfo (for offline detection)

---

## Next Steps

1. Review and approve this plan
2. Create database schema
3. Implement backend YouTube router
4. Update YouTube context
5. Create UI screens
6. Test integration
7. Deploy and monitor
