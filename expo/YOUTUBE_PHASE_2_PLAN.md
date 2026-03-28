# YouTube Live Streaming - Phase 2 Implementation Plan

## Current Status

✅ **Phase 1 Complete**: Backend infrastructure is ready
⏳ **Phase 2 In Progress**: Frontend implementation needed

---

## Phase 2 Overview

Phase 2 involves refactoring the existing YouTube context and creating new UI screens for a complete YouTube Live streaming experience.

### Current YouTube Context Analysis

**File**: `contexts/YouTubeContext.tsx`

**Issues to Address**:
1. ❌ Hardcoded OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
2. ❌ Direct YouTube API calls from frontend
3. ❌ Tokens stored in AsyncStorage (should be in Supabase via backend)
4. ❌ No integration with backend tRPC router
5. ❌ Manual token refresh not using backend logic

**What Works**:
- ✅ OAuth flow structure
- ✅ Live stream creation logic
- ✅ Channel connection
- ✅ Live/upcoming stream fetching

---

## Phase 2 Tasks

### 2.1 Refactor YouTube Context ⏳

**Goal**: Update context to use backend tRPC calls instead of direct API calls

**Changes Needed**:

1. **Remove Hardcoded Credentials**
   ```typescript
   // REMOVE these lines:
   const GOOGLE_CLIENT_ID = '971632613679-a4smd8ok9p1ue2jvajhcbvt0510cvb60.apps.googleusercontent.com';
   const GOOGLE_CLIENT_SECRET = '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';
   ```

2. **Import tRPC**
   ```typescript
   import { trpc } from '@/lib/trpc';
   import { useAuth } from '@/contexts/AuthContext';
   ```

3. **Update `connectViaOAuth`**
   ```typescript
   const connectViaOAuth = useCallback(async () => {
     try {
       const discovery = {
         authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
         tokenEndpoint: 'https://oauth2.googleapis.com/token',
       };

       const authRequest = new AuthSession.AuthRequest({
         clientId: GOOGLE_CLIENT_ID, // Get from backend config
         scopes: [
           'https://www.googleapis.com/auth/youtube',
           'https://www.googleapis.com/auth/youtube.force-ssl',
           'https://www.googleapis.com/auth/youtube.readonly',
         ],
         redirectUri: REDIRECT_URI,
         responseType: AuthSession.ResponseType.Code,
       });

       const result = await authRequest.promptAsync(discovery);

       if (result.type === 'success' && result.params.code) {
         // Use backend tRPC call instead of direct fetch
         const response = await trpc.youtube.connectOAuth.mutate({
           code: result.params.code,
           redirectUri: REDIRECT_URI,
           userId: user.id,
         });

         if (response.success) {
           // Update local state
           const next: YouTubeLinkState = {
             channelUrl: response.channelUrl,
             channelId: response.channelId,
             liveControlUrl: 'https://studio.youtube.com',
             lastConnectedAt: new Date().toISOString(),
           };
           setState(next);
           await persist(next);
           return { success: true };
         }
       }

       return { success: false };
     } catch (error) {
       console.error('[YouTube] OAuth error', error);
       Alert.alert('Connection Failed', 'Could not connect to Google. Please try again.');
       return { success: false };
     }
   }, [persist, user]);
   ```

4. **Update `createLiveStream`**
   ```typescript
   const createLiveStreamMutation = useMutation({
     mutationFn: async (params: {
       title: string;
       description: string;
       privacyStatus?: 'public' | 'unlisted' | 'private';
       scheduledStartTime?: string;
     }) => {
       if (!user) {
         throw new Error('Not authenticated');
       }

       // Use backend tRPC call
       const result = await trpc.youtube.createLiveStream.mutate({
         userId: user.id,
         title: params.title,
         description: params.description,
         privacyStatus: params.privacyStatus || 'public',
         scheduledStartTime: params.scheduledStartTime,
       });

       return result;
     },
   });
   ```

5. **Add Connection Status Check**
   ```typescript
   const connectionQuery = useQuery({
     queryKey: ['youtube-connection', user?.id],
     queryFn: async () => {
       if (!user) return null;
       return await trpc.youtube.getConnectionStatus.query({ userId: user.id });
     },
     enabled: !!user,
   });
   ```

6. **Update `disconnect`**
   ```typescript
   const disconnect = useCallback(async () => {
     if (!user) return;
     
     try {
       await trpc.youtube.disconnect.mutate({ userId: user.id });
       setState(null);
       await persist(null);
     } catch (error) {
       console.error('[YouTube] Disconnect error', error);
       Alert.alert('Error', 'Failed to disconnect YouTube account');
     }
   }, [persist, user]);
   ```

---

### 2.2 Create YouTube Connection Screen

**File**: `app/youtube-connect.tsx`

**Design**: Dark theme with orange accents, inspired by task selection modal

**Features**:
- OAuth connection button
- Connection status display
- Channel information card
- Disconnect option
- Loading states
- Error handling

**UI Components**:
- Large title at top
- Trophy icon for connected state
- Card-based layout
- Bottom action buttons

**Implementation**:
```typescript
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useYouTube } from '@/contexts/YouTubeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function YouTubeConnectScreen() {
  const router = useRouter();
  const { 
    isConnected, 
    isOAuthConnected, 
    connectViaOAuth, 
    disconnect, 
    isLoading,
    state 
  } = useYouTube();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <Text style={styles.title}>Connect YouTube</Text>
      
      {/* Connection Status */}
      {isConnected ? (
        <View style={styles.connectedCard}>
          <Text style={styles.connectedIcon}>🏆</Text>
          <Text style={styles.connectedTitle}>Connected!</Text>
          <Text style={styles.channelName}>{state?.channelTitle}</Text>
          <Pressable style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.notConnectedCard}>
          <Text style={styles.notConnectedText}>
            Connect your YouTube account to start live streaming
          </Text>
          <Pressable 
            style={styles.connectButton} 
            onPress={connectViaOAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.connectText}>Connect with Google</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

---

### 2.3 Create Stream Setup Screen

**File**: `app/youtube-stream-setup.tsx`

**Design**: Full-screen modal with dark theme

**Features**:
- Stream title input
- Description input
- Privacy settings (Public/Unlisted/Private)
- Scheduled start time picker
- Create stream button
- Loading states

**UI Elements**:
- Dark background with semi-transparent overlay
- Clear typography
- Form inputs with validation
- "Create Stream" button at bottom

---

### 2.4 Create Live Streaming Screen

**File**: `app/youtube-stream.tsx`

**Design**: Inspired by daily tasks screen

**Features**:
- Live indicator with viewer count
- Stream duration timer
- Camera/mic controls (placeholder for now)
- Stream key display
- RTMP URL display
- Share stream button
- End stream button
- Real-time analytics

**UI Elements**:
- Stats badges (viewers, duration, likes)
- Stream info cards
- Control buttons at bottom
- Dark theme with good contrast

---

### 2.5 Create Analytics Screen

**File**: `app/youtube-analytics.tsx`

**Design**: Inspired by stats/progress screen

**Features**:
- Viewer count over time
- Peak concurrent viewers
- Total watch time
- Average view duration
- Engagement metrics (likes, comments)

**UI Elements**:
- Category filters at top
- Improvement cards showing metrics
- Activity calendar/heatmap
- Orange accent color for highlights
- Progress tracking with detailed explanations

---

### 2.6 Create UI Components

#### Stream Setup Modal
**File**: `components/StreamSetupModal.tsx`

Reusable modal for stream setup with:
- Dark background overlay
- Form inputs
- Validation
- Loading states

#### Stream Stats Card
**File**: `components/StreamStatsCard.tsx`

Reusable card for displaying stream statistics:
- Metric value
- Metric label
- Trend indicator
- Icon

#### Stream Control Panel
**File**: `components/StreamControlPanel.tsx`

Reusable control panel with:
- Camera toggle
- Mic toggle
- Screen share toggle
- End stream button
- Share button

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Refactor YouTube context to use backend
2. ⏳ Create YouTube connection screen
3. ⏳ Create stream setup screen
4. ⏳ Basic stream management (start/stop)

### Medium Priority (Enhanced Features)
5. ⏳ Create live streaming screen with controls
6. ⏳ Add real-time viewer stats
7. ⏳ Implement stream sharing

### Low Priority (Nice to Have)
8. ⏳ Create analytics dashboard
9. ⏳ Add charts and graphs
10. ⏳ Export analytics data

---

## Design System

### Colors
```typescript
const colors = {
  background: {
    primary: '#1a1a2e',
    secondary: '#16213e',
    tertiary: '#0f3460',
  },
  accent: '#FF6B35',
  success: '#28A745',
  error: '#DC3545',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.7)',
  },
  card: 'rgba(255,255,255,0.1)',
};
```

### Typography
```typescript
const typography = {
  largeTitle: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 16, fontWeight: '400' },
  body: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
};
```

---

## Testing Plan for Phase 2

### Unit Tests
- [ ] YouTube context refactored correctly
- [ ] tRPC calls work as expected
- [ ] State management functions properly

### Integration Tests
- [ ] OAuth flow completes successfully
- [ ] Stream creation works end-to-end
- [ ] Stream controls function correctly
- [ ] Analytics data displays accurately

### UI Tests
- [ ] All screens render correctly
- [ ] Navigation works smoothly
- [ ] Loading states display properly
- [ ] Error messages are clear

---

## Estimated Time

- **Context Refactoring**: 2-3 hours
- **Connection Screen**: 1-2 hours
- **Stream Setup Screen**: 2-3 hours
- **Live Streaming Screen**: 3-4 hours
- **Analytics Screen**: 2-3 hours
- **UI Components**: 2-3 hours
- **Testing & Bug Fixes**: 2-3 hours

**Total**: 14-21 hours

---

## Next Steps

1. **Immediate**: Refactor YouTube context to use backend tRPC
2. **Then**: Create YouTube connection screen
3. **Then**: Create stream setup screen
4. **Then**: Create live streaming screen
5. **Finally**: Add analytics and polish

---

## Notes

- Phase 1 (Backend) is complete and tested
- YouTube API key is already configured
- Need Google OAuth credentials for full testing
- UI design inspired by provided reference images
- Focus on core functionality first, then enhance
